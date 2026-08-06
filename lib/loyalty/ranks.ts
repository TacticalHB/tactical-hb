import { money, type Money } from "@/lib/currency";

/* ---------------------------------------------------------------------------
   The rank ladder, and the one permanent discount that hangs off the top of it.

   RANK IS DERIVED, NEVER STORED. It is a pure function of lifetime paid spend,
   which the loyalty page already sums out of `orders.amount_eur` and which the
   XP trigger and the voucher milestones both read. A `loyalty_rank` column
   would be a second copy of a number the database can already answer, and the
   two would drift the first time an order was refunded, backfilled or linked
   to an account after the fact. There is one ledger; this reads it.

   EVERY RANK CARRIES BOTH THRESHOLDS, AND BOTH MUST BE MET. This is the whole
   trick, and it exists because the two currencies are not one exchange rate
   apart. The catalogue is hand-priced at roughly ₴37 to the euro, while a euro
   order is billed to Monobank at a fixed ₴51 — so any single-currency ladder
   tells the truth on one storefront and lies on the other.

   Converting €1 000 at the loyalty rate of 50 was the first attempt, and it
   made Colonel reachable on about ₴37 000 while the page promised ₴50 000.
   Taking the LOWER of the two ranks a customer qualifies for closes that gap
   from both directions at once:

     a Ukrainian at ₴37 000 has amount_eur ≈ €1 000 → Colonel by the euro
     scale, but only Captain by the hryvnia one, so Captain is what they get,
     and Colonel arrives at ₴50 000 exactly;

     an English customer at €980 has been billed ≈ ₴49 980 → Colonel by
     neither, and Colonel arrives at €1 000 exactly.

   So both numbers on both storefronts are the real gate rather than a
   rounded-off approximation of one. Rank only ever goes up, because spend
   only ever goes up.
--------------------------------------------------------------------------- */

export type RankKey = "recruit" | "operative" | "specialist" | "captain" | "colonel";

export type Rank = {
  key: RankKey;
  /** Position on the ladder, 0-based. Higher is better; used for comparisons. */
  order: number;
  en: string;
  uk: string;
  /** Lifetime paid spend, in EUR, at which this rank unlocks on /en. */
  thresholdEur: number;
  /** Lifetime hryvnia actually charged at which it unlocks on /uk. NOT a
      conversion of thresholdEur — the two are set independently, because the
      catalogue's own prices are. */
  thresholdUah: number;
  /** Permanent share off the product subtotal. Zero for everyone but Colonel. */
  discountRate: number;
  /** Insignia, drawn on the dark rewards card. */
  badge: string;
};

/** The permanent discount the top rank carries. Products only — never
    shipping, never fees. Named here so pricing and copy cannot disagree. */
export const COLONEL_DISCOUNT_RATE = 0.07;

/* Ascending by threshold, and the code below relies on that order. Operative
   and Specialist deliberately sit on the two existing voucher milestones
   (€100 and €250) rather than beside them — reaching a rank and unlocking a
   voucher should be the same moment, not two near-misses. */
export const RANKS: Rank[] = [
  { key: "recruit",    order: 0, en: "Recruit",    uk: "Рекрут",     thresholdEur: 0,    thresholdUah: 0,     discountRate: 0,                     badge: "/loyalty/ranks/recruit.svg" },
  { key: "operative",  order: 1, en: "Operative",  uk: "Оператив",   thresholdEur: 100,  thresholdUah: 5000,  discountRate: 0,                     badge: "/loyalty/ranks/operative.svg" },
  { key: "specialist", order: 2, en: "Specialist", uk: "Спеціаліст", thresholdEur: 250,  thresholdUah: 12500, discountRate: 0,                     badge: "/loyalty/ranks/specialist.svg" },
  { key: "captain",    order: 3, en: "Captain",    uk: "Капітан",    thresholdEur: 500,  thresholdUah: 25000, discountRate: 0,                     badge: "/loyalty/ranks/captain.svg" },
  { key: "colonel",    order: 4, en: "Colonel",    uk: "Полковник",  thresholdEur: 1000, thresholdUah: 50000, discountRate: COLONEL_DISCOUNT_RATE, badge: "/loyalty/ranks/colonel.svg" },
];

export const TOP_RANK = RANKS[RANKS.length - 1];

/** Lifetime spend, as both the ledger's euro figure and the hryvnia billed. */
export type Spend = { eur: number; uah: number };

const safe = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

/**
 * The rank a lifetime spend has earned. Everyone is at least a Recruit.
 *
 * BOTH scales have to be satisfied, and the lower answer wins — see the note
 * at the top of this file. Passing only euro would re-open the gap that made
 * Colonel reachable ₴13 000 early on the Ukrainian storefront.
 */
export function rankForSpend(spend: Spend): Rank {
  const eur = safe(spend.eur);
  const uah = safe(spend.uah);

  let byEur = RANKS[0];
  for (const r of RANKS) if (eur >= r.thresholdEur) byEur = r;

  let byUah = RANKS[0];
  for (const r of RANKS) if (uah >= r.thresholdUah) byUah = r;

  return byEur.order <= byUah.order ? byEur : byUah;
}

export type RankProgress = {
  rank: Rank;
  /** null once Colonel is reached — there is nothing above it. */
  next: Rank | null;
  /** Still to spend to reach `next`, in each currency; 0 at the top. Each is
      measured against its OWN threshold, so the figure a customer is shown is
      the one their storefront will actually judge them by. */
  remainingEur: number;
  remainingUah: number;
  /** 0–1 across the current band, for the progress bar. 1 at the top. */
  fraction: number;
};

export function rankProgress(spend: Spend): RankProgress {
  const eur = safe(spend.eur);
  const uah = safe(spend.uah);
  const rank = rankForSpend(spend);
  const next = RANKS.find((r) => r.order === rank.order + 1) ?? null;
  if (!next) return { rank, next: null, remainingEur: 0, remainingUah: 0, fraction: 1 };

  /* The bar tracks whichever scale the customer is further behind on, because
     that is the one holding them back — showing the generous side would creep
     towards full and then not promote them. */
  const bandEur = next.thresholdEur - rank.thresholdEur;
  const bandUah = next.thresholdUah - rank.thresholdUah;
  const fracEur = bandEur > 0 ? (eur - rank.thresholdEur) / bandEur : 1;
  const fracUah = bandUah > 0 ? (uah - rank.thresholdUah) / bandUah : 1;

  return {
    rank,
    next,
    /* Rounded so the copy never shows "€119.99999999 to go". */
    remainingEur: Math.max(0, Math.round((next.thresholdEur - eur) * 100) / 100),
    remainingUah: Math.max(0, Math.round(next.thresholdUah - uah)),
    fraction: Math.max(0, Math.min(1, Math.min(fracEur, fracUah))),
  };
}

/* ---------------------------------------------------------------------------
   The discount.

   Both currencies are worked out from their own subtotal rather than one being
   converted from the other, because the catalogue's euro and hryvnia prices are
   hand-set and do not sit on a single exchange rate. Taking 7% of each keeps a
   Ukrainian customer's discount true to the hryvnia they were quoted.
--------------------------------------------------------------------------- */

/**
 * What a rank's `discountRate` takes off this product subtotal.
 *
 * Takes the rate rather than the Rank so the checkout summary can call it with
 * the single number the server handed it, without having to reconstruct a Rank
 * object client-side just to read one field back out of it.
 */
export function permanentDiscount(rate: number, subtotal: Money): Money {
  if (!(rate > 0)) return money(0, 0);
  return {
    eur: Math.round(subtotal.eur * rate * 100) / 100,
    uah: Math.round(subtotal.uah * rate),
  };
}

export type DiscountChoice = {
  amount: Money;
  /** Which one won, so the summary can name it and the order can record it. */
  source: "voucher" | "rank" | "none";
};

/**
 * THE STACKING RULE, in one place.
 *
 * A voucher and the Colonel discount never sum — the customer gets whichever is
 * worth more and the other is left untouched, so an unused voucher stays
 * unused rather than being burned for less than it is worth. Ties go to the
 * rank for the same reason: spending nothing beats spending a voucher.
 *
 * Compared in EUR because that is the ledger's currency and both amounts are
 * defined there; the hryvnia figures track it.
 */
export function chooseDiscount(voucher: Money | null, permanent: Money): DiscountChoice {
  const v = voucher ?? money(0, 0);
  if (v.eur <= 0 && permanent.eur <= 0) return { amount: money(0, 0), source: "none" };
  if (permanent.eur >= v.eur) return { amount: permanent, source: "rank" };
  return { amount: v, source: "voucher" };
}
