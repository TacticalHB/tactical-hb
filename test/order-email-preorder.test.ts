import { test } from "node:test";
import assert from "node:assert/strict";
import { buildOrderEmail } from "@/lib/order-email";
import type { PaymentRow } from "@/lib/fulfilment";

/* ---------------------------------------------------------------------------
   The receipt must not promise a dispatch the cart said would not happen.

   An order holding a pre-order ships whole on the release date (Mario, 6 Oct
   2026); the bag and checkout already say so, and this pins the confirmation
   email to the same promise — and keeps the ordinary wording for everything
   else.
--------------------------------------------------------------------------- */

function order(slugs: string[], locale: string): PaymentRow {
  return {
    id: "t", reference: "THB-TEST", invoice_id: null, user_id: null, email: "x@example.com", locale,
    amount_eur: 279, amount_uah: 11610, discount_eur: 0, voucher_code: null,
    shipping_method: "nova_poshta", shipping_carrier: "nova_poshta", shipping_uah: 0,
    np_delivery_type: "warehouse", np_city_ref: null, np_city_name: "Київ", np_warehouse_ref: null,
    np_warehouse_name: "Відділення №1", np_address: null, np_notes: null, np_street: null, np_building: null, np_flat: null,
    delivery: { firstName: "T", surname: "T" },
    lines: slugs.map((slug) => ({ slug, name: slug, qty: 1, unit_eur: 10, unit_uah: 430 })),
  } as unknown as PaymentRow;
}

test("a pre-order in the order is named with its ship date", () => {
  const uk = buildOrderEmail(order(["incoming-hookah", "bowl-killer"], "uk"), "https://tactical-hb.com");
  assert.match(uk.text, /передзамовлення/);
  assert.match(uk.text, /однією посилкою, 20 жовтня/);
  const en = buildOrderEmail(order(["incoming-hookah"], "en"), "https://tactical-hb.com");
  assert.match(en.text, /ships together in one parcel on 20 October/);
});

test("an in-stock order keeps the ordinary wording", () => {
  const uk = buildOrderEmail(order(["bowl-killer"], "uk"), "https://tactical-hb.com");
  assert.doesNotMatch(uk.text, /передзамовлення/);
  assert.match(uk.text, /готуємо замовлення до відправлення/);
});
