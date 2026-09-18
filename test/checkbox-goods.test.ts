import { test } from "node:test";
import assert from "node:assert/strict";
import { buildGoods, assertBalanced, type FiscalOrder } from "../lib/checkbox-goods.ts";

/* ---------------------------------------------------------------------------
   The receipt's arithmetic.

   WHY THIS IS THE ONE THING WITH A TEST. Everything else in the fiscal path
   fails loudly: a bad credential is a 403, an unmapped product refuses to
   fiscalise, a wrong quantity convention is rejected by Checkbox outright. The
   sums are the only part that can be wrong QUIETLY — a receipt that balances
   to the kopiyka while distributing money across the wrong lines is accepted,
   filed with the tax authority, and emailed to the customer, and nothing
   anywhere says a word.

   Run with:  node --test test/
   No framework and no dependency: Node 24 executes TypeScript directly, and
   lib/checkbox-goods.ts was split out of lib/checkbox.ts precisely so it could
   be imported without `server-only` and a demand for credentials.

   THE FIGURES ARE THE REAL CATALOGUE. €25 / ₴950 is HMD A.Craft as priced on
   18 September 2026; ₴430 is the Killer bowl. A test written against 100 and
   200 would pass against arithmetic that could never survive the shop's own
   numbers.
--------------------------------------------------------------------------- */

const UAH_PER_EUR_FIXED = 51;
const kop = (uah: number) => Math.round(uah * 100);

function order(lines: FiscalOrder["lines"], amountKop: number): FiscalOrder {
  return { reference: "TCT-TEST01", amountKop, lines, email: null };
}

/** What the receipt actually says: unit price in kopiyky × units. */
function readBack(goods: ReturnType<typeof buildGoods>) {
  return goods.map((g) => {
    const good = g.good as { code: string; price: number };
    return { code: good.code, price: good.price, units: (g.quantity as number) / 1000 };
  });
}

const total = (goods: ReturnType<typeof buildGoods>) =>
  readBack(goods).reduce((s, r) => s + r.price * r.units, 0);

test("a domestic order with no shipping needs no absorption at all", () => {
  const lines = [{ code: "A", name: "A.Craft", qty: 1, unitKop: kop(900) }];
  const goods = buildGoods(order(lines, kop(900)));
  assert.equal(goods.length, 1);
  assert.deepEqual(readBack(goods), [{ code: "A", price: kop(900), units: 1 }]);
  assertBalanced(goods, kop(900));
});

test("shipping is spread across every unit, not dropped on one line", () => {
  // Two products, one unit each, ₴70 of shipping to absorb.
  const lines = [
    { code: "A", name: "A.Craft", qty: 1, unitKop: kop(950) },
    { code: "K", name: "Killer", qty: 1, unitKop: kop(430) },
  ];
  const charged = kop(950 + 430 + 70);
  const goods = buildGoods(order(lines, charged));
  const rows = readBack(goods);

  // ₴70 over two units is ₴35 each — and the point of the change: the Killer
  // moves too. Under the old behaviour it stayed at ₴430 and A.Craft carried
  // the whole ₴70.
  assert.deepEqual(rows, [
    { code: "A", price: kop(985), units: 1 },
    { code: "K", price: kop(465), units: 1 },
  ]);
  assert.equal(total(goods), charged);
  assertBalanced(goods, charged);
});

test("a remainder that will not divide is split onto one unit, never rounded", () => {
  // ₴71 over two units: ₴35.50 each, which is 3550 kop — divides cleanly in
  // kopiyky. Use an odd number of kopiyky instead so it genuinely cannot.
  const lines = [
    { code: "A", name: "A.Craft", qty: 2, unitKop: kop(950) },
    { code: "K", name: "Killer", qty: 1, unitKop: kop(430) },
  ];
  const charged = kop(950) * 2 + kop(430) + 101; // 101 kop over 3 units
  const goods = buildGoods(order(lines, charged));

  // 33 kop per unit, 2 kop left over, which rides on one A.Craft — so A.Craft
  // appears twice and the receipt still balances exactly.
  assert.equal(total(goods), charged);
  assertBalanced(goods, charged);
  const rows = readBack(goods);
  assert.equal(rows.reduce((s, r) => s + r.units, 0), 3, "every unit still on the receipt");
  const aCraft = rows.filter((r) => r.code === "A");
  assert.equal(aCraft.length, 2, "the absorbing line is split, not rounded");
  assert.equal(aCraft[0].price, kop(950) + 33);
  assert.equal(aCraft[1].price, kop(950) + 33 + 2);
});

test("a euro order's lines come from the euro list at the fixed rate", () => {
  /* THE BUG THIS EXISTS TO CATCH. Line prices used to be taken from the
     hryvnia catalogue while the card was charged the euro list × 51. The
     receipt balanced and its lines were fiction. Here the lines are built the
     way lib/fulfilment now builds them for a non-uk storefront. */
  const aCraftEur = 25;
  const killerEur = 11;
  const lines = [
    { code: "A", name: "A.Craft", qty: 1, unitKop: Math.round(aCraftEur * UAH_PER_EUR_FIXED * 100) },
    { code: "K", name: "Killer", qty: 1, unitKop: Math.round(killerEur * UAH_PER_EUR_FIXED * 100) },
  ];
  // No shipping: the receipt should need no absorption whatsoever, which is
  // the whole proof — the lines already add up to what the card was charged.
  const charged = Math.round((aCraftEur + killerEur) * UAH_PER_EUR_FIXED * 100);
  const goods = buildGoods(order(lines, charged));

  assert.deepEqual(readBack(goods), [
    { code: "A", price: kop(1275), units: 1 },
    { code: "K", price: kop(561), units: 1 },
  ]);
  assert.equal(total(goods), charged);
  assertBalanced(goods, charged);

  // And the old behaviour, for contrast: hryvnia lines against a euro total.
  const wrong = [
    { code: "A", name: "A.Craft", qty: 1, unitKop: kop(950) },
    { code: "K", name: "Killer", qty: 1, unitKop: kop(430) },
  ];
  const stillBalances = buildGoods(order(wrong, charged));
  assert.equal(total(stillBalances), charged, "it balanced — which is why it went unnoticed");
  const k = readBack(stillBalances).find((r) => r.code === "K")!;
  assert.notEqual(k.price, kop(561), "and the Killer was nowhere near its euro price");
});

test("the balance guard refuses a receipt that does not equal the card", () => {
  const goods = buildGoods(order([{ code: "A", name: "A.Craft", qty: 1, unitKop: kop(950) }], kop(950)));
  assert.throws(() => assertBalanced(goods, kop(951)), /would not balance/);
});

test("quantities are sent in milli-units — the one convention no document states", () => {
  const goods = buildGoods(order([{ code: "A", name: "A.Craft", qty: 3, unitKop: kop(950) }], kop(2850)));
  assert.equal(goods[0].quantity, 3000, "3 items must be 3000, not 3");
});
