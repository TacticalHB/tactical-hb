import { addMoney, money, type Money } from "./currency";

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
