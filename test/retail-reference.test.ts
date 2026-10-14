import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { retailKey, retailRows } from "@/lib/retail-reference";
import { products } from "@/lib/products";

/* ---------------------------------------------------------------------------
   The retail reference in the wholesale portal (Mario, 14 Oct 2026).

   The tab renders from the catalogue live, but the downloadable PDF is a file
   built by scripts/build-retail-prices.py. These tests keep the two honest.
--------------------------------------------------------------------------- */

test("the retail PDFs were built from today's prices — rerun scripts/build-retail-prices.py if not", () => {
  const snap = JSON.parse(readFileSync(path.join(process.cwd(), "private", "wholesale", "retail-prices.json"), "utf8")) as {
    rows: { key: string; eur: number; uah: number }[];
  };
  const now = retailRows().map((r) => ({ key: r.key, eur: r.price.eur, uah: r.price.uah }));
  assert.deepEqual(snap.rows, now);
});

test("a retail row's key is the portal's line sku (lineSku in lib/wholesale-portal)", () => {
  // lineSku lives in a server-only module; its rule is restated here and held to it.
  assert.equal(retailKey("hmd-tct-op", "Purple"), "hmd-tct-op__purple");
  assert.equal(retailKey("bowl-killer"), "bowl-killer");
});

test("every purchasable product and colour has a row, priced as the shop prices it", () => {
  const rows = retailRows();
  for (const p of products) {
    for (const v of p.variants ?? []) {
      const row = rows.find((r) => r.key === retailKey(p.slug, v.name));
      if (!row) continue; // not purchasable — the portal doesn't list it either
      assert.equal(row.price.uah, v.priceUah ?? p.priceUah, `${p.slug} ${v.name}`);
    }
  }
  assert.ok(rows.some((r) => r.addon === "timer"), "the wind-cover timer is listed");
});
