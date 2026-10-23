import { test } from "node:test";
import assert from "node:assert/strict";
import { forExportQuote, parcelFor } from "../lib/parcel";

/* Export delivery is quoted on a parcel 13% heavier and 13% larger overall
   (Mario, 23 Oct 2026) — Ukrposhta's boxes and scales came out bigger. */

test("13% on the weight and 13% on the volume (≈4.2% a side), rounded up", () => {
  const q = forExportQuote({ weightKg: 2.5, dims: { l: 300, w: 300, h: 150 } });
  assert.equal(q.weightKg, 2.825);
  assert.deepEqual(q.dims, { l: 313, w: 313, h: 157 });
  const volume = (q.dims.l * q.dims.w * q.dims.h) / (300 * 300 * 150);
  assert.ok(volume >= 1.13 && volume < 1.15, `volume ×${volume}`);
});

test("parcelFor itself is untouched — domestic quotes and bookings use the real parcel", () => {
  const real = parcelFor([{ weightG: 2500, qty: 1, dims: { l: 300, w: 300, h: 150 } }]);
  assert.deepEqual(real.dims, { l: 300, w: 300, h: 150 });
  assert.ok(forExportQuote(real).weightKg > real.weightKg);
});
