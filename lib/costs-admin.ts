import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CostCategory, CostEntry } from "@/lib/costs-display";

/* ---------------------------------------------------------------------------
   Reading and writing costs for /admin/costs.

   Service-role for the same reason as stock: product_costs and cost_entries
   have RLS on with no policies, so nothing reaches them through a browser key.
   Authorisation is the caller's job.

   The category vocabulary lives in lib/costs-display.ts, not here — the add
   form is a client component, and pulling this module into the browser bundle
   to read a list of strings would drag the service-role client with it. The
   `server-only` import above is what stops that happening silently.

   Phase A CAPTURES costs and nothing more. No margin is computed here — that
   is Phase B, and it will read product_costs by the order's date, which is why
   costs are dated rather than overwritten.
--------------------------------------------------------------------------- */

/**
 * Cost entries, newest first. `period` filters to one YYYY-MM when given —
 * matching on the period column OR the date, so a one-off (which has no
 * period) still shows up in the month it was actually incurred.
 */
export async function fetchCostEntries(period?: string, limit = 200): Promise<CostEntry[] | null> {
  try {
    const admin = createAdminClient();
    let q = admin
      .from("cost_entries")
      .select("id, category, amount_uah, amount_eur, incurred_on, period, supplier, sku, note")
      .order("incurred_on", { ascending: false })
      .limit(limit);

    if (period && /^\d{4}-\d{2}$/.test(period)) {
      const start = `${period}-01`;
      // First of the following month, so the range covers the whole month
      // without hard-coding how many days it has.
      const [y, m] = period.split("-").map(Number);
      const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
      q = q.or(`period.eq.${period},and(incurred_on.gte.${start},incurred_on.lt.${next})`);
    }

    const { data, error } = await q;
    if (error) {
      console.error("[admin/costs] read failed:", error.code, error.message);
      return null;
    }

    return (data ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      return {
        id: String(row.id),
        category: row.category as CostCategory,
        amountUah: Number(row.amount_uah),
        amountEur: row.amount_eur === null ? null : Number(row.amount_eur),
        incurredOn: String(row.incurred_on),
        period: (row.period as string | null) ?? null,
        supplier: (row.supplier as string | null) ?? null,
        sku: (row.sku as string | null) ?? null,
        note: (row.note as string | null) ?? null,
      };
    });
  } catch (e) {
    console.error("[admin/costs] read threw:", e);
    return null;
  }
}

/** Record a cost. Amounts are UAH; amount_eur only when the bill was in euro. */
export async function addCostEntry(input: {
  category: CostCategory;
  amountUah: number;
  amountEur: number | null;
  incurredOn: string;
  period: string | null;
  supplier: string | null;
  sku: string | null;
  note: string | null;
  createdBy: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("cost_entries").insert({
      category: input.category,
      amount_uah: input.amountUah,
      amount_eur: input.amountEur,
      incurred_on: input.incurredOn,
      period: input.period,
      supplier: input.supplier,
      sku: input.sku,
      note: input.note,
      created_by: input.createdBy,
    });

    if (error) {
      console.error("[admin/costs] insert failed:", error.code, error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save the cost." };
  }
}

/**
 * Set the unit cost for a sku, effective from a date.
 *
 * Upserts on (sku, effective_from): correcting a figure you entered today
 * replaces it, while a change dated tomorrow becomes a new row and leaves
 * today's margins alone. That distinction is the whole reason the table is
 * dated, so it must not be flattened into a plain update.
 */
export async function setUnitCost(input: {
  sku: string;
  unitCostUah: number;
  effectiveFrom: string;
  note: string | null;
  createdBy: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("product_costs").upsert(
      {
        sku: input.sku,
        unit_cost_uah: input.unitCostUah,
        effective_from: input.effectiveFrom,
        note: input.note,
        created_by: input.createdBy,
      },
      { onConflict: "sku,effective_from" }
    );

    if (error) {
      console.error("[admin/costs] unit cost failed:", error.code, error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save the unit cost." };
  }
}
