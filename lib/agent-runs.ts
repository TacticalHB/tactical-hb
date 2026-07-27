import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/* ---------------------------------------------------------------------------
   The agents' audit log (agent_runs, 0019). Insert and read — there is no
   update or delete here on purpose, and nothing anywhere reads a run back to
   ACT on it. A run is a photograph of advice, kept so "what did it say last
   Monday" stays answerable (plan §6.7).

   Failures are reported, never thrown: a full disk must not stop the brief
   from rendering, and a missing table (0019 not yet run) must degrade to
   "unavailable", not to a crash — the same manner as every admin read.
--------------------------------------------------------------------------- */

export type AgentName =
  | "stock_advisor"
  | "wholesale_followup"
  | "weekly_brief"
  | "marketing_strategist"
  | "savings_coach"
  | "cost_margin_guard";
export type AgentTrigger = "cron" | "manual";

export type AgentRun = {
  id: string;
  agent: AgentName;
  trigger: AgentTrigger;
  output: unknown;
  createdBy: string;
  createdAt: string;
};

export async function logAgentRun(input: {
  agent: AgentName;
  trigger: AgentTrigger;
  output: unknown;
  createdBy: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("agent_runs").insert({
      agent: input.agent,
      trigger: input.trigger,
      output: input.output,
      created_by: input.createdBy,
    });

    if (error) {
      console.error("[agent-runs] insert failed:", error.code, error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not log the run." };
  }
}

/** Recent runs of one agent, newest first. */
export async function fetchAgentRuns(agent: AgentName, limit = 10): Promise<AgentRun[] | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("agent_runs")
      .select("id, agent, trigger, output, created_by, created_at")
      .eq("agent", agent)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[agent-runs] read failed:", error.code, error.message);
      return null;
    }

    return (data ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      return {
        id: String(row.id),
        agent: row.agent as AgentName,
        trigger: row.trigger === "cron" ? ("cron" as const) : ("manual" as const),
        output: row.output,
        createdBy: String(row.created_by),
        createdAt: String(row.created_at),
      };
    });
  } catch (e) {
    console.error("[agent-runs] read threw:", e);
    return null;
  }
}
