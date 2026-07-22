import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { priceCart } from "@/lib/pricing";
import { subtractMoney, money } from "@/lib/currency";
import { createInvoice, toKopiyky, MonobankError, type BasketItem } from "@/lib/monobank";
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

  const total = subtractMoney(priced.subtotal, discount);
  if (total.uah <= 0) {
    // A voucher covering the whole basket leaves nothing to charge. Monobank
    // cannot create a zero invoice, and this needs a different flow.
    return NextResponse.json({ ok: false, error: "zero_total" }, { status: 400 });
  }

  const amountKop = toKopiyky(total.uah);
  const reference = makeReference();

  // A basket is sent only when it reconciles exactly with the amount charged.
  // With a voucher applied it cannot, and a mismatch risks Monobank rejecting
  // the invoice — so the discounted case sends no basket at all.
  const basket: BasketItem[] | undefined =
    discount.eur > 0
      ? undefined
      : priced.lines.map((l) => ({
          name: l.name,
          qty: l.qty,
          sum: toKopiyky(l.total.uah),
          unit: locale === "uk" ? "шт." : "pcs",
          code: l.slug,
        }));

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
    amount_eur: total.eur,
    amount_uah: total.uah,
    discount_eur: discount.eur,
    voucher_code: voucherCode,
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
