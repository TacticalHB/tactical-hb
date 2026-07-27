import { UAH_PER_EUR } from "@/lib/currency";

/* ---------------------------------------------------------------------------
   The FX view (plan §7, Phase F: "FX live rates display for planning", and §5,
   which gives Finance the FX view). Pure and I/O-free; lib/fx-admin.ts fetches.

   DISPLAY ONLY, and that word is doing real work. Nothing here — and nothing
   behind it — repricing anything:

   · Catalogue prices are set BY HAND in both currencies (lib/products.ts).
     They are rounded marketing numbers, not conversions, and a live rate has
     no business touching them.
   · Derived amounts (the HMD add-on upcharges, cart subtotals) convert at
     UAH_PER_EUR in lib/currency.ts, a constant a human edits. If a live rate
     moved that constant, every basket in the shop would reprice itself
     between one page load and the next, and the price a customer was quoted
     would stop matching the price they are charged.

   So what this is FOR: telling the founder that the shop's rate has drifted
   from the official one, so he can decide whether to edit it. The decision,
   and the edit, stay human — the same shape as every other agent here.
--------------------------------------------------------------------------- */

/** One currency against the hryvnia, as the National Bank publishes it. */
export type FxRate = {
  code: "EUR" | "USD";
  /** Hryvnia per one unit of the currency. */
  rateUah: number;
  /** YYYY-MM-DD, the date NBU stamped the rate with. */
  asOf: string;
};

export type FxRates = { eur: FxRate | null; usd: FxRate | null };

/** Percentage points of drift at which the shop's rate stops being "close". */
const DRIFT_WATCH_PCT = 3;
/** …and at which it is far enough to be costing or overcharging real money. */
const DRIFT_WIDE_PCT = 7;

export type DriftVerdict = "aligned" | "watch" | "wide" | "unknown";

export type ShopRateDrift = {
  /** What lib/currency.ts charges — the number a human maintains. */
  shopRateUah: number;
  officialRateUah: number | null;
  /** Positive: the shop asks MORE hryvnia per euro than the bank's rate. */
  driftPct: number | null;
  verdict: DriftVerdict;
};

export function shopRateDrift(official: FxRate | null): ShopRateDrift {
  if (official === null || official.rateUah <= 0) {
    return {
      shopRateUah: UAH_PER_EUR,
      officialRateUah: null,
      driftPct: null,
      verdict: "unknown",
    };
  }

  const driftPct =
    Math.round(((UAH_PER_EUR - official.rateUah) / official.rateUah) * 1000) / 10;
  const magnitude = Math.abs(driftPct);

  return {
    shopRateUah: UAH_PER_EUR,
    officialRateUah: official.rateUah,
    driftPct,
    verdict:
      magnitude < DRIFT_WATCH_PCT ? "aligned" : magnitude < DRIFT_WIDE_PCT ? "watch" : "wide",
  };
}

export function driftVerdictLabel(v: DriftVerdict, uk: boolean): string {
  const labels: Record<DriftVerdict, [en: string, uk: string]> = {
    aligned: ["In line", "Збігається"],
    watch: ["Drifting", "Розходиться"],
    wide: ["Far apart", "Сильно розійшлись"],
    unknown: ["No live rate", "Курс недоступний"],
  };
  return labels[v][uk ? 1 : 0];
}

export function driftVerdictTone(v: DriftVerdict): { bg: string; fg: string } {
  switch (v) {
    case "aligned":
      return { bg: "var(--console-ok-soft)", fg: "var(--console-ok)" };
    case "watch":
      return { bg: "var(--console-warn-soft)", fg: "var(--console-warn)" };
    case "wide":
      return { bg: "var(--console-alert-soft)", fg: "var(--console-alert)" };
    default:
      return { bg: "var(--console-panel-2)", fg: "var(--console-faint)" };
  }
}

/**
 * What the drift MEANS, which is the only reason to show a percentage at all.
 *
 * The shop's rate converts euro-denominated add-ons into hryvnia. Above the
 * official rate, a UAH customer pays more for the same add-on than its euro
 * price implies; below it, the shop absorbs the difference.
 */
export function driftConsequence(d: ShopRateDrift, uk: boolean): string | null {
  if (d.driftPct === null || d.verdict === "aligned") return null;

  const pct = Math.abs(d.driftPct).toFixed(1);
  if (d.driftPct > 0) {
    return uk
      ? `Магазин бере на ${pct}% більше гривень за євро, ніж НБУ — гривневі покупці платять за доплати дорожче, ніж каже ціна в євро.`
      : `The shop asks ${pct}% more hryvnia per euro than the bank — UAH customers pay more for add-ons than the euro price implies.`;
  }
  return uk
    ? `Магазин бере на ${pct}% менше гривень за євро, ніж НБУ — різницю за доплати покриваємо ми.`
    : `The shop asks ${pct}% less hryvnia per euro than the bank — the shop absorbs that difference on add-ons.`;
}

/** NBU stamps dates DD.MM.YYYY; everything else here speaks ISO. */
export function nbuDateToIso(d: string): string | null {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(String(d ?? "").trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}
