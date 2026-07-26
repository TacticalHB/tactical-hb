"use server";

import { revalidatePath } from "next/cache";
import { requireAdminActor } from "@/lib/admin-guard";
import { saveSupplySettings } from "@/lib/advisor-admin";
import { runWeeklyBrief } from "@/lib/weekly-brief";

/* ---------------------------------------------------------------------------
   Admin: the Phase C agent actions — and the complete list of what agents can
   be TOLD to do, which is deliberately short. Planning knobs, and "write the
   brief now". No action here sends anything to a customer or partner, moves
   stock, or changes a partner record; those boundaries belong to Phase A/B
   modules and stay there.

   AUTHORISATION LIVES HERE, not on the pages — Next exposes every server
   action as its own endpoint, so guarding only the page would leave these
   callable by anyone holding the action id. Same reasoning as every action
   before them.
--------------------------------------------------------------------------- */

type Result = { ok: true } | { ok: false; error: string };

const MAX_DAYS = 365;
const MAX_BATCH = 10_000;

/** Empty string means "clear it" — unknown is a valid, honest setting. */
function parseKnob(raw: string, max: number): number | null | "invalid" {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > max) return "invalid";
  return n;
}

/**
 * Set a line's lead time and batch size — configuration about production,
 * read by the Stock Advisor. Not a stock movement; levels are untouchable
 * from here by construction (0015's two writers remain the only ones).
 */
export async function updateSupplySettings(
  sku: string,
  leadTimeDays: string,
  batchSize: string
): Promise<Result> {
  const actor = await requireAdminActor();
  if (!actor) return { ok: false, error: "Not authorised." };

  const id = sku?.trim();
  if (!id) return { ok: false, error: "A sku is required." };

  const lead = parseKnob(leadTimeDays, MAX_DAYS);
  if (lead === "invalid") return { ok: false, error: "Lead time must be 1–365 whole days, or empty." };

  const batch = parseKnob(batchSize, MAX_BATCH);
  if (batch === "invalid") return { ok: false, error: "Batch size must be a whole number of 1 or more, or empty." };

  const res = await saveSupplySettings({ sku: id, leadTimeDays: lead, batchSize: batch });
  if (!res.ok) return res;

  revalidatePath("/[locale]/admin/advisor", "page");
  return { ok: true };
}

/**
 * Write the brief now, on demand (§6.5). Logs the three audit rows exactly
 * like the Monday run but sends NO email — the founder asking to see the
 * brief is already looking at it.
 */
export async function generateBrief(): Promise<
  { ok: true; warning: string | null } | { ok: false; error: string }
> {
  const actor = await requireAdminActor();
  if (!actor) return { ok: false, error: "Not authorised." };

  const res = await runWeeklyBrief({ trigger: "manual", createdBy: actor, sendEmail: false });
  if (!res.ok) {
    return { ok: false, error: res.error ?? "The brief could not be generated." };
  }

  revalidatePath("/[locale]/admin/brief", "page");
  return { ok: true, warning: res.error ?? null };
}
