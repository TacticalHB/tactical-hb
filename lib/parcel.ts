/* ---------------------------------------------------------------------------
   The physical parcel a cart adds up to — weight and a representative box.

   Pure and dependency-light on purpose: the shipping quote, the invoice, and
   the waybill all need the same number, and they must agree to the hryvnia, so
   it is computed in exactly one place.

   CHARGEABLE WEIGHT. Nova Poshta bills the greater of the real weight and the
   volumetric weight (a big light parcel is charged as if it were heavier). Our
   bowls and heat devices are dense — their real weight wins — but the wind
   cover is bulky enough that its volume decides. Quoting the real weight there
   would under-charge, so we take the max and hand the SAME figure to the quote
   and the waybill; that is what keeps the checkout price and the cabinet charge
   identical.
--------------------------------------------------------------------------- */

export type Dims = { l: number; w: number; h: number };

export type ParcelLine = { weightG: number; dims: Dims; qty: number };

export type Parcel = { weightKg: number; dims: Dims };

/** Nova Poshta's volumetric coefficient: 1 m³ is billed as 250 kg. */
const VOLUMETRIC_KG_PER_M3 = 250;

/** Nova Poshta's floor for a documented parcel. */
const MIN_WEIGHT_KG = 0.1;

/** Fallback box when a cart somehow reaches here empty (it shouldn't). */
const FALLBACK: Parcel = { weightKg: 0.5, dims: { l: 200, w: 150, h: 100 } };

function volumeMm3(d: Dims): number {
  return d.l * d.w * d.h;
}

function volumetricKg(d: Dims): number {
  // mm³ → m³ is 1e-9.
  return volumeMm3(d) * 1e-9 * VOLUMETRIC_KG_PER_M3;
}

/**
 * Reduce cart lines to one parcel.
 *
 * Real weight is summed (it is additive); the representative box is the single
 * largest item, which is the right call for this shop's small orders. It can
 * under-state volume only for several bulky-but-light items at once — and there
 * the summed real weight already dominates, so the charge stays correct.
 */
export function parcelFor(lines: ParcelLine[]): Parcel {
  const usable = lines.filter((l) => l.qty > 0 && l.weightG > 0);
  if (usable.length === 0) return FALLBACK;

  const actualKg = usable.reduce((s, l) => s + (l.weightG * l.qty) / 1000, 0);

  const dims = usable.reduce((biggest, l) => (volumeMm3(l.dims) > volumeMm3(biggest) ? l.dims : biggest), usable[0].dims);

  const weightKg = Math.max(actualKg, volumetricKg(dims), MIN_WEIGHT_KG);

  // Round to grams — Nova Poshta accepts up to three decimals of a kilo.
  return { weightKg: Math.round(weightKg * 1000) / 1000, dims };
}

/* ---------------------------------------------------------------------------
   EXPORT QUOTING MARGIN (Mario, 23 Oct 2026).

   Abroad, the shop was paying the difference out of pocket: Ukrposhta's
   counter boxes come out bigger than our catalogue dimensions, and its scales
   read heavier. So every EXPORT delivery quote is asked for a parcel 13%
   heavier and 13% larger OVERALL than the catalogue says — 13% more volume,
   which is about 4.2% on each side (Mario: "13% overall, not each side").

   QUOTING ONLY. The customer sees one delivery figure, as always; nothing
   else uses this — not the domestic Nova Poshta quote, not the customs
   declaration, not a shipment booking (lib/order-ukrposhta books the real
   parcel). The site's delivery copy says only that the cost depends on
   destination, weight and service and is calculated at checkout, which stays
   true.

   ONE FUNCTION, TWO CALLERS: the checkout's quote (/api/shipping/quote) and
   the invoice's re-quote (create-invoice) both go through here, so the price
   shown and the price charged cannot drift apart.

--------------------------------------------------------------------------- */
export const EXPORT_PARCEL_MARGIN = 1.13;
/** Per side, so the box's VOLUME grows by the margin: ∛1.13 ≈ 1.0416. */
const EXPORT_SIDE_FACTOR = Math.cbrt(EXPORT_PARCEL_MARGIN);

export function forExportQuote(p: Parcel): Parcel {
  const m = EXPORT_PARCEL_MARGIN;
  const s = EXPORT_SIDE_FACTOR;
  // Rounded UP (to the gram and the millimetre): the margin exists so the shop
  // is never short, and 150 × 1.13 is 169.4999… in floating point.
  const up = (x: number) => Math.ceil(x - 1e-9);
  return {
    weightKg: up(p.weightKg * m * 1000) / 1000,
    dims: { l: up(p.dims.l * s), w: up(p.dims.w * s), h: up(p.dims.h * s) },
  };
}
