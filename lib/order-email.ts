import "server-only";
import { products } from "@/lib/products";
import { esc } from "@/lib/email";
import { eurToUah, UAH_PER_EUR } from "@/lib/currency";
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
--------------------------------------------------------------------------- */

const BG = "#f7f5f1";
const CARD = "#ffffff";
const INK = "#17160f";
const MUTED = "#6c6860";
const FAINT = "#a39d92";
const LINE = "#e4e0d8";
const ACCENT = "#C4A35A";
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

const uah = (n: number) => `₴${Math.round(n).toLocaleString("uk-UA")}`;

type Copy = {
  subject: (ref: string) => string;
  headline: string;
  intro: string;
  orderNo: string;
  orderDate: string;
  qty: string;
  subtotal: string;
  shipping: string;
  shippingAfter: string;
  total: string;
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
    shipping: "Shipping",
    shippingAfter: "Invoiced separately",
    total: "Total",
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
    shipping: "Доставка",
    shippingAfter: "Рахунок надійде окремо",
    total: "Разом",
    voucher: "Ваучер",
    shipTo: "Адреса доставки",
    closing: "Дякуємо, що обрали Tactical HB.",
    chargedNote: "Списано:",
    dateLocale: "uk-UA",
  },
};

/** Absolute image URL for a line, or null when the product has no usable art. */
function lineImage(slug: string, stored: string | null | undefined, siteUrl: string): string | null {
  // Prefer the image captured at checkout — it reflects the chosen variant.
  const path = stored || (() => {
    const p = products.find((x) => x.slug === slug);
    return p?.tileImage || p?.gridImage || p?.image || null;
  })();
  if (!path) return null;
  return path.startsWith("http") ? path : `${siteUrl}${path}`;
}

export function buildOrderEmail(
  p: PaymentRow,
  siteUrl: string
): { subject: string; html: string; text: string } {
  const t = COPY[p.locale === "uk" ? "uk" : "en"];
  const d = p.delivery as Record<string, string>;
  const name = [d.firstName, d.surname].filter(Boolean).join(" ");
  const np = p.shipping_method === "nova_poshta";

  // A branch delivery has no street address — those fields were never asked
  // for, so printing them would leave blank lines.
  const addressLines = np
    ? [name, p.np_city_name ?? "", p.np_warehouse_name ?? ""]
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
  const shipEur = p.shipping_uah / UAH_PER_EUR;

  const fmt = (eur: number, uahValue: number) =>
    inEur ? `€${eur.toFixed(2)}` : uah(uahValue);

  const amounts = {
    subtotal: fmt(p.amount_eur + p.discount_eur, goodsUah + discountUah),
    discount: fmt(p.discount_eur, discountUah),
    shipping: fmt(shipEur, shipUah),
    total: fmt(p.amount_eur + shipEur, totalUah),
  };
  const line = (l: PaymentRow["lines"][number]) => fmt(l.unit_eur * l.qty, l.unit_uah * l.qty);
  const date = new Date().toLocaleDateString(t.dateLocale, { day: "numeric", month: "long", year: "numeric" });

  /* ---- Items ---- */
  const itemRows = p.lines
    .map((l) => {
      const img = lineImage(l.slug, l.image, siteUrl);
      const spec = [l.colour, l.material, l.addons].filter(Boolean).join(" · ");
      return `
      <tr>
        <td style="padding:16px 0;border-top:1px solid ${LINE}">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td width="76" valign="top" style="padding-right:16px">
                ${
                  img
                    ? `<img src="${esc(img)}" alt="${esc(l.name)}" width="72" height="72"
                         style="display:block;width:72px;height:72px;border-radius:8px;background:${BG};object-fit:contain" />`
                    : `<div style="width:72px;height:72px;border-radius:8px;background:${BG}"></div>`
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

  const html = `<!doctype html>
<html lang="${p.locale === "uk" ? "uk" : "en"}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(t.subject(p.reference))}</title></head>
<body style="margin:0;padding:0;background:${BG}">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BG}">
    <tr><td align="center" style="padding:36px 16px 48px">

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:100%;max-width:600px">

        <!-- Wordmark -->
        <tr><td align="center" style="padding-bottom:28px">
          <span style="font-family:${FONT};font-size:19px;font-weight:700;letter-spacing:3px;color:${INK}">
            TACTICAL <span style="color:${ACCENT}">HB</span>
          </span>
        </td></tr>

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
                ${discountUah > 0 ? summaryRow(`${t.voucher} · ${p.voucher_code}`, `−${amounts.discount}`, { muted: true }) : ""}
                ${summaryRow(t.shipping, np ? amounts.shipping : t.shippingAfter, np ? undefined : { muted: true })}
                <tr><td colspan="2" style="border-top:1px solid ${ACCENT};opacity:0.4;font-size:0;line-height:0;padding-top:12px">&nbsp;</td></tr>
                ${summaryRow(t.total, amounts.total, { strong: true })}
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
        </td></tr>

        <!-- Footer -->
        <tr><td align="center" style="padding-top:36px;border-top:1px solid ${LINE};margin-top:20px">
          <div style="font-family:${FONT};font-size:12px;letter-spacing:2px;color:${FAINT};padding-top:22px">
            TACTICAL HB
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`;

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
    ...(discountUah > 0 ? [`${t.voucher} ${p.voucher_code}: −${amounts.discount}`] : []),
    `${t.shipping}: ${np ? amounts.shipping : t.shippingAfter}`,
    `${t.total}: ${amounts.total}`,
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
