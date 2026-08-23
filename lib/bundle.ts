import { addMoney, money, subtractMoney, type Money } from "./currency";

/* ---------------------------------------------------------------------------
   The full setup — a bowl, a heat device and a wind cover in the same basket.

   ONE RULE, TWO DOORS. A customer who walks through "Build a setup" and one
   who happens to add the same three things from the catalogue are buying the
   same setup and are owed the same money. The builder does not price anything
   the cart cannot price on its own, and this module is what makes that true:
   the builder, the bag, the checkout panel and the invoice route all reach the
   same answer through here.

   WHAT IT APPLIES TO — one bowl, one device, one cover, the cheapest of each.

   The alternative was every line in those three categories, which is simpler
   to write and wrong in a way that costs real money: a customer buying five
   bowls and one of each of the other two would take a tenth off all five, and
   a bulk order would quietly become the cheapest way to buy bowls. A setup is
   three things. Someone who buys two setups' worth of parts gets the saving on
   one set, and that is deliberate rather than an oversight.

   CHEAPEST, NOT DEAREST, for the same reason it is a fixed set: the rule has
   to be stated in one sentence and be the same sentence for everybody. It also
   means adding an expensive second bowl never reduces the basket.

   ADD-ONS COUNT. A device's lid and FEAR 9E418, a cover's timer — the saving
   is taken on the unit price the customer is actually charged, add-ons folded
   in, because that is the price they see on the line.

   PER UNIT, NOT PER LINE. Two identical bowls are one eligible bowl and one
   ordinary one; the saving is computed from the unit price, never the line
   total, or quantity would multiply it.

   NOT A DISCOUNT CODE, and it must not be presented as one — see the copy rule
   in the components: the customer is shown what the basket was and what it is,
   in money, and never a percentage.
--------------------------------------------------------------------------- */

/** The three categories that make a setup. Accessories are not part of it. */
export const BUNDLE_CATEGORIES = ["bowl", "hmd", "windcover"] as const;
export type BundleCategory = (typeof BUNDLE_CATEGORIES)[number];

/** What the eligible set is multiplied by. Never rendered — money only. */
const BUNDLE_RATE = 0.9;

export type BundleItem = {
  /** The product's catalogue category. Anything outside the three is ignored. */
  category: string;
  /** Price of ONE unit, add-ons included. */
  unit: Money;
};

export type Bundle = {
  /** The cheapest bowl + device + cover, summed — what the saving is taken on. */
  set: Money;
  /** What comes off the basket. Already rounded, so it can be subtracted as-is. */
  saved: Money;
};

/** True when the basket holds at least one of each of the three categories. */
export function isFullSetup(items: BundleItem[]): boolean {
  return BUNDLE_CATEGORIES.every((c) => items.some((i) => i.category === c));
}

/**
 * Which of the three categories are still missing, in catalogue order.
 *
 * The builder needs this to say what to choose next, and needs it from the
 * same place the saving is decided — a gate that disagrees with the discount
 * would either block a complete setup or let an incomplete one through.
 */
export function missingCategories(items: BundleItem[]): BundleCategory[] {
  return BUNDLE_CATEGORIES.filter((c) => !items.some((i) => i.category === c));
}

/**
 * The saving on a basket, or null when it is not a full setup.
 *
 * ROUNDING IS DONE ON THE REDUCED FIGURE AND THE SAVING DERIVED FROM IT, not
 * the other way round. Rounding a tenth and subtracting it can leave the
 * basket a cent or a hryvnia away from the number the customer was shown;
 * taking `set − round(set × 0.9)` cannot, because the reduced figure is the
 * one that was rounded and the saving is whatever is left over.
 */
export function bundleFor(items: BundleItem[]): Bundle | null {
  if (!isFullSetup(items)) return null;

  /* One of each, cheapest first. Compared on euro alone: both currencies are
     hand-set per product and could in principle disagree about which is
     cheaper, and picking a different set per currency would produce two
     different savings for the same basket. The euro price is the catalogue's
     spine, so it decides for both. */
  const set = BUNDLE_CATEGORIES.reduce<Money>((sum, c) => {
    const cheapest = items
      .filter((i) => i.category === c)
      .reduce((best, i) => (i.unit.eur < best.unit.eur ? i : best));
    return addMoney(sum, cheapest.unit);
  }, money(0, 0));

  const reduced: Money = {
    eur: Math.round(set.eur * BUNDLE_RATE * 100) / 100,
    uah: Math.round(set.uah * BUNDLE_RATE),
  };

  const saved = subtractMoney(set, reduced);

  /* A set cheap enough to round to nothing is not a saving worth announcing,
     and a zero "Was" line reads as a bug. Both currencies must have something
     in them or the basket is left alone. */
  if (saved.eur <= 0 && saved.uah <= 0) return null;

  return { set, saved };
}
