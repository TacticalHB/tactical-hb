import { money, type Money } from "./currency";

/* ---------------------------------------------------------------------------
   Wind cover timer add-on — the pricing model, independent of any UI.

   Same shape as lib/hmd-options, and here for the same reason: the cart prices
   a line without importing a React component.

   BOTH CURRENCIES ARE HAND-SET, and that is the one real difference from the
   HMD add-ons. Those derive their hryvnia from euro at the display rate, which
   works because they are small round numbers. The timer is not a conversion of
   anything — Mario set ₴850 and €22 as retail prices, and 850 is nowhere near
   22 × 51.5. Deriving either from the other would silently reprice it, so both
   are passed explicitly.

   The matrix this produces, which is the thing to check if anything here is
   ever edited:

     wind cover, no timer     ₴850  / €23   (the catalogue price)
     timer add-on             ₴850  / €22
     wind cover with timer    ₴1700 / €45
--------------------------------------------------------------------------- */

export type WindcoverOptions = { timer: boolean };

export const TIMER_PRICE: Money = money(22, 850);

export function timerUpcharge(sel: WindcoverOptions): Money {
  return sel.timer ? TIMER_PRICE : money(0, 0);
}

/* ---------------------------------------------------------------------------
   Weight — measured, at last.

   The catalogue's 470 g was recorded on the timer version, back when that was
   the only version. Splitting the product in two left no figure for the bare
   cover, so both configurations shipped at 470 g and the timer added nothing:
   deliberately wrong in the safe direction, quoting a little high rather than
   absorbing a shortfall.

   Both numbers now exist. The bare cover is 400 g and the timer version 470 g,
   so the timer itself is the 70 g difference, and lib/products carries 400 as
   the base weight. A bare cover is no longer declared 70 g heavier than it is.
--------------------------------------------------------------------------- */

export const TIMER_WEIGHT_G = 70;

export function timerWeightG(sel: WindcoverOptions): number {
  return sel.timer ? TIMER_WEIGHT_G : 0;
}
