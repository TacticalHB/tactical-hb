import "server-only";
import { products } from "@/lib/products";
import { fetchAdvisorRows, kyivDate } from "@/lib/advisor-admin";
import { fetchProductMonth } from "@/lib/finance-admin";
import { fetchAdSpend, fetchCreatives } from "@/lib/marketing-admin";
import { logAgentRun, type AgentTrigger } from "@/lib/agent-runs";
import {
  buildCampaignPlan,
  monthAfter,
  monthBefore,
  type ProductVoice,
} from "@/lib/strategist-display";

/* ---------------------------------------------------------------------------
   The Marketing Strategist's gathering half (§6.4): read what the other
   modules already know, hand it to the pure builder, log the result.

   READS EVERYTHING, WRITES ONE ROW. The inputs are the advisor's live table
   (stock statuses and velocity), last full month's per-product finance, the
   trailing ad spend, and the creative library. The single write is the
   agent_runs record — the plan itself, stored language-neutral so one run
   reads in both languages. No other table is touched, and nothing external
   is called: the "campaign" this produces is a page the founder reads.

   ALL OR NOTHING for core inputs, like the brief: a plan whose stock read
   silently failed would happily advertise empty shelves, which is the one
   mistake the strategist exists to prevent. Finance is the exception —
   margins are enrichment, and their absence is reported as a warning and
   noted in the plan itself, not a reason to refuse to plan.
--------------------------------------------------------------------------- */

export type StrategistRunResult =
  | { ok: true; warning: string | null }
  | { ok: false; error: string };

export async function runStrategist(opts: {
  trigger: AgentTrigger;
  createdBy: string;
}): Promise<StrategistRunResult> {
  try {
    const today = kyivDate(0);
    const thisMonth = today.slice(0, 7);
    const planMonth = monthAfter(thisMonth);
    const lastFullMonth = monthBefore(thisMonth);

    const [advisorRows, spend, creatives, productMonths] = await Promise.all([
      fetchAdvisorRows(),
      fetchAdSpend(),
      fetchCreatives(),
      fetchProductMonth(lastFullMonth),
    ]);

    if (advisorRows === null || spend === null || creatives === null) {
      return {
        ok: false,
        error:
          "A core input was unreadable — check migrations 0015–0020 and SUPABASE_SERVICE_ROLE_KEY.",
      };
    }

    const voices: ProductVoice[] = products.map((p) => ({
      id: p.id,
      taglineEn: p.taglineEn,
      taglineUk: p.taglineUk,
    }));

    const plan = buildCampaignPlan({
      planMonth,
      generatedOn: today,
      advisorRows,
      productMonths: productMonths ?? [],
      spend,
      creatives,
      voices,
    });

    const log = await logAgentRun({
      agent: "marketing_strategist",
      trigger: opts.trigger,
      output: plan,
      createdBy: opts.createdBy,
    });

    // Unlike the brief (which is also mailed), the stored row IS the
    // strategist's entire output — if it didn't land, nothing happened.
    if (!log.ok) {
      return {
        ok: false,
        error: "The plan could not be logged — has migration 0020_marketing.sql been run?",
      };
    }

    return {
      ok: true,
      warning:
        productMonths === null
          ? "Finance was unreadable — margins in this plan are shown as unknown."
          : null,
    };
  } catch (e) {
    console.error("[strategist] run threw:", e);
    return { ok: false, error: "The plan could not be generated." };
  }
}
