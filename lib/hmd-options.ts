import { addMoney, money, type Money } from "./currency";

/* ---------------------------------------------------------------------------
   HMD material add-ons — the pricing model, independent of any UI.

   This lives in lib/ rather than inside the selector component because the
   cart has to price a line too, and pulling a React component into the cart
   just to read two numbers would be the wrong dependency.

   BOTH CURRENCIES ARE HAND-SET, as of the August 2025 repricing. They used to
   derive hryvnia from euro at the display rate, which worked while they were
   small round numbers and stopped working the moment Mario priced them
   independently: ₴210 is not 4 × 51.5, and ₴160 is not 3.5 × 51.5. Deriving
   either from the other would silently reprice it, so both are passed
   explicitly — the same reasoning the wind cover's timer already followed.

     lid    €4.00 / ₴210
     rubber €3.50 / ₴160     (FEAR 9E418 — the key stayed `rubber`, see 0029)
     both   €7.50 / ₴370     (purely additive in both currencies)
--------------------------------------------------------------------------- */

export type HmdMaterial = { lid: boolean; rubber: boolean };

export const MATERIAL_PRICE: Record<keyof HmdMaterial, Money> = {
  lid: money(4, 210),
  rubber: money(3.5, 160),
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
