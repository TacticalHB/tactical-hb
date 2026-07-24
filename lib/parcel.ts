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
