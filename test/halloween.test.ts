import { test } from "node:test";
import assert from "node:assert/strict";
import {
  HALLOWEEN_START,
  HALLOWEEN_END,
  BEFORE_HALLOWEEN,
  halloweenActive,
  halloweenMoney,
  onHalloweenSale,
  settleHalloween,
} from "../lib/halloween";
import { priceCart } from "../lib/pricing";
import { money } from "../lib/currency";

/* Halloween sale, 31 Oct 2026 (Mario): 20% off everything but the hookah,
   whole day in Kyiv, no double discounts — whichever is bigger. */

const DURING = HALLOWEEN_START + 3600_000;

test("the window is 31 October in Kyiv (UTC+2), and nothing either side", () => {
  assert.equal(new Date(HALLOWEEN_START).toISOString(), "2026-10-30T22:00:00.000Z");
  assert.equal(new Date(HALLOWEEN_END).toISOString(), "2026-10-31T22:00:00.000Z");
  assert.equal(halloweenActive(HALLOWEEN_START - 1), false);
  assert.equal(halloweenActive(HALLOWEEN_START), true);
  assert.equal(halloweenActive(HALLOWEEN_END - 1), true);
  assert.equal(halloweenActive(HALLOWEEN_END), false);
});

test("20% off, cents for the euro and whole hryvnia — Mario's HMD example", () => {
  assert.deepEqual(halloweenMoney(money(23, 850)), { eur: 18.4, uah: 680 });
});

test("the hookah is never on sale", () => {
  assert.equal(onHalloweenSale("hookah", DURING), false);
  assert.equal(onHalloweenSale("hmd", DURING), true);
  assert.equal(onHalloweenSale("hmd", BEFORE_HALLOWEEN), false);
});

test("priceCart charges the sale price on the day and the regular price otherwise", () => {
  const cart = [{ slug: "hmd-tct-classic", qty: 2 }];
  assert.deepEqual(priceCart(cart, "en", DURING).subtotal, { eur: 36.8, uah: 1360 });
  assert.deepEqual(priceCart(cart, "en", BEFORE_HALLOWEEN).subtotal, { eur: 46, uah: 1700 });
});

test("codes may only come off what is not on sale", () => {
  const onlySale = priceCart([{ slug: "hmd-tct-classic", qty: 1 }], "en", DURING);
  assert.equal(onlySale.discountable.eur, 0);
  const withHookah = priceCart([{ slug: "hmd-tct-classic", qty: 1 }, { slug: "incoming-hookah", qty: 1 }], "en", DURING);
  assert.equal(withHookah.discountable.eur, 268);
  const normalDay = priceCart([{ slug: "hmd-tct-classic", qty: 1 }], "en", BEFORE_HALLOWEEN);
  assert.equal(normalDay.discountable.eur, normalDay.subtotal.eur);
});

test("whichever is bigger: a 20% gift code on sale items loses (tie keeps the sale, code unspent)", () => {
  const cart = [{ slug: "hmd-tct-classic", qty: 1 }];
  const r = settleHalloween({
    sale: priceCart(cart, "en", DURING),
    regular: priceCart(cart, "en", BEFORE_HALLOWEEN),
    code: { kind: "percent", percent: 20 },
    rankRate: 0,
    locale: "en",
  });
  assert.equal(r.regular, false);
  assert.equal(r.source, "none");
});

test("whichever is bigger: a €10 voucher on a €23 HMD beats the €4.60 sale saving", () => {
  const cart = [{ slug: "hmd-tct-classic", qty: 1 }];
  const r = settleHalloween({
    sale: priceCart(cart, "en", DURING),
    regular: priceCart(cart, "en", BEFORE_HALLOWEEN),
    code: { kind: "amount", amountEur: 10, minOrderEur: 0 },
    rankRate: 0,
    locale: "en",
  });
  assert.equal(r.regular, true);
  assert.equal(r.source, "voucher");
  assert.equal(r.amount.eur, 10);
});

test("a gift code still works on the hookah during the sale", () => {
  const cart = [{ slug: "hmd-tct-classic", qty: 1 }, { slug: "incoming-hookah", qty: 1 }];
  const r = settleHalloween({
    sale: priceCart(cart, "en", DURING),
    regular: priceCart(cart, "en", BEFORE_HALLOWEEN),
    code: { kind: "percent", percent: 15 },
    rankRate: 0,
    locale: "en",
  });
  assert.equal(r.regular, false);
  assert.equal(r.source, "voucher");
  assert.equal(r.amount.eur, 40.2); // 15% of €268, the HMD keeps its 20%
});
