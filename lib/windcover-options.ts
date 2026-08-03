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
   Weight. TODO: weigh a cover with and without the timer.

   The catalogue's 470 g was measured on the timer version — it was the only
   version when it was recorded. Splitting the product in two leaves no figure
   for the bare cover, so both configurations still ship at 470 g and the timer
   adds nothing on top.

   That over-states the bare cover rather than under-stating it, which is the
   right way round to be wrong: a shipping quote comes out a little high instead
   of the shop absorbing a shortfall. Replace with real numbers when there are
   some.
--------------------------------------------------------------------------- */

export const TIMER_WEIGHT_G = 0;

export function timerWeightG(sel: WindcoverOptions): number {
  return sel.timer ? TIMER_WEIGHT_G : 0;
}
