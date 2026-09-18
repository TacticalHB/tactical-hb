import { test } from "node:test";
import assert from "node:assert/strict";
import { unitPrice } from "../lib/wholesale-prices.ts";
import { addonsFor, NO_ADDONS } from "../lib/wholesale-display.ts";
import { products } from "../lib/products.ts";

/* ---------------------------------------------------------------------------
   Add-ons on a trade line.

   THE RULE LIVES IN ONE PLACE NOW, and this is the test that it is the same
   place for everyone. addonsFor moved out of the server-only module so the
   admin's line editor could read it without a second copy; if it ever drifts
   back into two, a bowl gets offered a timer here first.
--------------------------------------------------------------------------- */

const bySlug = (slug: string) => products.find((p) => p.slug === slug)!;

test("a wind cover takes a timer and nothing else", () => {
  assert.deepEqual(addonsFor(bySlug("windcover-kh")), ["timer"]);
});

test("a bowl takes no add-ons at all", () => {
  assert.deepEqual(addonsFor(bySlug("bowl-killer")), []);
});

test("the timer's surcharge is added to the trade price, per book", () => {
  const bare = unitPrice("shop", "windcover-kh", NO_ADDONS)!;
  const withTimer = unitPrice("shop", "windcover-kh", { ...NO_ADDONS, timer: true })!;
  assert.equal(bare.eur, 14.3);
  assert.equal(withTimer.eur, 24.3, "14.30 + the 10.00 shop surcharge");
  assert.equal(withTimer.uah, bare.uah + 450);

  // And the lounge book carries its own surcharge, not the shop one.
  const lounge = unitPrice("lounge", "windcover-kh", { ...NO_ADDONS, timer: true })!;
  assert.equal(lounge.eur, 38, "19.50 + the 18.50 lounge surcharge");
});

test("an add-on the product does not take is not priced onto it", () => {
  /* sanitiseAddons is what strips these on the server; this asserts the
     pricing side cannot quietly add money for a flag that should never have
     arrived — a bowl with a timer flag still costs a bowl. */
  const plain = unitPrice("shop", "bowl-killer", NO_ADDONS)!;
  const stray = unitPrice("shop", "bowl-killer", { ...NO_ADDONS, timer: true })!;
  assert.equal(stray.eur, plain.eur + 10, "pricing adds it blindly — so the server must strip it first");
  assert.deepEqual(addonsFor(bySlug("bowl-killer")), [], "and the rule says a bowl takes none");
});
