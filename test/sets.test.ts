import { test } from "node:test";
import assert from "node:assert/strict";
import { products, isPurchasable } from "@/lib/products";
import { priceCart } from "@/lib/pricing";
import { setFullPrice, splitSetPrice } from "@/lib/sets";

/* Black On Black (Mario, 13 Nov 2026): €287.50 / ₴11 961 for parts worth
   €319.40 / ₴13 290, never discounted again, retail only. */

const set = products.find((p) => p.slug === "black-on-black")!;
const cents = (n: number) => Math.round(n * 100);

test("the set is listed, buyable and priced as Mario set it", () => {
  assert.ok(set);
  assert.equal(set.category, "set");
  assert.equal(set.price, 287.5);
  assert.equal(set.priceUah, 11961);
  assert.ok(isPurchasable(set));
  assert.deepEqual(setFullPrice(set), { eur: 319.4, uah: 13290 });
});

test("the parts' shares add up to the set price exactly, in both currencies", () => {
  const shares = splitSetPrice(set);
  assert.equal(shares.length, 3);
  assert.equal(shares.reduce((s, x) => s + cents(x.unit.eur) * x.item.qty, 0), cents(287.5));
  assert.equal(shares.reduce((s, x) => s + x.unit.uah * x.item.qty, 0), 11961);
  for (const x of shares) assert.ok(Number.isInteger(x.unit.uah) && Number.isInteger(cents(x.unit.eur)));
});

test("priceCart sells the set as its real parts, tagged with the set", () => {
  const r = priceCart([{ slug: "black-on-black", qty: 2 }], "en");
  assert.deepEqual(r.lines.map((l) => l.slug), ["incoming-hookah", "hmd-tct-op", "bowl-killer"]);
  for (const l of r.lines) {
    assert.equal(l.qty, 2);
    assert.equal(l.set?.slug, "black-on-black");
  }
  const op = r.lines[1];
  assert.deepEqual(op.options, { variant: "Black", lid: true, rubber: true, timer: false });
  assert.equal(cents(r.subtotal.eur), cents(575));
  assert.equal(r.subtotal.uah, 23922);
});

test("no discount can come off a set, and the full-setup saving ignores its parts", () => {
  const onlySet = priceCart([{ slug: "black-on-black", qty: 1 }], "uk");
  assert.deepEqual(onlySet.discountable, { eur: 0, uah: 0 });
  assert.equal(onlySet.bundle, null);

  /* A wind cover bought beside the set is not "a full setup" with the set's
     bowl and device — those are already reduced. */
  const withCover = priceCart([{ slug: "black-on-black", qty: 1 }, { slug: "windcover-kh", qty: 1 }], "uk");
  assert.equal(withCover.bundle, null);
  assert.equal(withCover.discountable.uah, 850);
});

test("the trade side never sees a set", async () => {
  const { retailRows } = await import("@/lib/retail-reference");
  assert.ok(!retailRows().some((r) => r.key.startsWith("black-on-black")));
});

test("the order email shows the set as one row at the set price", async () => {
  const { buildOrderEmail } = await import("@/lib/order-email");
  const priced = priceCart([{ slug: "black-on-black", qty: 1 }, { slug: "bowl-livanka", qty: 1 }], "uk");
  const row = {
    id: "t", reference: "THB-SET", invoice_id: null, user_id: null, email: "x@example.com", locale: "uk",
    amount_eur: priced.subtotal.eur, amount_uah: priced.subtotal.uah, discount_eur: 0, voucher_code: null,
    shipping_method: "nova_poshta", shipping_carrier: "nova_poshta", shipping_uah: 0,
    np_delivery_type: "warehouse", np_city_ref: null, np_city_name: "Київ", np_warehouse_ref: null,
    np_warehouse_name: "Відділення №1", np_address: null, np_notes: null, np_street: null, np_building: null, np_flat: null,
    delivery: { firstName: "T", surname: "T" },
    lines: priced.lines.map((l) => ({
      slug: l.slug, name: l.name, qty: l.qty, unit_eur: l.unit.eur, unit_uah: l.unit.uah,
      variant: l.options.variant, lid: l.options.lid, rubber: l.options.rubber,
      set_slug: l.set?.slug ?? null, set_name: l.set?.name ?? null,
    })),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mail = buildOrderEmail(row as any, "https://tactical-hb.com");
  assert.match(mail.text, /1 × Black On Black — ₴11\s?961/);
  assert.match(mail.text, /1 × Tactical Livanka — ₴390/);
  assert.doesNotMatch(mail.text, /× Project KI 06/);
  // No invented "setup saving" row: the lines add up to what was charged.
  assert.match(mail.text, /₴12\s?351/);
});
