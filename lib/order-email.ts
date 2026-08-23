import "server-only";
import { esc } from "@/lib/email";
import { eurToUah, moneyFromUah } from "@/lib/currency";
import { CARD, INK, MUTED, FAINT, LINE, ACCENT, FONT, uah, emailShell } from "@/lib/email-theme";
import { emailProductImage, emailThumbFor } from "@/lib/email/product-image";

/* The grey the product photography is shot on. Behind every thumbnail, so a
   blocked or slow image leaves the same square the marketing rows do rather
   than a cream gap. */
const THUMB_BG = "#F5F5F5";
import type { PaymentRow } from "@/lib/fulfilment";

/* ---------------------------------------------------------------------------
   The customer's order confirmation.

   Written for email clients, not browsers: tables for layout, inline styles
   only, no flexbox or grid, one 600px column. Rounded corners degrade to
   square in older Outlook, which is fine.

   The wordmark is TEXT, not the logo file. Gmail and Outlook refuse SVG
   outright, and most clients block remote images until the reader allows
   them — a text lockup always renders, and it is the same wordmark the site
   header uses.

   CURRENCY. The email shows the currency the customer shopped in — hryvnia on
   the Ukrainian site, euro on the English one. Monobank always settles in UAH,
   so the euro version also states the hryvnia actually charged; without it the
   email would contradict the customer's bank statement.

   Note the catalogue sets EUR and UAH prices independently rather than
   converting (the Killer is €11 / ₴420, ~38 UAH/€, while vouchers convert at
   UAH_PER_EUR). The two views are therefore each internally consistent but not
   a conversion of one another, which is exactly why the charged figure is
   printed rather than left to be inferred.

   The palette, font stack, wordmark and footer live in lib/email-theme.ts,
   shared with the shipping notification so the two cannot drift apart.
--------------------------------------------------------------------------- */

type Copy = {
  subject: (ref: string) => string;
  headline: string;
  intro: string;
  orderNo: string;
  orderDate: string;
  qty: string;
  subtotal: string;
  /** Names the full-setup row. Never a percentage — see components/SetupSaving. */
  setup: string;
  total: string;
  /** Says in words that delivery is inside the total — the receipt carries no
      priced delivery row, per the FOP-2 model. */
  totalIncludes: string;
  voucher: string;
  shipTo: string;
  closing: string;
  chargedNote: string;
  dateLocale: string;
};

const COPY: Record<"uk" | "en", Copy> = {
  en: {
    subject: (ref) => `Your Tactical HB order ${ref}`,
    headline: "Thank you for your order.",
    intro:
      "We've received your payment and your order is being prepared. We'll be in touch as soon as it's on its way.",
    orderNo: "Order number",
    orderDate: "Order date",
    qty: "Qty",
    subtotal: "Subtotal",
    setup: "Full setup",
    total: "Total",
    totalIncludes: "Order total includes shipping to your destination.",
    voucher: "Voucher",
    shipTo: "Shipping address",
    closing: "Thank you for choosing Tactical HB.",
    chargedNote: "Charged in hryvnia:",
    dateLocale: "en-GB",
  },
  uk: {
    subject: (ref) => `Ваше замовлення Tactical HB ${ref}`,
    headline: "Дякуємо за ваше замовлення.",
    intro:
      "Ми отримали вашу оплату та готуємо замовлення до відправлення. Повідомимо вас, щойно воно вирушить.",
    orderNo: "Номер замовлення",
    orderDate: "Дата замовлення",
    qty: "К-сть",
    subtotal: "Проміжний підсумок",
    setup: "Повний сет",
    total: "Разом",
    totalIncludes: "До суми замовлення включено доставку до обраного напрямку.",
    voucher: "Ваучер",
    shipTo: "Адреса доставки",
    closing: "Дякуємо, що обрали Tactical HB.",
    chargedNote: "Списано:",
    dateLocale: "uk-UA",
  },
};

/**
 * Absolute image URL for a line, or null when the product has no usable art.
 *
 * THREE STEPS, AND THE ORDER OF THEM IS THE WHOLE POINT.
 *
 * 1. The light version of the photo captured at checkout. That photo is the
 *    record of what was bought — an order placed before variants were recorded
 *    has a purple HMD in `image` and nothing in `variant`, so re-resolving from
 *    the slug would put a black one in the receipt. The thumbnail is the same
 *    picture at 152px and ~3 KB instead of up to 562 KB; four lines used to be
 *    over a megabyte to show four 72px squares.
 *
 * 2. Failing that, the catalogue square for the slug and variant.
 *
 * 3. Failing that, the stored path exactly as it is — a product that has since
 *    left the catalogue still shows what the customer bought.
 *
 * NO STEP CAN RETURN tileImage, and that is a fix rather than a tidy-up. The
 * tiles are tall bleed cut-outs for the flagship grid — the wind cover's is
 * 524×968 — and this markup states width AND height, so one landing here came
 * out crushed to 40% of its height. It only ever showed on lines with no
 * stored image, which is why it went unnoticed.
 */
function lineImage(
  slug: string,
  stored: string | null | undefined,
  variant: string | null | undefined,
  siteUrl: string
): { url: string; square: boolean } | null {
  const thumb = emailThumbFor(stored);
  if (thumb) return { url: `${siteUrl}${thumb}`, square: true };

  const resolved = emailProductImage(slug, variant);
  if (resolved) return { url: `${siteUrl}${resolved}`, square: true };

  if (!stored) return null;
  // `square: false` is the honest answer, not a guess. See the markup below.
  return { url: stored.startsWith("http") ? stored : `${siteUrl}${stored}`, square: false };
}

export function buildOrderEmail(
  p: PaymentRow,
  siteUrl: string
): { subject: string; html: string; text: string } {
  const t = COPY[p.locale === "uk" ? "uk" : "en"];
  const d = p.delivery as Record<string, string>;
  const name = [d.firstName, d.surname].filter(Boolean).join(" ");
  const np = p.shipping_method === "nova_poshta";
  const courier = np && p.np_delivery_type === "courier";

  // Branch delivery has no street address (the branch is the address); courier
  // has a street address but no branch.
  const addressLines = np
    ? courier
      ? [name, p.np_city_name ?? "", p.np_address ?? "", p.np_notes ?? ""]
      : [name, p.np_city_name ?? "", p.np_warehouse_name ?? ""]
    : [name, d.address, d.apartment, [d.city, d.postcode].filter(Boolean).join(", "), d.country];
  const address = addressLines.filter(Boolean);

  // amount_uah is goods AFTER any discount — that is what create-invoice
  // stored and what was charged. The subtotal line must therefore be built
  // back UP by the discount, or the arithmetic on screen does not add up:
  // showing the discounted figure as "subtotal" and then subtracting the
  // voucher again reads as a mistake to the customer.
  const goodsUah = Math.round(p.amount_uah);
  const discountUah = p.voucher_code ? eurToUah(p.discount_eur) : 0;
  const shipUah = Math.round(p.shipping_uah);
  const totalUah = goodsUah + shipUah;

  /* THE FULL-SETUP SAVING HAS TO BE PUT BACK ON THE PAGE, for the same reason
     the voucher above is: amount_uah is what was charged, and the item rows
     below quote full line prices, so a receipt that jumped straight from those
     rows to the charged figure would be a receipt whose sum does not match its
     lines. That is the one thing a receipt may not be.

     It is DERIVED rather than stored, because it is already implied by two
     figures the order carries: the lines add up to what the goods would have
     cost, amount + voucher is what they did cost, and the difference is the
     saving. Nothing to migrate and nothing that can fall out of step with the
     amount actually charged.

     The tolerance is a cent, not zero. These are floats stored as numerics and
     re-summed here; an exact comparison would occasionally invent a saving of
     0.00 and print a row saying nothing. */
  const linesEur = p.lines.reduce((n, l) => n + l.unit_eur * l.qty, 0);
  const linesUah = p.lines.reduce((n, l) => n + l.unit_uah * l.qty, 0);
  const setupEur = Math.round((linesEur - (p.amount_eur + p.discount_eur)) * 100) / 100;
  const setupUah = Math.round(linesUah - (goodsUah + discountUah));
  const hasSetup = setupEur > 0.01 && setupUah > 0;

  /* ---- Which currency the customer reads ----------------------------------
     Ukrainian shoppers saw hryvnia and are charged hryvnia — one currency,
     nothing to explain. English shoppers browsed in euro but Monobank settles
     in UAH, so the euro figures are shown (that is what they chose to buy at)
     with the charged hryvnia stated beneath the total. Without that line the
     email would disagree with their bank statement.

     Every figure in a receipt must add up, so ONE currency carries the
     arithmetic; shipping, quoted by Nova Poshta in UAH, is converted for the
     euro view at the documented rate. */
  const inEur = p.locale !== "uk";
  /* THE SAME HELPER THE CHECKOUT SUMMARY USES, and it has to stay that way —
     two independent conversions of the same quote once disagreed. This called
     uahToEur, which converts at the general 51.5; shipping is now shown at its
     own fixed 51, so the receipt would have read €23.11 under a page saying
     €23.33. */
  const shipEur = moneyFromUah(p.shipping_uah).eur;

  const fmt = (eur: number, uahValue: number) =>
    inEur ? `€${eur.toFixed(2)}` : uah(uahValue);

  const amounts = {
    /* Built back up past BOTH reductions — the setup saving and then the
       voucher — so subtotal minus the rows beneath it lands on the total. */
    subtotal: fmt(
      p.amount_eur + p.discount_eur + (hasSetup ? setupEur : 0),
      goodsUah + discountUah + (hasSetup ? setupUah : 0)
    ),
    setup: fmt(setupEur, setupUah),
    discount: fmt(p.discount_eur, discountUah),
    shipping: fmt(shipEur, shipUah),
    total: fmt(p.amount_eur + shipEur, totalUah),
  };
  const line = (l: PaymentRow["lines"][number]) => fmt(l.unit_eur * l.qty, l.unit_uah * l.qty);
  const date = new Date().toLocaleDateString(t.dateLocale, { day: "numeric", month: "long", year: "numeric" });

  /* ---- Items ---- */
  const itemRows = p.lines
    .map((l) => {
      const img = lineImage(l.slug, l.image, l.variant, siteUrl);
      const spec = [l.colour, l.material, l.addons].filter(Boolean).join(" · ");
      return `
      <tr>
        <td style="padding:16px 0;border-top:1px solid ${LINE}">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td width="76" valign="top" style="padding-right:16px">
                ${
                  img
                    ? /* HEIGHT IS STATED ONLY WHEN THE SOURCE IS KNOWN SQUARE.
                         An email client that honours width honours height with
                         it and there is no object-fit to save you, so stating
                         both on a 960×1280 photo does not crop it — it crushes
                         it. For the discontinued-product fallback the width
                         alone is given and the height scales proportionally:
                         that row ends up a little taller or shorter than its
                         neighbours, which is a far better receipt than one
                         showing a misshapen version of what someone bought. */
                      img.square
                      ? `<img src="${esc(img.url)}" alt="${esc(l.name)}" width="72" height="72"
                         style="display:block;width:72px;height:72px;border-radius:8px;background:${THUMB_BG}" />`
                      : `<img src="${esc(img.url)}" alt="${esc(l.name)}" width="72"
                         style="display:block;width:72px;height:auto;border-radius:8px;background:${THUMB_BG}" />`
                    : `<div style="width:72px;height:72px;border-radius:8px;background:${THUMB_BG}"></div>`
                }
              </td>
              <td valign="top" style="font-family:${FONT}">
                <div style="font-size:15px;font-weight:600;color:${INK};line-height:1.35">${esc(l.name)}</div>
                ${spec ? `<div style="font-size:13px;color:${MUTED};margin-top:4px">${esc(spec)}</div>` : ""}
                <div style="font-size:13px;color:${MUTED};margin-top:4px">${esc(t.qty)} ${l.qty}</div>
              </td>
              <td valign="top" align="right" style="font-family:${FONT};font-size:15px;color:${INK};white-space:nowrap">
                ${line(l)}
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
    })
    .join("");

  /* ---- Summary ---- */
  const summaryRow = (label: string, value: string, opts?: { strong?: boolean; muted?: boolean }) => `
    <tr>
      <td style="font-family:${FONT};font-size:${opts?.strong ? "16px" : "14px"};color:${
        opts?.muted ? MUTED : INK
      };font-weight:${opts?.strong ? "600" : "400"};padding:6px 0">${esc(label)}</td>
      <td align="right" style="font-family:${FONT};font-size:${opts?.strong ? "18px" : "14px"};color:${
        opts?.muted ? MUTED : INK
      };font-weight:${opts?.strong ? "600" : "400"};padding:6px 0;white-space:nowrap">${esc(value)}</td>
    </tr>`;

  const inner = `
        <!-- Headline -->
        <tr><td align="center" style="padding-bottom:12px">
          <h1 style="margin:0;font-family:${FONT};font-size:27px;line-height:1.25;font-weight:700;color:${INK}">
            ${esc(t.headline)}
          </h1>
        </td></tr>
        <tr><td align="center" style="padding-bottom:30px">
          <p style="margin:0;font-family:${FONT};font-size:15px;line-height:1.6;color:${MUTED};max-width:440px">
            ${esc(t.intro)}
          </p>
        </td></tr>

        <!-- Order meta -->
        <tr><td style="padding-bottom:18px">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td style="font-family:${FONT};font-size:13px;color:${MUTED}">
                ${esc(t.orderNo)}<br>
                <span style="font-size:15px;color:${INK};font-weight:600;letter-spacing:0.5px">${esc(p.reference)}</span>
              </td>
              <td align="right" style="font-family:${FONT};font-size:13px;color:${MUTED}">
                ${esc(t.orderDate)}<br>
                <span style="font-size:15px;color:${INK};font-weight:600">${esc(date)}</span>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Items -->
        <tr><td style="background:${CARD};border-radius:14px;padding:6px 22px 16px">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            ${itemRows}
          </table>
        </td></tr>

        <!-- Summary -->
        <tr><td style="padding-top:14px">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
                 style="background:${CARD};border-radius:14px">
            <tr><td style="padding:20px 22px">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                ${summaryRow(t.subtotal, amounts.subtotal)}
                ${hasSetup ? summaryRow(t.setup, `−${amounts.setup}`, { muted: true }) : ""}
                ${discountUah > 0 ? summaryRow(`${t.voucher} · ${p.voucher_code}`, `−${amounts.discount}`, { muted: true }) : ""}
                <tr><td colspan="2" style="border-top:1px solid ${ACCENT};opacity:0.4;font-size:0;line-height:0;padding-top:12px">&nbsp;</td></tr>
                ${summaryRow(t.total, amounts.total, { strong: true })}
                ${
                  /* NO priced "Доставка" row — under the FOP-2 model the
                     customer buys goods delivered to a destination, so the
                     receipt states one order total and says in words that
                     delivery is inside it. The subtotal→total gap is the
                     shipping; the note is what makes that gap read as
                     intended rather than as an error. */
                  shipUah > 0
                    ? `<tr><td colspan="2" style="font-family:${FONT};font-size:12px;color:${FAINT};padding-top:2px">${esc(t.totalIncludes)}</td></tr>`
                    : ""
                }
                ${inEur ? `<tr><td colspan="2" style="font-family:${FONT};font-size:12px;color:${FAINT};padding-top:2px">${esc(t.chargedNote)} ${uah(totalUah)}</td></tr>` : ""}
              </table>
            </td></tr>
          </table>
        </td></tr>

        <!-- Shipping address -->
        <tr><td style="padding-top:26px">
          <div style="font-family:${FONT};font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:${FAINT};padding-bottom:8px">
            ${esc(t.shipTo)}
          </div>
          <div style="font-family:${FONT};font-size:14px;line-height:1.65;color:${INK}">
            ${address.map((l) => esc(l)).join("<br>")}
          </div>
        </td></tr>

        <!-- Closing -->
        <tr><td style="padding-top:30px">
          <p style="margin:0;font-family:${FONT};font-size:14px;line-height:1.6;color:${MUTED}">
            ${esc(t.closing)}
          </p>
        </td></tr>`;

  const html = emailShell({
    lang: p.locale === "uk" ? "uk" : "en",
    title: esc(t.subject(p.reference)),
    inner,
  });

  const text = [
    t.headline,
    "",
    t.intro,
    "",
    `${t.orderNo}: ${p.reference}`,
    `${t.orderDate}: ${date}`,
    "",
    ...p.lines.map((l) => `  ${l.qty} × ${l.name} — ${uah(l.unit_uah * l.qty)}`),
    "",
    `${t.subtotal}: ${amounts.subtotal}`,
    ...(hasSetup ? [`${t.setup}: −${amounts.setup}`] : []),
    ...(discountUah > 0 ? [`${t.voucher} ${p.voucher_code}: −${amounts.discount}`] : []),
    `${t.total}: ${amounts.total}`,
    ...(shipUah > 0 ? [t.totalIncludes] : []),
    ...(inEur ? [`${t.chargedNote} ${uah(totalUah)}`] : []),
    "",
    `${t.shipTo}:`,
    ...address,
    "",
    t.closing,
    "",
    "TACTICAL HB",
  ].join("\n");

  return { subject: t.subject(p.reference), html, text };
}
