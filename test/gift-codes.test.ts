import { test } from "node:test";
import assert from "node:assert/strict";
import { isGiftCodeShape } from "../lib/gift-codes";
import { permanentDiscount, chooseDiscount } from "../lib/loyalty/ranks";

test("gift code shape: GIFT + percent + six hex characters", () => {
  assert.ok(isGiftCodeShape("GIFT20-7F3A9C"));
  assert.ok(isGiftCodeShape(" gift15-0b12e4 "));
  assert.ok(!isGiftCodeShape("TCT-ABCDEFGH")); // a loyalty voucher is not a gift code
  assert.ok(!isGiftCodeShape("GIFT20-7F3A9"));
});

test("a 20% gift code takes 20% off the goods, delivery untouched", () => {
  const goods = { eur: 46.4, uah: 2366 };
  const off = permanentDiscount(20 / 100, goods);
  assert.deepEqual(off, { eur: 9.28, uah: 473 });
});

test("a gift code competes with the rank perk like any voucher: the bigger wins", () => {
  const goods = { eur: 100, uah: 5100 };
  const gift = permanentDiscount(0.15, goods);
  const rank = permanentDiscount(0.05, goods);
  assert.equal(chooseDiscount(gift, rank).source, "voucher");
});
