import { TIMER_PRICE } from "./windcover-options";
import type { Money } from "./currency";

/* ---------------------------------------------------------------------------
   The add-ons that are ONLY add-ons — which, since the lid and the ring became
   products, means the wind cover's timer alone.

   WHAT THIS FILE IS FOR. An option that a customer might search for by name but
   which has no page of its own: enough to render a card and answer a search,
   and deliberately not enough to add to a basket. The card sends the customer
   to the product where the option is actually chosen.

   WHY THE LID AND THE RING LEFT. They became packaged goods with a QR code on
   the pouch, and a code that opens a heat device is a broken shop. They are
   real entries in lib/products now, with their own routes, and they are still
   selectable as options on an HMD — the second door did not close the first.
   Anything reaching for them here should reach for the catalogue instead.

   THE TIMER STAYS because none of that is true of it: it is not packaged, it
   carries no code, and nobody has asked to sell it alone. If that changes it
   should graduate the same way, not be special-cased here.

   Prices are READ from the pricing modules rather than restated, so a card can
   never quote a figure the cart disagrees with.
--------------------------------------------------------------------------- */

export type Addon = {
  key: "timer";
  nameEn: string;
  nameUk: string;
  /** Extra search terms. Never rendered — see the rubber entry. */
  aliases?: string[];
  /** One line under the name, in the grid's usual tagline slot. */
  taglineEn: string;
  taglineUk: string;
  price: Money;
  /** The product page where this option is selected. */
  parentSlug: string;
  parentEn: string;
  parentUk: string;
};

export const ADDONS: Addon[] = [
  {
    key: "timer",
    nameEn: "Timer",
    nameUk: "Таймер",
    taglineEn: "Rechargeable wind cover timer.",
    taglineUk: "Перезаряджуваний таймер для ковпака.",
    price: TIMER_PRICE,
    parentSlug: "windcover-detonator",
    parentEn: "Choose it on a wind cover",
    parentUk: "Обирається на сторінці ковпака",
  },
];

/** Matches an add-on against a search term, in either language. */
export function searchAddons(query: string): Addon[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return ADDONS.filter((a) =>
    [a.nameEn, a.nameUk, a.taglineEn, a.taglineUk, a.key, ...(a.aliases ?? [])].some((s) =>
      s.toLowerCase().includes(q)
    )
  );
}
