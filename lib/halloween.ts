import { money, subtractMoney, type Money } from "@/lib/currency";
import { chooseDiscount, permanentDiscount, type DiscountChoice } from "@/lib/loyalty/ranks";

/* ---------------------------------------------------------------------------
   HALLOWEEN SALE — ONE DAY, 31 OCTOBER 2026 (Mario, 23 Oct 2026).

   20% off every product except Project KI 06 (the hookah), for the whole of
   31 October in Kyiv. Kyiv is back on winter time (UTC+2) from 25 October, so
   the day runs 30 Oct 22:00 UTC → 31 Oct 22:00 UTC. The window is the switch:
   nothing needs pushing on the day, and outside it every function here is a
   no-op. DELETE THIS FILE AND ITS CALLERS AFTER 1 NOVEMBER (grep "halloween").

   WHERE IT BITES:
     · lib/pricing priceCart — the authority. Unit prices drop 20% (variant
       and add-ons included), so Monobank, the fiscal receipt, the order lines
       and the free-delivery threshold all see the sale price.
     · components/CartContext linePrice — the instant preview, same rule.
     · the product page, cards, search, favourites, kit builder — display.
     · lib/seo — the Offer price, so Google's copy matches the page.

   NO DOUBLE DISCOUNTS — WHICHEVER IS BIGGER (Mario, 23 Oct 2026). The order
   is priced two ways and the customer pays the cheaper one:
     · sale prices, with a code or the rank perk only on what is NOT on sale
       (in practice the hookah);
     · regular prices, with the code or rank perk on the whole bag.
   On sale items 20% beats every gift code and rank, so the first nearly
   always wins; the second exists for a fixed-euro loyalty voucher worth more
   than 20% of a small bag. A code that loses is not applied and not spent.
   settleHalloween() is the rule, used by the invoice and the checkout alike.

   NEVER WHOLESALE: partners price from their own books (lib/wholesale-*),
   which never come through here.
--------------------------------------------------------------------------- */

export const HALLOWEEN_START = Date.UTC(2026, 9, 30, 22, 0, 0); // 31 Oct 00:00 Kyiv
export const HALLOWEEN_END = Date.UTC(2026, 9, 31, 22, 0, 0); //   1 Nov 00:00 Kyiv
export const HALLOWEEN_RATE = 0.2;

export function halloweenActive(now: number = Date.now()): boolean {
  return now >= HALLOWEEN_START && now < HALLOWEEN_END;
}

/** Everything except the hookah. Category, not slug, so a second hookah would be excluded too. */
export function halloweenEligible(category: string): boolean {
  return category !== "hookah";
}

/** True when this product is on sale at `now`. */
export function onHalloweenSale(category: string, now: number = Date.now()): boolean {
  return halloweenActive(now) && halloweenEligible(category);
}

/**
 * 20% off, rounded the way each currency is shown: cents for the euro,
 * whole hryvnia for the UAH list (every UAH price on the site is whole).
 * €23.00 → €18.40, ₴850 → ₴680.
 */
export function halloweenMoney(m: Money): Money {
  return {
    eur: Math.round(m.eur * (1 - HALLOWEEN_RATE) * 100) / 100,
    uah: Math.round(m.uah * (1 - HALLOWEEN_RATE)),
  };
}

/** The price to charge or show: sale price when on sale, otherwise unchanged. */
export function salePriceFor(category: string, m: Money, now: number = Date.now()): Money {
  return onHalloweenSale(category, now) ? halloweenMoney(m) : m;
}

/** Milliseconds until the sale ends (0 outside it) — for the countdown. */
export function halloweenRemainingMs(now: number = Date.now()): number {
  return halloweenActive(now) ? HALLOWEEN_END - now : 0;
}

/* ---- Whichever is bigger -------------------------------------------------- */

/** A code the customer brought, already validated (exists, unused, theirs). */
export type BroughtCode =
  | { kind: "percent"; percent: number }
  | { kind: "amount"; amountEur: number; minOrderEur: number }
  | null;

/** One way of pricing the order: the goods, and what a code may come off. */
export type PricingPath = { subtotal: Money; discountable: Money };

function codeOn(code: BroughtCode, base: Money): Money | null {
  if (!code || base.eur <= 0) return null;
  if (code.kind === "percent") return permanentDiscount(code.percent / 100, base);
  if (base.eur < code.minOrderEur) return null;
  const m = money(code.amountEur);
  return m.eur > base.eur ? base : m;
}

export type Settlement = DiscountChoice & {
  /** True when regular prices plus the code beat the sale — charge the regular path. */
  regular: boolean;
};

/**
 * The cheaper of the sale path and the regular path. `sale` and `regular`
 * are the same bag priced with and without the sale; outside the sale they
 * are identical and this is exactly chooseDiscount on the subtotal.
 * Compared in the currency the customer is charged from (UAH list on /uk,
 * the euro list elsewhere — lib/currency).
 */
export function settleHalloween(opts: {
  sale: PricingPath;
  regular: PricingPath;
  code: BroughtCode;
  rankRate: number;
  locale: string;
}): Settlement {
  const pick = (path: PricingPath) => chooseDiscount(codeOn(opts.code, path.discountable), permanentDiscount(opts.rankRate, path.discountable));
  const onSale = pick(opts.sale);
  const differs = opts.sale.subtotal.eur !== opts.regular.subtotal.eur;
  if (!differs) return { ...onSale, regular: false };

  const onRegular = pick(opts.regular);
  const key = opts.locale === "uk" ? "uah" : "eur";
  const saleGoods = subtractMoney(opts.sale.subtotal, onSale.amount)[key];
  const regularGoods = subtractMoney(opts.regular.subtotal, onRegular.amount)[key];
  // Strictly cheaper only: a tie keeps the sale and leaves the code unspent.
  return regularGoods < saleGoods ? { ...onRegular, regular: true } : { ...onSale, regular: false };
}

/** A moment outside the sale, for pricing the regular path. */
export const BEFORE_HALLOWEEN = HALLOWEEN_START - 1;
