import "server-only";
import { buildOrderEmail } from "@/lib/order-email";
import { buildShippedEmail } from "@/lib/shipping-email";
import { buildWholesaleReply } from "@/lib/wholesale-email";
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
    amount_eur: 132.5,
    amount_uah: 6758,
    discount_eur: 10,
    voucher_code: "MILESTONE-10",
    shipping_method: "nova_poshta",
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
        addons: locale === "uk" ? "З кришкою" : "With Lid",
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

export type TransactionalKind = "order" | "shipping" | "wholesale" | "followup";

export const TRANSACTIONAL_KINDS: TransactionalKind[] = [
  "order",
  "shipping",
  "wholesale",
  "followup",
];

export function renderTransactional(
  kind: TransactionalKind,
  locale: string
): { subject: string; html: string; text: string } {
  switch (kind) {
    case "order":
      return buildOrderEmail(samplePayment(locale), SITE);

    case "shipping":
      return buildShippedEmail({
        reference: "THB-2608-0142",
        ttn: "20450912345678",
        locale,
        addressLines: [
          "Preview Customer",
          locale === "uk" ? "Київ" : "Kyiv",
          "вул. Хрещатик, 22, кв. 4",
        ],
      });

    case "wholesale": {
      const r = buildWholesaleReply(locale, SITE);
      return { subject: r.subject, html: r.html, text: r.text };
    }

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
