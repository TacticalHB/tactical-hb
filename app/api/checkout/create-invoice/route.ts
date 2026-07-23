import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { priceCart } from "@/lib/pricing";
import { subtractMoney, money } from "@/lib/currency";
import { createInvoice, toKopiyky, MonobankError, type BasketItem } from "@/lib/monobank";
import { getDeliveryPrice } from "@/lib/nova-poshta";
import { screen } from "@/lib/anti-spam";
import { describeLine } from "@/lib/cart-display";

/* ---------------------------------------------------------------------------
   Create a Monobank invoice and hand back the page to pay on.

   THE AMOUNT IS COMPUTED HERE, NEVER ACCEPTED. The browser says what is in the
   basket — slugs, quantities, options — and this route prices it from the
   catalogue. A caller who edits a price in devtools changes nothing.

   The voucher is re-validated too. It was checked when applied, but the basket
   can change in between, so the discount is only honoured if it still holds
   now, against this total, for this signed-in owner.
--------------------------------------------------------------------------- */

export const runtime = "nodejs";

/** e.g. TCT-7K2QF9 — the reference Monobank echoes back on the webhook. */
function makeReference(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  let out = "";
  for (let i = 0; i < 6; i++) out += alphabet[bytes[i] % alphabet.length];
  return `TCT-${out}`;
}

function siteUrl(): string {
  return (process.env.SITE_URL || "https://tactical-hb.com").replace(/\/$/, "");
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const b = (body ?? {}) as Record<string, unknown>;

  const verdict = screen(request, b);
  if (verdict === "reject") return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  // A "drop" must not silently 200 here — that would leave the customer staring
  // at a pay button that did nothing. Bots get the same refusal as bad input.
  if (verdict === "drop") return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });

  const delivery = (b.delivery ?? {}) as Record<string, unknown>;
  const email = String(delivery.email ?? "").trim();
  const locale = String(b.locale ?? "uk") === "uk" ? "uk" : "en";

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }

  // ---- Price the basket ourselves -----------------------------------------
  const priced = priceCart(b.lines, locale);
  if (priced.lines.length === 0) {
    return NextResponse.json({ ok: false, error: "empty_cart" }, { status: 400 });
  }

  // ---- Re-validate the voucher --------------------------------------------
  let discount = money(0, 0);
  let voucherCode: string | null = null;
  let userId: string | null = null;

  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  userId = user?.id ?? null;

  const requestedCode = String(b.voucherCode ?? "").trim().toUpperCase();
  if (requestedCode) {
    if (!supabase || !user) {
      // Vouchers belong to an account. A guest sending one is either confused
      // or probing; either way it is simply not applied.
      console.warn("[invoice] voucher sent without a session — ignored");
    } else {
      // RLS scopes this to the signed-in owner, so another customer's code is
      // invisible and cannot be spent here.
      const { data: v } = await supabase
        .from("vouchers")
        .select("code, amount_eur, min_order_eur, expires_at, used_at, status")
        .eq("code", requestedCode)
        .maybeSingle();

      const usable =
        v &&
        !v.used_at &&
        v.status === "active" &&
        new Date(String(v.expires_at)).getTime() >= Date.now() &&
        priced.subtotal.eur >= (Number(v.min_order_eur) || 0);

      if (usable) {
        discount = money(Number(v.amount_eur));
        voucherCode = String(v.code);
      } else {
        // Not an error: the basket may have changed since it was applied. The
        // customer pays full price rather than being blocked from paying.
        console.warn("[invoice] voucher no longer valid, ignored:", requestedCode);
      }
    }
  }

  const goods = subtractMoney(priced.subtotal, discount);

  // ---- Shipping, re-quoted here -------------------------------------------
  // The browser sends only the chosen branch. Trusting a cost from the client
  // would let anyone post shipping: 0.
  const shipReq = (b.shipping ?? {}) as Record<string, unknown>;
  const shippingMethod = String(shipReq.method ?? "international") === "nova_poshta"
    ? "nova_poshta"
    : "international";

  let shippingUah = 0;
  let npDeliveryType: "warehouse" | "courier" | null = null;
  let npCityRef: string | null = null;
  let npCityName: string | null = null;
  let npWarehouseRef: string | null = null;
  let npWarehouseName: string | null = null;
  let npAddress: string | null = null;
  let npNotes: string | null = null;

  if (shippingMethod === "nova_poshta") {
    npDeliveryType = shipReq.deliveryType === "courier" ? "courier" : "warehouse";
    npCityRef = String(shipReq.cityRef ?? "").trim().slice(0, 80) || null;
    npCityName = String(shipReq.cityName ?? "").trim().slice(0, 120) || null;
    if (!npCityRef) return NextResponse.json({ ok: false, error: "no_city" }, { status: 400 });

    if (npDeliveryType === "courier") {
      const street = String(shipReq.street ?? "").trim().slice(0, 160);
      const building = String(shipReq.building ?? "").trim().slice(0, 40);
      const apartment = String(shipReq.apartment ?? "").trim().slice(0, 40);
      npNotes = String(shipReq.notes ?? "").trim().slice(0, 400) || null;
      if (!street || !building) {
        return NextResponse.json({ ok: false, error: "no_address" }, { status: 400 });
      }
      // One readable line — this is what the packer and courier read.
      npAddress = [`${street}, ${building}`, apartment ? (locale === "uk" ? `кв. ${apartment}` : `apt. ${apartment}`) : ""]
        .filter(Boolean)
        .join(", ");
    } else {
      npWarehouseRef = String(shipReq.warehouseRef ?? "").trim().slice(0, 80) || null;
      npWarehouseName = String(shipReq.warehouseName ?? "").trim().slice(0, 300) || null;
      if (!npWarehouseRef) return NextResponse.json({ ok: false, error: "no_branch" }, { status: 400 });
    }

    try {
      shippingUah = await getDeliveryPrice({
        cityRecipientRef: npCityRef,
        declaredValueUah: goods.uah,
        // Courier delivers to the door; branch is warehouse-to-warehouse.
        serviceType: npDeliveryType === "courier" ? "WarehouseDoors" : "WarehouseWarehouse",
      });
    } catch (e) {
      // Refuse rather than guess. Charging an unquoted amount, or shipping for
      // free because the lookup failed, are both worse than asking them to retry.
      console.error("[invoice] shipping quote failed:", e);
      return NextResponse.json({ ok: false, error: "shipping_unavailable" }, { status: 502 });
    }
  }

  // Goods in both currencies; shipping is UAH-only and charged on top.
  const total = { eur: goods.eur, uah: goods.uah + shippingUah };
  if (total.uah <= 0) {
    // A voucher covering the whole basket leaves nothing to charge. Monobank
    // cannot create a zero invoice, and this needs a different flow.
    return NextResponse.json({ ok: false, error: "zero_total" }, { status: 400 });
  }

  const amountKop = toKopiyky(total.uah);
  const reference = makeReference();

  // A basket is sent only when it reconciles EXACTLY with the amount charged.
  // Shipping is included as its own line so it still adds up. A voucher cannot
  // be expressed as a basket line, so the discounted case sends no basket at
  // all rather than risk Monobank rejecting a mismatched invoice.
  const basket: BasketItem[] | undefined =
    discount.eur > 0
      ? undefined
      : [
          ...priced.lines.map((l) => ({
            name: l.name,
            qty: l.qty,
            sum: toKopiyky(l.total.uah),
            unit: locale === "uk" ? "шт." : "pcs",
            code: l.slug,
          })),
          ...(shippingUah > 0
            ? [{
                name: locale === "uk" ? "Доставка — Нова Пошта" : "Delivery — Nova Poshta",
                qty: 1,
                sum: toKopiyky(shippingUah),
                unit: locale === "uk" ? "шт." : "pcs",
                code: "shipping-np",
              }]
            : []),
        ];

  // ---- Record the intent BEFORE sending anyone to pay ---------------------
  // If this insert fails we must not create an invoice: a customer could pay
  // for something we have no record of.
  const admin = createAdminClient();
  const { error: insErr } = await admin.from("payments").insert({
    reference,
    status: "pending",
    amount_kop: amountKop,
    user_id: userId,
    email,
    locale,
    // Merchandise only — this is the loyalty basis. Shipping is stored apart
    // so postage never earns XP.
    amount_eur: goods.eur,
    amount_uah: goods.uah,
    discount_eur: discount.eur,
    voucher_code: voucherCode,
    shipping_method: shippingMethod,
    shipping_uah: shippingUah,
    np_delivery_type: npDeliveryType,
    np_city_ref: npCityRef,
    np_city_name: npCityName,
    np_warehouse_ref: npWarehouseRef,
    np_warehouse_name: npWarehouseName,
    np_address: npAddress,
    np_notes: npNotes,
    delivery,
    lines: priced.lines.map((l) => {
      const d = describeLine({ slug: l.slug, qty: l.qty }, locale);
      return {
        slug: l.slug,
        name: l.name,
        qty: l.qty,
        unit_eur: l.unit.eur,
        unit_uah: l.unit.uah,
        colour: d?.colour ?? null,
        material: d?.material ?? null,
        addons: d?.addons ?? null,
        // Frozen here so the confirmation email shows the exact variant the
        // customer bought, not whatever the catalogue default is later.
        image: d?.image ?? null,
      };
    }),
  });

  if (insErr) {
    console.error("[invoice] could not record payment intent:", insErr.code, insErr.message);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }

  // ---- Ask Monobank for a payment page ------------------------------------
  try {
    const invoice = await createInvoice({
      amountKop,
      reference,
      destination: `Tactical HB — ${reference}`,
      webHookUrl: `${siteUrl()}/api/monobank/webhook`,
      // Monobank returns the customer here after payment (confirmed by their
      // support). Locale-prefixed so they come back to the language they
      // checked out in; built from SITE_URL so it follows the environment.
      redirectUrl: `${siteUrl()}/${locale}/checkout/success`,
      basket,
      validitySeconds: 3600,
    });

    await admin.from("payments").update({ invoice_id: invoice.invoiceId }).eq("reference", reference);

    return NextResponse.json({ ok: true, pageUrl: invoice.pageUrl, reference });
  } catch (e) {
    // Close the intent so it can't be fulfilled by a stray webhook later.
    await admin.from("payments").update({ status: "failed" }).eq("reference", reference);

    if (e instanceof MonobankError && e.message.includes("MONOBANK_X_TOKEN")) {
      console.error("[invoice] MONOBANK_X_TOKEN is not configured");
      return NextResponse.json({ ok: false, error: "not_configured" }, { status: 500 });
    }
    console.error("[invoice] Monobank rejected the invoice:", e);
    return NextResponse.json({ ok: false, error: "gateway_error" }, { status: 502 });
  }
}
