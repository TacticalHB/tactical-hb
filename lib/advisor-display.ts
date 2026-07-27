/* ---------------------------------------------------------------------------
   The Stock Advisor's arithmetic. Pure and I/O-free, like every *-display
   module: no Supabase client, no server-only. lib/advisor-admin.ts gathers the
   numbers; this half decides what they mean.

   EVERYTHING HERE IS ADVICE. Nothing in this module (or anywhere else in the
   advisor) changes a stock level — stock moves only on paid orders and manual
   batches (0015), and the plan (§6.1) makes that a standing rule, not a
   Phase C omission.

   THE MODEL, in one paragraph. Demand is estimated from what actually sold:
   paid units over the last 30 days, falling back to the 90-day rate when the
   month was silent — a slow-but-real seller still deserves cover, but a spike
   two months ago should not set this week's production. Cover is on-hand
   divided by that rate. A line is in trouble when it cannot outlast its own
   lead time; it is overstocked when it holds more than half a year of demand.
   The suggestion produces enough to serve TARGET_COVER_DAYS of demand past
   the lead time while keeping the shelf above reorder_level — the founder
   already expresses "never below this" there, so the advisor reuses it as the
   safety buffer instead of inventing a second knob to maintain.

   Open unshipped orders are NOT subtracted: stock decrements at payment
   (apply_order_stock, 0015), so a paid-but-unshipped order has already left
   on_hand. Counting it again would double-book the same sale.
--------------------------------------------------------------------------- */

/** Assumed production lead time when a line has none entered. Two weeks is
    the workshop's usual turnaround; enter the real figure per line to beat it. */
export const DEFAULT_LEAD_TIME_DAYS = 14;

/** How far past the lead time a suggestion provides for. Six weeks keeps a
    small workshop from re-planning every few days without drifting into
    over-production. */
export const TARGET_COVER_DAYS = 42;

/** Cover beyond this reads as Overstock — money sleeping on a shelf. */
export const OVERSTOCK_WEEKS = 26;

export type AdvisorStatus = "critical" | "low" | "ok" | "overstock";

/** Paid units over the trailing windows, oldest window widest. */
export type Velocity = { units30: number; units60: number; units90: number };

export type AdvisorRow = {
  sku: string;
  kind: "product" | "part";
  nameEn: string;
  nameUk: string;
  onHand: number;
  reorderLevel: number;
  criticalLevel: number;
  leadTimeDays: number | null;
  batchSize: number | null;

  units30: number;
  units60: number;
  units90: number;

  /** Planning rate, units per day. 0 = nothing sold in 90 days. */
  dailyRate: number;
  /** on_hand at the planning rate. Null when the rate is 0 — cover is not
      infinite, it is unknown, and the page should say so. */
  weeksOfCover: number | null;

  status: AdvisorStatus;
  /** Produce/reorder this many, rounded up to batch_size. 0 = nothing to do. */
  suggested: number;
};

/**
 * The demand estimate. Last 30 days when they said anything, else the 90-day
 * average — recency wins, silence falls back to the long view.
 */
export function planningRate(v: Velocity): number {
  if (v.units30 > 0) return v.units30 / 30;
  return v.units90 / 90;
}

export function weeksOfCover(onHand: number, dailyRate: number): number | null {
  if (dailyRate <= 0) return null;
  if (onHand <= 0) return 0;
  return onHand / (dailyRate * 7);
}

/**
 * Where a line stands. Threshold breaches keep their Phase A meaning exactly
 * — the advisor must never disagree with /admin/stock about what Critical is.
 * Velocity only ever makes the verdict STRICTER (a shelf that cannot outlast
 * its lead time is critical no matter how far above threshold it sits) or
 * adds the one state thresholds cannot see: overstock.
 */
export function advisorStatus(row: {
  onHand: number;
  criticalLevel: number;
  reorderLevel: number;
  leadTimeDays: number | null;
  dailyRate: number;
  units90: number;
}): AdvisorStatus {
  const lead = row.leadTimeDays ?? DEFAULT_LEAD_TIME_DAYS;
  const coverDays = row.dailyRate > 0 ? row.onHand / row.dailyRate : null;

  if (row.onHand <= row.criticalLevel) return "critical";
  if (coverDays !== null && coverDays < lead) return "critical";

  if (row.onHand <= row.reorderLevel) return "low";
  if (coverDays !== null && coverDays < lead + TARGET_COVER_DAYS / 2) return "low";

  // Overstock needs evidence of not selling, not just a big number: a shelf
  // above threshold with zero sales in 90 days, or more than half a year of
  // cover at the current rate.
  if (row.units90 === 0 && row.onHand > row.reorderLevel) return "overstock";
  if (coverDays !== null && coverDays > OVERSTOCK_WEEKS * 7) return "overstock";

  return "ok";
}

/**
 * One line, fully judged. The single entry point lib/advisor-admin.ts uses,
 * so the status and the suggestion can never be computed from different
 * inputs. The suggestion is demand over lead time plus the target horizon,
 * keeping reorder_level in reserve, minus what is already there — rounded UP
 * to the practical batch. An overstocked line is never topped up.
 */
export function buildAdvisorRow(input: {
  sku: string;
  kind: "product" | "part";
  nameEn: string;
  nameUk: string;
  onHand: number;
  reorderLevel: number;
  criticalLevel: number;
  leadTimeDays: number | null;
  batchSize: number | null;
  velocity: Velocity;
}): AdvisorRow {
  const dailyRate = planningRate(input.velocity);
  const status = advisorStatus({
    onHand: input.onHand,
    criticalLevel: input.criticalLevel,
    reorderLevel: input.reorderLevel,
    leadTimeDays: input.leadTimeDays,
    dailyRate,
    units90: input.velocity.units90,
  });

  let suggested = 0;
  if (status !== "overstock") {
    const lead = input.leadTimeDays ?? DEFAULT_LEAD_TIME_DAYS;
    const raw = dailyRate * (lead + TARGET_COVER_DAYS) + input.reorderLevel - input.onHand;
    if (raw > 0) {
      const batch = input.batchSize ?? 1;
      suggested = Math.ceil(raw / batch) * batch;
    }
  }

  return {
    sku: input.sku,
    kind: input.kind,
    nameEn: input.nameEn,
    nameUk: input.nameUk,
    onHand: input.onHand,
    reorderLevel: input.reorderLevel,
    criticalLevel: input.criticalLevel,
    leadTimeDays: input.leadTimeDays,
    batchSize: input.batchSize,
    units30: input.velocity.units30,
    units60: input.velocity.units60,
    units90: input.velocity.units90,
    dailyRate,
    weeksOfCover: weeksOfCover(input.onHand, dailyRate),
    status,
    suggested,
  };
}

export function advisorStatusLabel(s: AdvisorStatus, uk: boolean): string {
  const labels: Record<AdvisorStatus, [en: string, uk: string]> = {
    critical: ["Critical", "Критично"],
    low: ["Low", "Мало"],
    ok: ["OK", "Норма"],
    overstock: ["Overstock", "Надлишок"],
  };
  return labels[s][uk ? 1 : 0];
}

/** Chip colours, matching the admin palette; overstock is cool, not alarming. */
export function advisorStatusTone(s: AdvisorStatus): { bg: string; fg: string } {
  switch (s) {
    case "critical":
      return { bg: "var(--console-alert-soft)", fg: "var(--console-alert)" };
    case "low":
      return { bg: "var(--console-warn-soft)", fg: "var(--console-warn)" };
    case "overstock":
      return { bg: "var(--console-info-soft)", fg: "var(--console-info)" };
    default:
      return { bg: "var(--console-ok-soft)", fg: "var(--console-ok)" };
  }
}

/** Sort: worst first, biggest suggestion breaking ties. What to make, on top. */
export function byAdvisorUrgency(a: AdvisorRow, b: AdvisorRow): number {
  const rank: Record<AdvisorStatus, number> = { critical: 0, low: 1, ok: 2, overstock: 3 };
  const d = rank[a.status] - rank[b.status];
  if (d !== 0) return d;
  if (a.suggested !== b.suggested) return b.suggested - a.suggested;
  return a.sku.localeCompare(b.sku);
}

/** "3.5 wk" / "—" for unknown (no sales to divide by). */
export function formatCover(weeks: number | null, uk: boolean): string {
  if (weeks === null) return "—";
  const n = weeks >= 10 ? Math.round(weeks) : Math.round(weeks * 10) / 10;
  return uk ? `${n} тиж` : `${n} wk`;
}
