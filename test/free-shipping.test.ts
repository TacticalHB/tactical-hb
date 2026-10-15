import { test } from "node:test";
import assert from "node:assert/strict";
import { FREE_SHIPPING_UAH, freeShippingApplies, toFreeShipping } from "@/lib/free-shipping";

/* Free delivery inside Ukraine from ₴5 000 — Ukrainian storefront only
   (Mario, 15 Oct 2026). */

test("₴5 000 and over ships free on /uk; under it does not", () => {
  assert.equal(FREE_SHIPPING_UAH, 5000);
  assert.equal(freeShippingApplies("uk", 5000), true);
  assert.equal(freeShippingApplies("uk", 7200), true);
  assert.equal(freeShippingApplies("uk", 4999), false);
});

test("never on the other storefronts, whatever the basket", () => {
  for (const l of ["en", "ja", "ar"]) {
    assert.equal(freeShippingApplies(l, 100000), false, l);
    assert.equal(toFreeShipping(l, 100), null, l);
  }
});

test("the amount left is the gap to ₴5 000, never negative — Mario's example", () => {
  assert.equal(toFreeShipping("uk", 3900), 1100);
  assert.equal(toFreeShipping("uk", 5000), 0);
  assert.equal(toFreeShipping("uk", 6400), 0);
});
