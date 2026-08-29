import "server-only";
import { esc } from "@/lib/email";
import { CARD, INK, MUTED, FAINT, ACCENT_FILL, FONT, emailShell } from "@/lib/email-theme";
import { trackingUrl } from "@/lib/nova-poshta-tracking";
import { ukrposhtaTrackingUrl } from "@/lib/ukrposhta-tracking";
import { carrierName, isShippingCarrier, type ShippingCarrier } from "@/lib/shipping-carriers";

/* ---------------------------------------------------------------------------
   "Your order has shipped."

   Same shell, palette and wordmark as the order confirmation — both import
   lib/email-theme, so the two cannot drift apart.

   The waybill number is the whole point of this email, so it is set large and
   selectable as text rather than only living inside the button: a reader whose
   client blocks or mangles the link can still copy the number, and plenty of
   people paste it into the Nova Poshta app instead of following a link.

   EVERY SENTENCE THAT NAMES THE CARRIER IS A FUNCTION OF THE CARRIER. This
   email said "handed over to Nova Poshta" in flat text for as long as one
   company carried everything. It no longer does, and an Ukrposhta parcel
   announced as a Nova Poshta one — with a Nova Poshta tracking link that will
   never find the barcode — is worse than no email: the customer follows it,
   is told their parcel does not exist, and writes to ask what happened.

   THE UKRAINIAN IS PHRASED TO SURVIVE THE SUBSTITUTION. «Ми передали вашу
   посилку Новій Пошті» needs the dative, and the carrier name is stored in the
   nominative — so the sentence was rewritten to make the carrier the SUBJECT
   («Вашу посилку прийняла Укрпошта») rather than have the code decline a
   proper noun it does not know how to decline.
--------------------------------------------------------------------------- */

type Copy = {
  subject: (ref: string) => string;
  headline: string;
  intro: (carrier: string) => string;
  orderNo: string;
  /** What the number is called. A waybill and a postal barcode are not the same document. */
  number: Record<ShippingCarrier, string>;
  track: string;
  trackHint: (carrier: string) => string;
  shipTo: string;
  closing: string;
};

const COPY: Record<"uk" | "en", Copy> = {
  en: {
    subject: (ref) => `Your Tactical HB order ${ref} has shipped`,
    headline: "Your order is on its way.",
    intro: (carrier) =>
      `Your parcel has been handed over to ${carrier}. You can follow it any time with the tracking number below.`,
    orderNo: "Order number",
    number: { nova_poshta: "Tracking number", ukrposhta: "Tracking number" },
    track: "Track your parcel",
    trackHint: (carrier) => `${carrier} updates tracking as the parcel moves.`,
    shipTo: "Delivery address",
    closing: "Thank you for choosing Tactical HB.",
  },
  uk: {
    subject: (ref) => `Ваше замовлення Tactical HB ${ref} відправлено`,
    headline: "Ваше замовлення вже в дорозі.",
    intro: (carrier) =>
      `Вашу посилку прийняла ${carrier}. Ви можете відстежувати її будь-коли за номером нижче.`,
    orderNo: "Номер замовлення",
    number: { nova_poshta: "Номер накладної (ТТН)", ukrposhta: "Номер для відстеження" },
    track: "Відстежити посилку",
    trackHint: (carrier) => `${carrier} оновлює статус у міру руху посилки.`,
    shipTo: "Адреса доставки",
    closing: "Дякуємо, що обрали Tactical HB.",
  },
};

export type ShippedEmailInput = {
  reference: string;
  /** The waybill number or the postal barcode — whichever this carrier issued. */
  ttn: string;
  locale: string;
  /**
   * Who is carrying it.
   *
   * NULL MEANS NOVA POSHTA, and that is a fact about the data rather than a
   * default: orders placed before migration 0028 have no carrier column value
   * because there was nothing else it could have been. Treating null as
   * "unknown" would degrade a historical order into a carrier-less email.
   */
  carrier: ShippingCarrier | string | null;
  /** Already-assembled address lines — branch, courier street, or a foreign address. */
  addressLines: string[];
};

export function buildShippedEmail(o: ShippedEmailInput): { subject: string; html: string; text: string } {
  const lang = o.locale === "uk" ? "uk" : "en";
  const t = COPY[lang];
  const carrier: ShippingCarrier = isShippingCarrier(o.carrier) ? o.carrier : "nova_poshta";
  const who = carrierName(carrier, lang);
  const url = carrier === "ukrposhta" ? ukrposhtaTrackingUrl(o.ttn, lang) : trackingUrl(o.ttn);
  const address = o.addressLines.map((l) => (l ?? "").trim()).filter(Boolean);

  const inner = `
        <!-- Headline -->
        <tr><td align="center" style="padding-bottom:12px">
          <h1 style="margin:0;font-family:${FONT};font-size:27px;line-height:1.25;font-weight:700;color:${INK}">
            ${esc(t.headline)}
          </h1>
        </td></tr>
        <tr><td align="center" style="padding-bottom:30px">
          <p style="margin:0;font-family:${FONT};font-size:15px;line-height:1.6;color:${MUTED};max-width:440px">
            ${esc(t.intro(who))}
          </p>
        </td></tr>

        <!-- Order number -->
        <tr><td style="padding-bottom:18px">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td style="font-family:${FONT};font-size:13px;color:${MUTED}">
                ${esc(t.orderNo)}<br>
                <span style="font-size:15px;color:${INK};font-weight:600;letter-spacing:0.5px">${esc(o.reference)}</span>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Tracking number + button -->
        <tr><td style="background:${CARD};border-radius:14px;padding:24px 22px">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr><td align="center" style="font-family:${FONT};font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:${FAINT};padding-bottom:8px">
              ${esc(t.number[carrier])}
            </td></tr>
            <tr><td align="center" style="font-family:${FONT};font-size:26px;font-weight:700;letter-spacing:1.5px;color:${INK};padding-bottom:20px">
              ${esc(o.ttn)}
            </td></tr>
            <tr><td align="center">
              <a href="${esc(url)}"
                 style="display:inline-block;font-family:${FONT};font-size:15px;font-weight:600;color:#111114;background:${ACCENT_FILL};text-decoration:none;padding:13px 30px;border-radius:999px">
                ${esc(t.track)}
              </a>
            </td></tr>
            <tr><td align="center" style="font-family:${FONT};font-size:12px;color:${FAINT};padding-top:14px">
              ${esc(t.trackHint(who))}
            </td></tr>
          </table>
        </td></tr>
        ${
          address.length > 0
            ? `
        <!-- Delivery address -->
        <tr><td style="padding-top:26px">
          <div style="font-family:${FONT};font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:${FAINT};padding-bottom:8px">
            ${esc(t.shipTo)}
          </div>
          <div style="font-family:${FONT};font-size:14px;line-height:1.65;color:${INK}">
            ${address.map((l) => esc(l)).join("<br>")}
          </div>
        </td></tr>`
            : ""
        }

        <!-- Closing -->
        <tr><td style="padding-top:30px">
          <p style="margin:0;font-family:${FONT};font-size:14px;line-height:1.6;color:${MUTED}">
            ${esc(t.closing)}
          </p>
        </td></tr>`;

  const html = emailShell({ lang, title: esc(t.subject(o.reference)), inner });

  const text = [
    t.headline,
    "",
    t.intro(who),
    "",
    `${t.orderNo}: ${o.reference}`,
    `${t.number[carrier]}: ${o.ttn}`,
    `${t.track}: ${url}`,
    ...(address.length ? ["", `${t.shipTo}:`, ...address] : []),
    "",
    t.closing,
    "",
    "TACTICAL HB",
  ].join("\n");

  return { subject: t.subject(o.reference), html, text };
}
