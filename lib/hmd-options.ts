import { addMoney, money, type Money } from "./currency";

/* ---------------------------------------------------------------------------
   HMD material add-ons — the pricing model, independent of any UI.

   This lives in lib/ rather than inside the selector component because the
   cart has to price a line too, and pulling a React component into the cart
   just to read two numbers would be the wrong dependency.

   BOTH CURRENCIES ARE HAND-SET, as of the August 2025 repricing. They used to
   derive hryvnia from euro at the display rate, which worked while they were
   small round numbers and stopped working the moment Mario priced them
   independently: ₴220 is not 5.5 × 51.5, and ₴210 is not 4.9 × 51.5. Deriving
   either from the other would silently reprice it, so both are passed
   explicitly — the same reasoning the wind cover's timer already followed.

     Lid 9E418   €5.50 / ₴220   (repriced 7 Oct 2026; was €4.00 / ₴210)
     FEAR 9E418  €4.90 / ₴210   (was €3.50 / ₴160 — keys stayed `lid` and `rubber`, 0029, 0037)
     both        €10.40 / ₴430  (purely additive in both currencies)
--------------------------------------------------------------------------- */

export type HmdMaterial = { lid: boolean; rubber: boolean };

export const MATERIAL_PRICE: Record<keyof HmdMaterial, Money> = {
  /* Retail, set 7 Oct 2026 (Mario). The standalone LID / FEAR products read
     their price from here too, so the add-on and the loose part never differ. */
  lid: money(5.5, 220),
  rubber: money(4.9, 210),
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
