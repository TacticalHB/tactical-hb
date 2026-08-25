import { NextRequest, NextResponse } from "next/server";
import { isAppLocale } from "@/i18n/routing";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { priceCart } from "@/lib/pricing";
import { subtractMoney, money, eurToUahFixed } from "@/lib/currency";
import { chooseDiscount, permanentDiscount } from "@/lib/loyalty/ranks";
import { rankForUser } from "@/lib/loyalty/rank-server";
import { createInvoice, toKopiyky, MonobankError, type BasketItem } from "@/lib/monobank";
import { getDeliveryPrice, isPostomat } from "@/lib/nova-poshta";
import { quoteInternational as quoteNovaPost } from "@/lib/novapost";
import { quoteInternational as quoteUkrposhta } from "@/lib/ukrposhta";
import { isShippingCarrier, type ShippingCarrier } from "@/lib/shipping-carriers";
import { parcelFor } from "@/lib/parcel";
import { screen } from "@/lib/anti-spam";
import { describeLine } from "@/lib/cart-display";
import { Resend } from "resend";
import {
  countryAllowedOn,
  methodAllowedOn,
  LOCALE_SHIPPING_MISMATCH,
} from "@/lib/shipping-locale";

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
  /* THE LOCALE SURVIVES INTACT, all four of them. It used to be flattened to
     "uk" or "en", which was harmless while those were the only two and would
     now silently turn every Japanese or Arabic order into an English one —
     wrong emails, wrong storefront rules downstream. Currency and destination
     are derived from it (lib/currency, lib/shipping-locale) and both already
     treat ja and ar the same as en: euro, and shipped outside Ukraine. */
  const rawLocale = String(b.locale ?? "");
  const locale = isAppLocale(rawLocale) ? rawLocale : "uk";

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }

  /* ---- Price the basket ourselves -----------------------------------------

     priced.subtotal ALREADY HAS THE FULL-SETUP SAVING OFF. It is decided in
     priceCart from the catalogue, never read from the request, so a client
     claiming a setup it has not got is simply priced without one — and a
     client that forgot to claim one still gets it.

     ORDER OF OPERATIONS, which matters and is deliberate: the setup saving
     comes off first, then a voucher or a rank perk comes off what is left.
     They are different kinds of thing. The saving is what these three pieces
     cost together — a property of the basket — while a voucher is something
     the customer brings to it. Taking the percentage perk on the already
     reduced figure is also the conservative reading of both, and it is the
     only order in which neither can be applied twice.

     Everything below reads priced.subtotal, so the voucher's minimum-order
     test is against what is actually being charged rather than a figure
     nobody pays. */
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

  /* ---- The rank discount ---------------------------------------------------
     Read here rather than taken from the request: the browser is never asked
     what rank it thinks it is, for the same reason it is never asked what the
     basket costs. Lifetime spend comes out of the orders table under the
     signed-in user's own id, and the rank falls out of that.

     It does NOT stack with a voucher. chooseDiscount picks whichever is worth
     more and leaves the other alone, so a voucher that loses is not spent —
     voucherCode is cleared with it, or the order would record a code it never
     charged for. */
  let discountSource: "voucher" | "rank" | "none" = voucherCode ? "voucher" : "none";
  if (user && supabase) {
    const { rank, lifetime } = await rankForUser(supabase, user.id);
    const perk = permanentDiscount(rank.discountRate, priced.subtotal);

    const chosen = chooseDiscount(voucherCode ? discount : null, perk);
    discount = chosen.amount;
    discountSource = chosen.source;
    if (chosen.source !== "voucher") voucherCode = null;

    /* No new column for the source: the payments row already distinguishes the
       two without one. A discount_eur above zero with voucher_code NULL is a
       rank discount and nothing else can produce that combination. Logged as
       well, so support can see which perk won without reading the arithmetic
       back out of two numbers. */
    if (discountSource !== "none") {
      console.info(
        `[invoice] ${discountSource} discount €${discount.eur} / ₴${discount.uah} (rank ${rank.key}, lifetime €${lifetime.eur} / ₴${lifetime.uah})`
      );
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

  /* ---- THE STOREFRONT DECIDES WHERE THIS CAN GO -------------------------

     /uk ships inside Ukraine, /en ships outside it, and this is where that
     stops being a matter of what the checkout chose to render. The method and
     the destination country are both attacker-controlled — they arrive in the
     request body — so both are checked against the locale before a single
     hryvnia of postage is quoted and long before an invoice exists.

     Refused rather than corrected. Silently rewriting a mismatched order into
     the "right" one would take a customer who asked to ship to Berlin and post
     it to a Kharkiv branch, or the reverse; either is a parcel going somewhere
     nobody asked for. The checkout knows this code and answers it with the
     message that names the other storefront. */
  const intlCountryReq = String(shipReq.countryCode ?? "").trim().toUpperCase().slice(0, 2);
  if (!methodAllowedOn(locale, shippingMethod) || !countryAllowedOn(locale, intlCountryReq)) {
    console.warn(
      `[invoice] refused: locale ${locale} cannot ship method=${shippingMethod} country=${intlCountryReq || "-"}`
    );
    return NextResponse.json({ ok: false, error: LOCALE_SHIPPING_MISMATCH }, { status: 400 });
  }

  let shippingUah = 0;
  let npDeliveryType: "warehouse" | "courier" | null = null;
  let npCityRef: string | null = null;
  let npCityName: string | null = null;
  let npWarehouseRef: string | null = null;
  let npWarehouseName: string | null = null;
  let npAddress: string | null = null;
  let npNotes: string | null = null;
  // Kept apart from npAddress: that line is for humans, these are what Nova
  // Poshta's API can resolve into a street ref when the waybill is created.
  let npStreet: string | null = null;
  let npBuilding: string | null = null;
  let npFlat: string | null = null;
  /** Destination country for international, and whether anyone priced it. */
  let intlCountry: string | null = null;
  let intlQuoted = false;
  /* Who is carrying it. Domestic is always Nova Poshta; international is the
     customer's pick, re-quoted below and corrected if that carrier cannot
     actually price it. Null only on an order that never reached a carrier. */
  let shippingCarrier: ShippingCarrier | null =
    shippingMethod === "nova_poshta" ? "nova_poshta" : null;

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
      npStreet = street;
      npBuilding = building;
      npFlat = apartment || null;
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
        // Re-derived here from the branch name we hold, never trusted from the
        // client, so the surcharge on the amount charged can't be edited away.
        postomat: npDeliveryType !== "courier" && isPostomat({ name: npWarehouseName }),
        // Real chargeable weight, priced server-side from the catalogue.
        weightKg: parcelFor(priced.lines).weightKg,
      });
    } catch (e) {
      // Refuse rather than guess. Charging an unquoted amount, or shipping for
      // free because the lookup failed, are both worse than asking them to retry.
      console.error("[invoice] shipping quote failed:", e);
      return NextResponse.json({ ok: false, error: "shipping_unavailable" }, { status: 502 });
    }
  }

  /* ---- International: quote it, and charge if Nova Post will carry ----------
     Re-quoted here for the same reason the domestic branch is — the browser's
     figure is for display and must never become the amount charged.

     A country Nova Post cannot serve leaves shippingUah at zero and falls
     through to the request flow below, which is what intlQuoted decides. Both
     paths satisfy the one-total rule; only this one can be automated. */
  if (shippingMethod === "international") {
    intlCountry = String(shipReq.countryCode ?? "").trim().toUpperCase().slice(0, 2) || null;
    if (intlCountry) {
      const parcel = parcelFor(priced.lines);
      const country = intlCountry;

      /* THE CARRIER COMES FROM THE BROWSER, THE PRICE NEVER DOES. Which of the
         two the customer picked is a preference and is safe to accept; what
         that carrier charges is re-asked here, because a cost posted from a
         page anyone can edit would let somebody choose their own postage. */
      const requested: ShippingCarrier = isShippingCarrier(shipReq.carrier)
        ? shipReq.carrier
        : "nova_poshta";

      const ask = async (carrier: ShippingCarrier): Promise<number | null> => {
        try {
          const quote =
            carrier === "ukrposhta"
              ? await quoteUkrposhta({
                  countryCode: country,
                  weightKg: parcel.weightKg,
                  dims: parcel.dims,
                  declaredValueUah: goods.uah,
                })
              : await quoteNovaPost({
                  countryCode: country,
                  weightKg: parcel.weightKg,
                  dims: parcel.dims,
                  declaredValueUah: goods.uah,
                  city: String(shipReq.city ?? "").trim() || undefined,
                });
          return quote.ok ? quote.costUah : null;
        } catch (e) {
          console.error(`[invoice] ${carrier} quote failed for ${country}:`, e);
          return null;
        }
      };

      /* Ask the carrier they chose. If it cannot price — an outage between
         choosing and paying, or a destination it has since stopped serving —
         fall back to the OTHER one rather than dropping the customer into the
         confirm-by-email flow they had already got past. They are charged what
         that carrier costs and the order records who is actually carrying it,
         so the row never claims a carrier that was not asked. */
      const other: ShippingCarrier = requested === "ukrposhta" ? "nova_poshta" : "ukrposhta";

      let cost = await ask(requested);
      if (cost !== null) {
        shippingCarrier = requested;
      } else {
        cost = await ask(other);
        if (cost !== null) {
          shippingCarrier = other;
          console.warn(
            `[invoice] ${requested} could not price ${country} at pay time; charged ${other} instead`
          );
        }
      }

      if (cost !== null) {
        shippingUah = cost;
        intlQuoted = true;
      }
    }
  }

  /* WHICH PRICE LIST THE CARD IS BILLED FROM.

     Monobank issues invoices in hryvnia only, so a euro-storefront order has to
     be converted somewhere. It used to be charged goods.uah — the catalogue's
     hand-set hryvnia price — which quietly billed euro customers from the
     cheaper of two independent lists: A.Craft is €24 against ₴900, an implied
     37.5 rather than 51. A basket displaying €53.83 was charged ₴2425, which
     came back to roughly €47 on the customer's statement. Nobody was
     overcharged, but the figure on the page was not the figure on the card.

     Mario's decision (29 July 2026): the euro list is authoritative for euro
     customers. Goods convert at the same fixed 51 the summary shows shipping
     at, so page and invoice reconcile. The Ukrainian storefront is untouched
     and still pays its own hryvnia prices.

     amount_uah below stores THIS figure rather than the catalogue one, which is
     what keeps amount_uah + shipping_uah equal to the amount actually charged —
     admin order totals, the finance report, partner revenue and the waybill's
     declared value all read that sum and would otherwise understate every euro
     order.

     Rounding: goods and shipping convert separately and land on whole hryvnia,
     so the invoice can sit up to ~1 ₴ from displayed_eur × 51. That is a
     fraction of a cent and cannot be avoided while the invoice is an integer. */
  const goodsUahCharged = locale === "uk" ? goods.uah : eurToUahFixed(goods.eur);
  const total = { eur: goods.eur, uah: goodsUahCharged + shippingUah };
  if (total.uah <= 0) {
    // A voucher covering the whole basket leaves nothing to charge. Monobank
    // cannot create a zero invoice, and this needs a different flow.
    return NextResponse.json({ ok: false, error: "zero_total" }, { status: 400 });
  }

  const amountKop = toKopiyky(total.uah);
  const reference = makeReference();

  // A basket is sent only when it reconciles EXACTLY with the amount charged.
  // A voucher cannot be expressed as a basket line, so the discounted case
  // sends no basket rather than risk Monobank rejecting a mismatched invoice —
  // and NEITHER CAN SHIPPING, any more. Under the FOP-2 model (brief of
  // 29 July 2026) the customer buys goods delivered to a destination, not
  // goods plus a delivery service, so a "Доставка" line on the payment page is
  // exactly the presentation the model exists to avoid. When shipping is in
  // the total the itemised basket is omitted and the payment page shows one
  // order amount with an order-purpose description. Internal records keep the
  // split (shipping_uah below); only the customer-facing presentation folds it.
  const basket: BasketItem[] | undefined =
    discount.eur > 0 || shippingUah > 0
      ? undefined
      : priced.lines.map((l) => ({
          name: l.name,
          qty: l.qty,
          sum: toKopiyky(l.total.uah),
          unit: locale === "uk" ? "шт." : "pcs",
          code: l.slug,
        }));

  /* INTERNATIONAL IS A REQUEST ONLY WHEN IT COULD NOT BE PRICED. Nova Post's
     cross-border API quotes most of the world, and where it does, an
     international order is charged exactly like a domestic one: shipping in the
     total, one Monobank amount, one webhook, an order in admin.

     Where it does not — a country Nova Post will not carry to, or an outage —
     there is nothing to include and the one-total rule cannot be met by
     charging now. The old flow took the goods money immediately and invoiced
     delivery separately later, which is the second-invoice pattern the FOP-2
     model forbids. So the order is recorded, the shop notified, and ONE payment
     request for the full total follows by email once shipping is priced by
     hand. Status "request" keeps those rows distinct from "pending", which
     means a live Monobank invoice is waiting. */
  const isRequest = shippingMethod === "international" && !intlQuoted;

  // ---- Record the intent BEFORE sending anyone to pay ---------------------
  // If this insert fails we must not create an invoice: a customer could pay
  // for something we have no record of.
  const admin = createAdminClient();
  const { error: insErr } = await admin.from("payments").insert({
    reference,
    status: isRequest ? "request" : "pending",
    amount_kop: amountKop,
    user_id: userId,
    email,
    locale,
    // Merchandise only — this is the loyalty basis. Shipping is stored apart
    // so postage never earns XP.
    amount_eur: goods.eur,
    // The goods figure actually billed — see the note above the total. On the
    // Ukrainian storefront this is the catalogue price unchanged.
    amount_uah: goodsUahCharged,
    discount_eur: discount.eur,
    voucher_code: voucherCode,
    shipping_method: shippingMethod,
    shipping_carrier: shippingCarrier,
    shipping_uah: shippingUah,
    np_delivery_type: npDeliveryType,
    np_city_ref: npCityRef,
    np_city_name: npCityName,
    np_warehouse_ref: npWarehouseRef,
    np_warehouse_name: npWarehouseName,
    np_address: npAddress,
    np_notes: npNotes,
    np_street: npStreet,
    np_building: npBuilding,
    np_flat: npFlat,
    delivery,
    lines: priced.lines.map((l) => {
      // The options MUST be handed to describeLine. Without them it falls back
      // to the PDP's default "colour shown" and reports no add-ons at all — so
      // a paid Purple OP with a lid was recorded, emailed and packed as a plain
      // Black one, and the €4 lid never appeared on the packing note.
      const d = describeLine(
        {
          slug: l.slug,
          qty: l.qty,
          options: {
            variant: l.options.variant ?? undefined,
            lid: l.options.lid,
            rubber: l.options.rubber,
            timer: l.options.timer,
          },
        },
        locale
      );
      return {
        slug: l.slug,
        name: l.name,
        qty: l.qty,
        unit_eur: l.unit.eur,
        unit_uah: l.unit.uah,
        colour: d?.colour ?? null,
        material: d?.material ?? null,
        addons: d?.addons ?? null,
        // The choice itself, kept apart from the strings above: colour/addons
        // are translated for the customer's eye ("Чорний", "З Lid 9E418") and so
        // can never be matched back to a product. These three are stable, and
        // they are what stock is decremented from.
        variant: l.options.variant,
        lid: l.options.lid,
        rubber: l.options.rubber,
        timer: l.options.timer,
        // Frozen with the line (add-ons included) so the waybill weighs the
        // parcel from what was actually bought, not the catalogue default.
        weight_g: l.weightG,
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

  // ---- International: notify the shop and stop — no invoice yet -----------
  if (isRequest) {
    // The email is how these orders reach a human today: "request" rows carry
    // no invoice, so no webhook will ever fire for them, and the admin orders
    // page lists only paid orders. If the send fails the row still exists —
    // log loudly rather than refuse the order.
    await sendOrderRequestEmail({
      reference,
      email,
      locale,
      delivery,
      lines: priced.lines.map((l) => `${l.qty} × ${l.name}`),
      goodsEur: goods.eur,
      voucherCode,
    }).catch((e) => console.error("[invoice] order-request email failed:", e));

    return NextResponse.json({ ok: true, requested: true, reference });
  }

  // ---- Ask Monobank for a payment page ------------------------------------
  try {
    const invoice = await createInvoice({
      amountKop,
      reference,
      /* VERBATIM from docs/fiscal-payment-wording.md §2 — these two strings are
         a standard, not a phrasing choice, and the accountant still has to sign
         them off (§8.3). Do not reword, and do not reinstate the em-dash that
         used to sit before the brand: the document specifies a plain space.
         Never "delivery services" / "оплата за доставку" / "courier" in any
         form — that is the presentation the whole FOP-2 model exists to avoid. */
      destination:
        locale === "uk"
          ? `Оплата замовлення ${reference} Tactical HB`
          : `Order ${reference} payment Tactical HB`,
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

/* ---------------------------------------------------------------------------
   Internal notification for an international order request.

   Plain operational mail to the shop's own inbox — same Resend pattern as the
   contact form. It exists because "request" rows fire no webhook and appear on
   no admin page yet; without this email the order would sit unseen.

   THE INSTRUCTION IN THE EMAIL IS PART OF THE COMPLIANCE MODEL: the manual
   payment request Mario sends must be ONE amount for the whole order with an
   order-purpose description, never a separate delivery invoice.
--------------------------------------------------------------------------- */

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

async function sendOrderRequestEmail(p: {
  reference: string;
  email: string;
  locale: string;
  delivery: Record<string, unknown>;
  lines: string[];
  goodsEur: number;
  voucherCode: string | null;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[invoice] RESEND_API_KEY missing — order request", p.reference, "recorded but not emailed");
    return;
  }

  const d = p.delivery;
  const s = (k: string) => String(d[k] ?? "").trim();
  const rows: Array<[string, string]> = [
    ["Reference", p.reference],
    ["Name", `${s("firstName")} ${s("surname")}`.trim() || "—"],
    ["Email", p.email],
    ["Phone", s("phone") || "—"],
    ["Country", s("country") || "—"],
    ["City", s("city") || "—"],
    ["Address", [s("address"), s("apartment")].filter(Boolean).join(", ") || "—"],
    ["Postcode", s("postcode") || "—"],
    ["Items", p.lines.join("; ")],
    ["Goods total", `€${p.goodsEur.toFixed(2)}${p.voucherCode ? ` (voucher ${p.voucherCode} applied)` : ""}`],
    ["Locale", p.locale],
  ];

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: process.env.CONTACT_FROM_EMAIL || "Tactical HB <contact@tactical-hb.com>",
    to: "admin@tactical-hb.com",
    replyTo: p.email,
    subject: `International order request ${p.reference}`,
    html: `
      <h2 style="font-family:sans-serif">International order request</h2>
      <table style="font-family:sans-serif;font-size:14px;border-collapse:collapse">
        ${rows
          .map(
            ([k, v]) =>
              `<tr><td style="padding:3px 16px 3px 0;color:#707072;vertical-align:top">${k}</td><td>${esc(v)}</td></tr>`
          )
          .join("")}
      </table>
      <p style="font-family:sans-serif;font-size:14px;max-width:560px">
        Quote delivery to this destination, then send <b>one</b> Monobank payment
        request for the <b>full order total</b> (goods + delivery), with the
        purpose <b>«Оплата замовлення ${esc(p.reference)} Tactical HB»</b> — the
        standard string from docs/fiscal-payment-wording.md §2, the same one the
        site sends automatically. Do not invoice delivery as a separate service.
      </p>`,
  });
  if (error) console.error("[invoice] Resend rejected order-request email:", error);
}
