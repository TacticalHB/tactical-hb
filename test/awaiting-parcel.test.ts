import { test } from "node:test";
import assert from "node:assert/strict";
import { awaitingParcel } from "@/lib/orders-display";
import type { AdminOrder } from "@/lib/orders-display";

/* ---------------------------------------------------------------------------
   The Ukrposhta dispatch queue.

   WHY THIS IS TESTED AND THE PAGE AROUND IT IS NOT. /admin/orders needs an
   admin session to render, so the queue's shape cannot be checked by looking
   at it. The rule that decides membership can be, and it is the part with a
   decision in it: everything else on that page is a link and a count.

   The stakes are asymmetric and the test is written to match. A false positive
   is a row somebody glances at; a false negative is a parcel nobody buys and a
   customer who waits for it.
--------------------------------------------------------------------------- */

/* Only the three fields the rule reads. The cast keeps the fixture honest
   about that: a helper that invented a whole AdminOrder would quietly assert
   the rule depends on fields it does not look at. */
function order(over: Partial<AdminOrder> = {}): AdminOrder {
  return {
    carrier: "ukrposhta",
    ukrposhtaBarcode: null,
    status: "paid",
    ...over,
  } as AdminOrder;
}

test("a paid Ukrposhta order with no barcode is waiting for a parcel", () => {
  assert.equal(awaitingParcel(order()), true);
});

test("a barcode means the parcel exists, whatever the status says", () => {
  /* Saving a barcode calls markProcessing, so `processing` alone cannot answer
     this — an order moved there by hand reads the same. */
  assert.equal(awaitingParcel(order({ status: "processing", ukrposhtaBarcode: "CV123456789UA" })), false);
  assert.equal(awaitingParcel(order({ status: "processing" })), true);
});

test("Nova Poshta orders are never in this queue", () => {
  assert.equal(awaitingParcel(order({ carrier: "nova_poshta" })), false);
  assert.equal(awaitingParcel(order({ carrier: null })), false);
});

test("terminal states need no parcel", () => {
  for (const status of ["shipped", "delivered", "cancelled"]) {
    assert.equal(awaitingParcel(order({ status })), false, `${status} should not be queued`);
  }
});

test("an unknown status stays IN the queue rather than vanishing from it", () => {
  /* The asymmetry this whole rule is built around: a status nobody has heard
     of must show up for a human, not be quietly filtered out of the one list
     that decides whether a parcel gets bought. */
  assert.equal(awaitingParcel(order({ status: "awaiting_refund_review" })), true);
  assert.equal(awaitingParcel(order({ status: "" })), true);
});
