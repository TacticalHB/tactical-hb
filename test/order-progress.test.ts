import { test } from "node:test";
import assert from "node:assert/strict";
import { orderProgress, sortByAttention, toOrder } from "../lib/orders-display";

/* The progress line (21 Oct 2026): green fills in step by step, the next step
   is orange, and a card turns red only when a human is the way forward. */

const NOW = Date.parse("2026-10-21T12:00:00Z");
const HOUR = 3600 * 1000;

function order(row: Record<string, unknown>) {
  return toOrder({ id: "o1", external_ref: "TCT-TEST01", created_at: new Date(NOW - 2 * HOUR).toISOString(), status: "paid", ...row });
}
const states = (o: ReturnType<typeof order>) => orderProgress(o, "en", NOW).steps.map((s) => s.state);

test("a fresh paid order: Paid is green at once, Packed is the orange step", () => {
  const o = order({ shipping_carrier: "nova_poshta", shipping_method: "nova_poshta" });
  assert.deepEqual(states(o), ["done", "current", "todo", "todo"]);
  const p = orderProgress(o, "en", NOW);
  assert.equal(p.tone, "progress");
  assert.equal(p.steps[1].note, "needs waybill");
});

test("each step turns green as it happens", () => {
  assert.deepEqual(states(order({ status: "processing", np_ttn: "20451557996618" })), ["done", "done", "current", "todo"]);
  assert.deepEqual(states(order({ status: "shipped", np_ttn: "20451557996618" })), ["done", "done", "done", "current"]);
  const delivered = order({ status: "delivered", np_ttn: "20451557996618" });
  assert.deepEqual(states(delivered), ["done", "done", "done", "done"]);
  assert.equal(orderProgress(delivered, "en", NOW).tone, "done");
});

test("a waybill Nova Poshta deleted is red at Packed", () => {
  const o = order({ status: "processing", np_ttn: "20451557996618", np_status_code: "2" });
  const p = orderProgress(o, "en", NOW);
  assert.equal(p.tone, "problem");
  assert.deepEqual(p.steps.map((s) => s.state), ["done", "problem", "todo", "todo"]);
  assert.equal(p.steps[1].note, "waybill deleted");
});

test("paid two days ago with no parcel is red; an Ukrposhta order asks for a barcode", () => {
  const o = order({ created_at: new Date(NOW - 50 * HOUR).toISOString(), shipping_carrier: "ukrposhta" });
  const p = orderProgress(o, "en", NOW);
  assert.equal(p.tone, "problem");
  assert.match(p.steps[1].note ?? "", /needs barcode/);
});

test("an Ukrposhta barcode on a 'Nova Poshta' order counts as packed, not as a missing waybill", () => {
  const o = order({ status: "processing", shipping_carrier: "nova_poshta", ukrposhta_barcode: "CV062216404UA" });
  assert.deepEqual(states(o), ["done", "done", "current", "todo"]);
});

test("packed five days ago and never scanned is red", () => {
  const o = order({ status: "processing", np_ttn: "20451557996618", packed_at: new Date(NOW - 6 * 24 * HOUR).toISOString() });
  assert.equal(orderProgress(o, "en", NOW).tone, "problem");
});

test("the list puts red first and finished orders last", () => {
  const red = order({ id: "red", status: "processing", np_ttn: "1", np_status_code: "2" });
  const moving = order({ id: "moving", status: "shipped", np_ttn: "2" });
  const done = order({ id: "done", status: "delivered", np_ttn: "3" });
  assert.deepEqual(sortByAttention([done, moving, red], "en", NOW).map((o) => o.id), ["red", "moving", "done"]);
});
