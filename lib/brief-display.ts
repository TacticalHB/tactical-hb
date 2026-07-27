/* ---------------------------------------------------------------------------
   The Weekly Commander Brief's shape. Pure and I/O-free — this is the JSON
   stored in agent_runs.output and rendered by /admin/brief and the Monday
   email. Language-neutral by design: names, numbers and dates only, so one
   stored run reads correctly in either language and a brief generated in
   English needs no regenerating to be read in Ukrainian.

   lib/weekly-brief.ts builds it; this half only says what it is.
--------------------------------------------------------------------------- */

import type { MarketingChannel } from "@/lib/marketing-display";
import type { CoachVerdict } from "@/lib/projects-display";
import { isCriticalAlert, type MarginAlert, type MarginReport } from "@/lib/margin-display";

export type BriefStockLine = { sku: string; nameEn: string; nameUk: string; onHand: number };

export type BriefSuggestion = {
  sku: string;
  nameEn: string;
  nameUk: string;
  suggested: number;
  status: "critical" | "low" | "ok" | "overstock";
};

export type BriefTopProduct = {
  sku: string;
  name: string;
  units: number;
  revenueUah: number | null;
};

export type BriefData = {
  /** Kyiv date the brief was generated. */
  generatedOn: string;

  week: {
    /** The trailing seven Kyiv days, inclusive. */
    from: string;
    to: string;
    revenueUah: number;
    orders: number;
    /** Orders counted but not summed — no amount_uah on the row. */
    unpriced: number;
    /** The seven days before those, for the "up or down" glance. */
    prevRevenueUah: number;
    prevOrders: number;
  };

  /** This Kyiv month so far, straight from finance_monthly (0018). Null when
      the month has no rows yet or finance was unreadable at build time. */
  monthToDate: {
    month: string;
    ordersCount: number;
    revenueUah: number | null;
    cogsUah: number | null;
    opexUah: number | null;
    marginUah: number;
    uncostedLines: number;
    unpricedOrders: number;
  } | null;

  /** Best sellers of the week, by revenue. */
  topProducts: BriefTopProduct[];

  stock: {
    critical: BriefStockLine[];
    low: BriefStockLine[];
    overstock: BriefStockLine[];
    /** What the Stock Advisor would produce, biggest first. */
    suggestions: BriefSuggestion[];
  };

  wholesale: {
    /** Partners whose next_follow_up is today or past. */
    dueFollowUps: number;
    /** Quiet partners (the Follow-up Agent's list), quietest first. */
    quiet: { company: string; daysQuiet: number; status: string }[];
  };

  /** Phase D — project savings progress (§6.5's long-promised read). OPTIONAL
      twice over: absent on runs stored before Phase D, and absent when 0021
      isn't run yet — the guard below deliberately doesn't require it, so old
      photographs keep rendering. */
  projects?: {
    name: string;
    savedUah: number;
    targetBudgetUah: number | null;
    progressPct: number | null;
    neededPerMonthUah: number | null;
    verdict: CoachVerdict;
  }[];

  /** Phase D — the running month's entered ad spend, same optionality. */
  adSpend?: {
    month: string;
    totalUah: number;
    byChannel: { channel: MarketingChannel; amountUah: number }[];
  };

  /** Phase F — what the Cost & Margin Guard last said (§6.2), same optionality
      again: absent on runs stored before Phase F, and absent until the Guard
      has run at least once.

      This is a QUOTATION, not a recalculation. The brief does not compute a
      margin of its own; it repeats the Guard's stored report and stamps it
      with `checkedAt` so a figure from last Monday is visibly from last
      Monday. Two modules computing "the margin" separately is how a founder
      ends up with two numbers and no idea which to believe. */
  margin?: {
    /** The month the Guard reported on — the last FULL month, not this one. */
    month: string;
    /** When that run was made, so staleness is visible rather than implied. */
    checkedAt: string;
    marginUah: number;
    revenueUah: number | null;
    shippingChargedUah: number;
    /** True when the Guard found no orders and no costs in that month. */
    empty: boolean;
    alertCount: number;
    criticalCount: number;
    /** The worst few, stored whole so the page and the email word them
        identically via marginAlertText(). */
    alerts: MarginAlert[];
  };
};

/** The worst few margin alerts. A briefing points; the page enumerates. */
const MAX_MARGIN_ALERTS = 4;

/**
 * The Guard's report, reduced to a brief-sized quotation.
 *
 * Pure, and separate from the read in lib/weekly-brief.ts, because this is
 * where the judgement lives: which alerts survive the cut, and what "empty"
 * means. Critical alerts are ranked first so a four-item cut never drops
 * "selling below cost" to make room for "margin is a bit thin".
 */
export function marginSectionFromReport(
  report: MarginReport,
  checkedAt: string
): NonNullable<BriefData["margin"]> {
  const ranked = [...report.alerts].sort(
    (a, b) => Number(isCriticalAlert(b)) - Number(isCriticalAlert(a))
  );
  return {
    month: report.month,
    checkedAt,
    marginUah: report.totals.marginUah,
    revenueUah: report.totals.revenueUah,
    shippingChargedUah: report.totals.shippingChargedUah,
    empty: report.notes.includes("no_month_data"),
    alertCount: report.alerts.length,
    criticalCount: report.alerts.filter(isCriticalAlert).length,
    alerts: ranked.slice(0, MAX_MARGIN_ALERTS),
  };
}

/**
 * Is this stored agent_runs.output a brief this code can render? Old runs
 * outlive rewrites of the shape above; a version check keeps them from
 * crashing the page — an unreadable run renders as "generated by an earlier
 * version", which is the truth.
 */
export function isBriefData(v: unknown): v is BriefData {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.generatedOn === "string" &&
    typeof o.week === "object" &&
    o.week !== null &&
    typeof o.stock === "object" &&
    o.stock !== null &&
    typeof o.wholesale === "object" &&
    o.wholesale !== null &&
    Array.isArray(o.topProducts)
  );
}

/** ₴1 234, or — for unknown. The founder's numbers are never invented zeros. */
export function briefUah(n: number | null): string {
  if (n === null) return "—";
  return `₴${Math.round(n).toLocaleString("uk-UA")}`;
}

/** "+12%" / "−8%" / "—" against the previous week. */
export function weekDelta(now: number, prev: number): string {
  if (prev <= 0) return "—";
  const pct = Math.round(((now - prev) / prev) * 100);
  return pct >= 0 ? `+${pct}%` : `−${Math.abs(pct)}%`;
}
