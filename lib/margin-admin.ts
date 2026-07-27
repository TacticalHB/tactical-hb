import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { kyivDate } from "@/lib/advisor-admin";
import {
  fetchChannelMonth,
  fetchCostBreakdown,
  fetchFinanceMonths,
  fetchProductMonth,
} from "@/lib/finance-admin";
import { fetchAdSpend } from "@/lib/marketing-admin";
import { logAgentRun, type AgentTrigger } from "@/lib/agent-runs";
import { buildMarginReport, monthBefore, TRAILING_MONTHS } from "@/lib/margin-display";

/* ---------------------------------------------------------------------------
   The Cost & Margin Guard's gathering half (§6.2): read the finance views,
   hand them to the pure builder, log the result.

   READS EVERYTHING, WRITES ONE ROW. Inputs are the per-product month, the
   retail/wholesale split, the month totals, the fees line and the ad spend.
   The single write is the agent_runs record. No price moves, no cost is
   entered, nothing is emailed — §6.2 gives this agent one verb, and it is
   "flag".

   IT REPORTS ON THE LAST FULL MONTH, never the running one. A margin computed
   on the 3rd of the month is a rumour: the costs have not arrived, the orders
   have not finished, and the percentage swings on every sale. The founder can
   still read the current month in /admin/finance, where it is labelled as what
   it is.

   ALL OR NOTHING for the month's own numbers, like the strategist. A report
   whose product read silently failed would show an empty table and imply
   nothing sold — the one mistake this agent exists to prevent. Fees and ad
   spend are enrichment: their absence becomes a note in the report itself.
--------------------------------------------------------------------------- */

export type MarginRunResult =
  | { ok: true; warning: string | null }
  | { ok: false; error: string };

/** sku → bilingual name, so one stored run renders in both languages. */
async function fetchSkuNames(): Promise<Record<string, { en: string; uk: string }> | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from("stock_items").select("sku, name_en, name_uk");
    if (error) {
      console.error("[margin] names read failed:", error.code, error.message);
      return null;
    }
    const names: Record<string, { en: string; uk: string }> = {};
    for (const r of data ?? []) {
      const row = r as Record<string, unknown>;
      names[String(row.sku)] = {
        en: String(row.name_en ?? row.sku),
        uk: String(row.name_uk ?? row.sku),
      };
    }
    return names;
  } catch (e) {
    console.error("[margin] names read threw:", e);
    return null;
  }
}

export async function runMarginGuard(opts: {
  trigger: AgentTrigger;
  createdBy: string;
}): Promise<MarginRunResult> {
  try {
    const today = kyivDate(0);
    const reportMonth = monthBefore(today.slice(0, 7));

    // The trailing window for collapse detection, newest first.
    const trailingMonths: string[] = [];
    let cursor = reportMonth;
    for (let i = 0; i < TRAILING_MONTHS; i++) {
      cursor = monthBefore(cursor);
      trailingMonths.push(cursor);
    }

    // Two Promise.alls rather than one spread: a spread collapses the tuple
    // into a union and every result below would need re-narrowing. Both are
    // started before either is awaited, so this is still one round of I/O.
    const corePromise = Promise.all([
      fetchProductMonth(reportMonth),
      fetchChannelMonth(reportMonth),
      fetchFinanceMonths(24),
      fetchCostBreakdown(reportMonth),
      fetchAdSpend(),
      fetchSkuNames(),
    ]);
    const trailingPromise = Promise.all(trailingMonths.map((m) => fetchProductMonth(m)));

    const [products, channels, months, costs, spend, names] = await corePromise;
    const trailing = await trailingPromise;

    if (products === null || channels === null || months === null || names === null) {
      return {
        ok: false,
        error:
          "A core input was unreadable — check migrations 0018 and 0022 and SUPABASE_SERVICE_ROLE_KEY.",
      };
    }

    const monthTotals = months.find((m) => m.month === reportMonth) ?? null;

    // Fees are their own cost category since 0022 §3. Null means the read
    // failed; zero-or-absent means none were logged, and the report says so.
    const feesUah =
      costs === null ? null : (costs.find((c) => c.category === "fees")?.totalUah ?? 0);

    const adSpendUah =
      spend === null
        ? null
        : spend
            .filter((s) => s.month === reportMonth)
            .reduce((a, s) => a + s.amountUah, 0);

    const report = buildMarginReport({
      month: reportMonth,
      generatedOn: today,
      products,
      trailing: trailing.map((t) => t ?? []),
      channels,
      monthTotals,
      feesUah,
      adSpendUah,
      names,
    });

    const log = await logAgentRun({
      agent: "cost_margin_guard",
      trigger: opts.trigger,
      output: report,
      createdBy: opts.createdBy,
    });

    // The stored row IS the guard's entire output — if it didn't land,
    // nothing happened.
    if (!log.ok) {
      return {
        ok: false,
        error:
          "The report could not be logged — has migration 0022_suppliers_machines.sql been run?",
      };
    }

    const warnings: string[] = [];
    if (costs === null) warnings.push("the fees line was unreadable");
    if (spend === null) warnings.push("ad spend was unreadable");
    if (monthTotals === null) warnings.push(`no finance row exists for ${reportMonth}`);

    return {
      ok: true,
      warning:
        warnings.length > 0
          ? `Reported with gaps: ${warnings.join(", ")}.`
          : null,
    };
  } catch (e) {
    console.error("[margin] run threw:", e);
    return { ok: false, error: "The margin report could not be generated." };
  }
}
