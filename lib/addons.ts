import { MATERIAL_PRICE } from "./hmd-options";
import { TIMER_PRICE } from "./windcover-options";
import type { Money } from "./currency";

/* ---------------------------------------------------------------------------
   The add-ons, as things a customer can BROWSE — the lid, the rubber ring and
   the wind cover's timer.

   THEY ARE NOT PRODUCTS AND MUST NOT BECOME ONE. Each is priced only as part of
   a parent line (see lib/pricing), has no SKU in the Checkbox cabinet, and no
   weight or carton of its own. Putting them in `products` would make them
   orderable on their own, which would invent three SKUs nobody stocks and hand
   the fiscal integration a receipt line it cannot map.

   So they live here instead: enough to render a card and answer a search, and
   deliberately not enough to add to a basket. Each card sends the customer to
   the product where the option is actually chosen.

   Prices are READ from the pricing modules rather than restated, so a card can
   never quote a figure the cart disagrees with.
--------------------------------------------------------------------------- */

export type Addon = {
  key: "lid" | "rubber" | "timer";
  nameEn: string;
  nameUk: string;
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
    key: "lid",
    nameEn: "Lid",
    nameUk: "Кришка",
    taglineEn: "Heat device lid.",
    taglineUk: "Кришка для пристрою нагріву.",
    price: MATERIAL_PRICE.lid,
    parentSlug: "hmd-tct-op",
    parentEn: "Choose it on any heat device",
    parentUk: "Обирається на сторінці пристрою",
  },
  {
    key: "rubber",
    nameEn: "Rubber",
    nameUk: "Гумка",
    taglineEn: "Heat device sealing ring.",
    taglineUk: "Ущільнювальне кільце.",
    price: MATERIAL_PRICE.rubber,
    parentSlug: "hmd-tct-op",
    parentEn: "Choose it on any heat device",
    parentUk: "Обирається на сторінці пристрою",
  },
  {
    key: "timer",
    nameEn: "Timer",
    nameUk: "Таймер",
    taglineEn: "Rechargeable wind cover timer.",
    taglineUk: "Перезаряджуваний таймер для вітрозахисту.",
    price: TIMER_PRICE,
    parentSlug: "windcover-detonator",
    parentEn: "Choose it on a wind cover",
    parentUk: "Обирається на сторінці вітрозахисту",
  },
];

/** Matches an add-on against a search term, in either language. */
export function searchAddons(query: string): Addon[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return ADDONS.filter((a) =>
    [a.nameEn, a.nameUk, a.taglineEn, a.taglineUk, a.key].some((s) => s.toLowerCase().includes(q))
  );
}
