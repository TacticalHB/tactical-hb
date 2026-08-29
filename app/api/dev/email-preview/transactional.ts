import "server-only";
import { buildOrderEmail } from "@/lib/order-email";
import { buildShippedEmail } from "@/lib/shipping-email";
import { buildWholesaleReply, buildWholesaleRegistrationReply } from "@/lib/wholesale-email";
import { buildDecisionMail } from "@/lib/wholesale-decision-email";
import {
  buildWholesaleApplicationStaffMail,
  buildWholesaleEnquiryStaffMail,
} from "@/lib/wholesale-staff-email";
import { buildPartnerAckMail, buildStaffRequestMail } from "@/lib/wholesale-request-email";
import type { WholesaleRequest } from "@/lib/wholesale-display";
import { unitPrice } from "@/lib/wholesale-prices";
import { buildFollowUpMail } from "@/lib/followup-email";
import type { PaymentRow } from "@/lib/fulfilment";

/* ---------------------------------------------------------------------------
   Sample inputs for the four transactional letters, so the dev preview can
   render them beside the marketing ones.

   NOT FIXTURES FOR TESTS AND NOT SEED DATA. Nothing here is written anywhere;
   it exists so a change to the shared palette can be LOOKED AT across all five
   email families before it ships, which is the only way to catch two of them
   drifting apart again.

   The order is deliberately awkward — three lines, one with a variant and
   add-ons, a voucher applied, courier delivery — because a confirmation that
   looks right with one plain line can still fall over on a real basket.
--------------------------------------------------------------------------- */

const SITE = (process.env.SITE_URL || "https://tactical-hb.com").replace(/\/$/, "");

function samplePayment(locale: string): PaymentRow {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    reference: "THB-2608-0142",
    invoice_id: null,
    user_id: null,
    email: "preview@example.invalid",
    locale,
    /* THE AMOUNTS AGREE WITH THE LINES BELOW, which they did not use to — the
       fixture quoted a subtotal its own items never summed to, so the preview
       could not be used to check that a receipt adds up. It is now a full
       setup with a voucher on top, which is the busiest a receipt gets:

         lines            €136.00   (10 + 36 + 45×2)
         full setup       − €9.10   (cheapest of each: 10 + 36 + 45 = 91)
         voucher          −€10.00
         goods            €116.90   ← amount_eur
         shipping           €2.35   (₴120 at the fixed 51)
         total            €119.25
    */
    amount_eur: 116.9,
    amount_uah: 4313,
    discount_eur: 10,
    voucher_code: "MILESTONE-10",
    shipping_method: "nova_poshta",
    shipping_carrier: "nova_poshta",
    shipping_uah: 120,
    np_delivery_type: "courier",
    np_city_ref: null,
    np_city_name: locale === "uk" ? "Київ" : "Kyiv",
    np_warehouse_ref: null,
    np_warehouse_name: null,
    np_address: "вул. Хрещатик, 22, кв. 4",
    np_notes: null,
    np_street: "Хрещатик",
    np_building: "22",
    np_flat: "4",
    delivery: { firstName: "Preview", surname: "Customer", phone: "+380000000000" },
    lines: [
      {
        slug: "hmd-tct-op", name: "HMD TCT OP", qty: 1,
        unit_eur: 36, unit_uah: 1406,
        colour: locale === "uk" ? "Фіолетовий" : "Purple",
        material: "Aluminium",
        addons: locale === "uk" ? "З Lid 9E418" : "With Lid 9E418",
        variant: "Purple", lid: true, rubber: false, timer: false,
        weight_g: 155, image: "/images/hmd-op-purple.png",
      },
      {
        slug: "bowl-livanka", name: "Tactical Livanka", qty: 1,
        unit_eur: 10, unit_uah: 370,
        colour: locale === "uk" ? "Матовий чорний" : "Matte Black",
        material: "Clay", addons: null,
        variant: null, lid: false, rubber: false, timer: false,
        weight_g: 300, image: "/images/livanka-hero.png",
      },
      {
        slug: "windcover-detonator", name: "Windcover Detonator", qty: 2,
        unit_eur: 45, unit_uah: 1700,
        colour: null, material: "Steel",
        addons: locale === "uk" ? "З таймером" : "With Timer",
        variant: null, lid: false, rubber: false, timer: true,
        weight_g: 470, image: "/images/windcover-detonator-1.jpg",
      },
    ],
  };
}

/* The awkward order: every branch of lineImage() at once, so the claims in its
   comment can be looked at rather than trusted.

     line 1  a pre-migration-0015 line — the purple photo was captured but the
             variant name never was. It must STILL be purple; resolving from
             the slug alone would put a black HMD in someone's receipt.
     line 2  nothing captured, so the catalogue answers from slug + variant.
     line 3  a discontinued product the catalogue no longer knows, whose photo
             has no prebuilt thumbnail either. The stored path is used exactly
             as it is — heavy, but it is the only record left of what was
             bought, and a receipt with a missing picture is worse.
*/
function legacyPayment(locale: string): PaymentRow {
  const p = samplePayment(locale);
  return {
    ...p,
    reference: "THB-2401-0007",
    lines: [
      { ...p.lines[0], variant: null, image: "/images/hmd-op-purple.png" },
      { ...p.lines[1], image: null },
      {
        slug: "bowl-discontinued", name: "Tactical Prototype (2024)", qty: 1,
        unit_eur: 18, unit_uah: 700,
        colour: null, material: "Clay", addons: null,
        variant: null, lid: false, rubber: false, timer: false,
        weight_g: 300, image: "/images/bowl-livanka-2.jpg",
      },
    ],
  };
}

export type TransactionalKind =
  | "order"
  | "order-legacy"
  | "shipping"
  | "shipping-ukrposhta"
  | "wholesale"
  | "wholesale-register"
  | "wholesale-approved"
  | "wholesale-declined"
  | "wholesale-request"
  | "wholesale-staff"
  | "wholesale-staff-enquiry"
  | "wholesale-staff-application"
  | "followup";

export const TRANSACTIONAL_KINDS: TransactionalKind[] = [
  "order",
  "order-legacy",
  "shipping",
  "shipping-ukrposhta",
  "wholesale",
  "wholesale-register",
  "wholesale-approved",
  "wholesale-declined",
  "wholesale-request",
  "wholesale-staff",
  "wholesale-staff-enquiry",
  "wholesale-staff-application",
  "followup",
];

/* A submitted request on the SHOP book, priced by the same function the
   portal uses. To preview the unpriced state a partner with no book sees,
   point priced() at a slug the books do not carry — every line then reads
   "quote on request" and the total disappears. */
function sampleRequest(locale: string): WholesaleRequest {
  return {
    id: "preview",
    reference: "WH-69V9CP",
    partnerId: "preview",
    company: "Arc Ltd",
    email: "partner@example.com",
    phone: "+380 66 707 33 07",
    locale,
    /* Priced from the SHOP book AT RENDER TIME, not typed out here. These
       figures were hand-copied once and went stale the day OP was split by
       colour — the preview then showed a euro total the portal would never
       quote, which is the one thing a preview must not do. */
    partnerType: "shop",
    currency: locale === "uk" ? "UAH" : "EUR",
    note: "PO-4471 — please confirm lead time on the wind covers.",
    status: "submitted",
    createdAt: "2026-08-25T14:54:00.000Z",
    ...priced(SAMPLE_LINES),
  };
}

/* Deliberately mixed: an HMD with both add-ons, a colour with one, a bare
   bowl, and a wind cover with its timer — so the preview shows every way a
   line can read. */
const SAMPLE_LINES = [
  { productSlug: "hmd-tct-classic", sku: "hmd-tct-classic", variant: null,
    addons: { lid: true, rubber: true, timer: false },
    optionsLabel: "With Lid 9E418 + With FEAR 9E418",
    name: "HMD TCT Classic", qty: 5 },
  { productSlug: "hmd-tct-op", sku: "hmd-tct-op__purple", variant: "Purple",
    addons: { lid: true, rubber: false, timer: false },
    optionsLabel: "With Lid 9E418",
    name: "HMD TCT OP — Purple", qty: 2 },
  { productSlug: "bowl-livanka", sku: "bowl-livanka", variant: null,
    addons: { lid: false, rubber: false, timer: false }, optionsLabel: null,
    name: "Tactical Livanka", qty: 3 },
  { productSlug: "windcover-detonator", sku: "windcover-detonator", variant: null,
    addons: { lid: false, rubber: false, timer: true },
    optionsLabel: "With Timer",
    name: "Windcover Detonator", qty: 25 },
];

/** The same sum the portal does, on the same book, so the preview cannot lie. */
function priced(lines: typeof SAMPLE_LINES): Pick<
  WholesaleRequest,
  "items" | "itemCount" | "subtotalEur" | "subtotalUah"
> {
  const items = lines.map((l) => {
    const unit = unitPrice("shop", l.productSlug, l.addons, l.variant);
    return {
      ...l,
      unitPriceEur: unit?.eur ?? null,
      unitPriceUah: unit?.uah ?? null,
      lineTotalEur: unit ? Math.round(unit.eur * l.qty * 100) / 100 : null,
      lineTotalUah: unit ? unit.uah * l.qty : null,
    };
  });
  return {
    items,
    itemCount: items.reduce((n, i) => n + i.qty, 0),
    subtotalEur: Math.round(items.reduce((n, i) => n + (i.lineTotalEur ?? 0), 0) * 100) / 100,
    subtotalUah: items.reduce((n, i) => n + (i.lineTotalUah ?? 0), 0),
  };
}

export function renderTransactional(
  kind: TransactionalKind,
  locale: string
): { subject: string; html: string; text: string } {
  switch (kind) {
    case "order":
      return buildOrderEmail(samplePayment(locale), SITE);

    case "order-legacy":
      return buildOrderEmail(legacyPayment(locale), SITE);

    case "shipping":
      return buildShippedEmail({
        reference: "THB-2608-0142",
        ttn: "20450912345678",
        locale,
        carrier: "nova_poshta",
        addressLines: [
          "Preview Customer",
          locale === "uk" ? "Київ" : "Kyiv",
          "вул. Хрещатик, 22, кв. 4",
        ],
      });

    /* The same letter for the other carrier, and it is a separate preview
       rather than a query flag because the whole point is to be able to put
       the two side by side: different tracking link, different name in the
       sentence, different word for the number, and a foreign address instead
       of a branch. Every one of those is a place it can go wrong. */
    case "shipping-ukrposhta":
      return buildShippedEmail({
        reference: "THB-2608-0143",
        ttn: "CV062216404UA",
        locale,
        carrier: "ukrposhta",
        addressLines: ["Preview Customer", "Musterstraße 12, 3", "10115 Berlin", "Germany"],
      });

    case "wholesale": {
      const r = buildWholesaleReply(locale, SITE);
      return { subject: r.subject, html: r.html, text: r.text };
    }

    case "wholesale-register": {
      const r = buildWholesaleRegistrationReply(locale, SITE);
      return { subject: r.subject, html: r.html, text: r.text };
    }

    case "wholesale-approved":
      return buildDecisionMail("approved", locale, SITE)!;

    /* Declined against a lounge, because that is the variant whose evidence
       list differs most from the generic one — see wholesale-decision-email. */
    case "wholesale-declined":
      return buildDecisionMail("rejected", locale, SITE, "Shisha Lounge / Bar")!;

    case "wholesale-request":
      return buildPartnerAckMail(sampleRequest(locale));

    /* The staff copy of the same request. Always English whatever locale is
       asked for — that is the point of it, not an oversight. */
    case "wholesale-staff":
      return buildStaffRequestMail(sampleRequest(locale));

    case "wholesale-staff-enquiry":
      return buildWholesaleEnquiryStaffMail(
        {
          name: "Marek Gazo",
          company: "Arc Ltd",
          email: "partner@example.com",
          phone: "+380 66 707 33 07",
          country: "United Kingdom",
          city: "London",
          businessType: "Distribution",
          message:
            "We stock premium shisha across 40 venues in the UK and would like to discuss trade terms and lead times.",
          locale,
        },
        SITE
      );

    case "wholesale-staff-application":
      return buildWholesaleApplicationStaffMail(
        {
          company: "Arc Ltd",
          contactName: "Marek Gazo",
          email: "partner@example.com",
          phone: "+380 66 707 33 07",
          country: "United Kingdom",
          city: "London",
          businessType: "Distribution",
          note: "Distributing across the UK and Ireland. Happy to send shop photos and our registration.",
          locale,
        },
        SITE
      );

    case "followup":
      return buildFollowUpMail({
        locale: locale === "uk" ? "uk" : "en",
        subject: locale === "uk" ? "Щодо вашого запиту" : "Following up on your enquiry",
        body:
          locale === "uk"
            ? "Доброго дня,\n\nДякуємо за інтерес до Tactical HB. Ми підготували умови для вашого обсягу і готові надіслати зразки.\n\nЯкщо зручно, скажіть, коли можна зателефонувати цього тижня.\n\nМаріо\nTactical HB"
            : "Hello,\n\nThank you for your interest in Tactical HB. We've put together terms for your volume and can send samples this week.\n\nLet me know a good time to call.\n\nMario\nTactical HB",
      });
  }
}
