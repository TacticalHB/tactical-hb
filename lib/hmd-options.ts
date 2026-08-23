import { addMoney, money, type Money } from "./currency";
import type { Product } from "./products";

/* ---------------------------------------------------------------------------
   HMD material add-ons — the pricing model, independent of any UI.

   This lives in lib/ rather than inside the selector component because the
   cart has to price a line too, and pulling a React component into the cart
   just to read two numbers would be the wrong dependency.

   Upcharges derive from EUR at the display rate (see ./currency), so both
   currencies stay in step if the rate moves:
     lid    €4.00 → ₴206
     rubber €2.50 → ₴129
     both   €6.50 → ₴335   (purely additive in both currencies)
--------------------------------------------------------------------------- */

export type HmdMaterial = { lid: boolean; rubber: boolean };

/**
 * What the configurator opens with for a given device.
 *
 * ONE ANSWER FOR EVERY SURFACE. The product page and the kit builder both open
 * a device with add-ons pre-ticked, and they have to pre-tick the SAME ones or
 * the same device costs two different amounts depending on which screen the
 * customer used. The Classic is quoted bare, so it opens bare in both.
 *
 * The import above is type-only and erased at build time, so this does not put
 * the catalogue into the pricing module's runtime graph.
 */
export function defaultMaterial(product: Pick<Product, "addonDefaults">): HmdMaterial {
  return product.addonDefaults ?? { lid: true, rubber: true };
}

export const MATERIAL_PRICE: Record<keyof HmdMaterial, Money> = {
  lid: money(4),
  rubber: money(2.5),
};

export function materialUpcharge(sel: HmdMaterial): Money {
  let total = money(0, 0);
  if (sel.lid) total = addMoney(total, MATERIAL_PRICE.lid);
  if (sel.rubber) total = addMoney(total, MATERIAL_PRICE.rubber);
  return total;
}

/* ---------------------------------------------------------------------------
   How much the add-ons weigh — the shipping counterpart of the pricing above.

   The lid takes an HMD from 125 g to 155 g (the two weights on the spec sheet),
   so it adds 30 g. The rubber ring is a few grams at most; treated as zero
   rather than pretending to a precision the scale never gave us.
--------------------------------------------------------------------------- */

export const LID_WEIGHT_G = 30;

export function materialWeightG(sel: HmdMaterial): number {
  return sel.lid ? LID_WEIGHT_G : 0;
}
