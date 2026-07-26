import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildAdvisorRow, type AdvisorRow, type Velocity } from "@/lib/advisor-display";

/* ---------------------------------------------------------------------------
   Gathering the Stock Advisor's inputs. Service-role, same posture as every
   admin module: stock_items has RLS with no policies and order_line_finance
   is revoked from the browser keys, so nothing here is reachable except
   through the server. Authorisation is the caller's job.

   THE ONE WRITE in this file is saveSupplySettings — lead time and batch
   size, the advisor's two planning knobs. They are configuration ABOUT
   production, not stock: no level changes, no movements, and the advisor
   still cannot touch a shelf. Levels move only through 0015's two writers.

   Velocity comes from order_line_finance (0018) rather than stock_movements:
   the view reaches back through the whole order history with the same sku
   resolution the stock decrement uses, while movements only began existing
   at 0015 — a velocity read from movements alone would call every veteran
   product a non-seller for its first months.
--------------------------------------------------------------------------- */

const WINDOW_DAYS = 90;

/** YYYY-MM-DD in Kyiv, `daysBack` days ago — the calendar the finance views
    already keep (0018), so windows here agree with the founder's clock.
    Exported for the weekly brief, which must run on the same clock. */
export function kyivDate(daysBack = 0): string {
  const d = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Kyiv" }).format(d);
}

type LineRow = {
  sku: string;
  qty: number;
  addon_lid: boolean;
  addon_rubber: boolean;
  ordered_on: string;
};

/**
 * Every active stock line, judged. Two reads: the shelf, and 90 days of paid
 * lines. Add-on lids and rubbers are expanded into their part skus exactly as
 * apply_order_stock does (0015) — the advisor must see the same consumption
 * the shelf felt, or it would let parts run out while every product looks
 * covered.
 */
export async function fetchAdvisorRows(): Promise<AdvisorRow[] | null> {
  try {
    const admin = createAdminClient();
    const since90 = kyivDate(WINDOW_DAYS);

    const [itemsRes, linesRes] = await Promise.all([
      admin
        .from("stock_items")
        .select(
          "sku, kind, name_en, name_uk, on_hand, reorder_level, critical_level, lead_time_days, batch_size, active"
        )
        .eq("active", true)
        .order("sku"),
      admin
        .from("order_line_finance")
        .select("sku, qty, addon_lid, addon_rubber, ordered_on")
        .gte("ordered_on", since90),
    ]);

    if (itemsRes.error) {
      console.error("[admin/advisor] stock read failed:", itemsRes.error.code, itemsRes.error.message);
      return null;
    }
    if (linesRes.error) {
      console.error("[admin/advisor] lines read failed:", linesRes.error.code, linesRes.error.message);
      return null;
    }

    const since30 = kyivDate(30);
    const since60 = kyivDate(60);

    const velocity = new Map<string, Velocity>();
    const add = (sku: string, qty: number, orderedOn: string) => {
      const v = velocity.get(sku) ?? { units30: 0, units60: 0, units90: 0 };
      v.units90 += qty;
      if (orderedOn >= since60) v.units60 += qty;
      if (orderedOn >= since30) v.units30 += qty;
      velocity.set(sku, v);
    };

    for (const raw of (linesRes.data ?? []) as LineRow[]) {
      const qty = Number(raw.qty) || 0;
      if (qty <= 0) continue;
      add(raw.sku, qty, raw.ordered_on);
      if (raw.addon_lid) add("part__lid", qty, raw.ordered_on);
      if (raw.addon_rubber) add("part__rubber", qty, raw.ordered_on);
    }

    return (itemsRes.data ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      const sku = String(row.sku);
      return buildAdvisorRow({
        sku,
        kind: row.kind === "part" ? "part" : "product",
        nameEn: String(row.name_en),
        nameUk: String(row.name_uk),
        onHand: Number(row.on_hand) || 0,
        reorderLevel: Number(row.reorder_level) || 0,
        criticalLevel: Number(row.critical_level) || 0,
        leadTimeDays: row.lead_time_days === null ? null : Number(row.lead_time_days),
        batchSize: row.batch_size === null || row.batch_size === undefined ? null : Number(row.batch_size),
        velocity: velocity.get(sku) ?? { units30: 0, units60: 0, units90: 0 },
      });
    });
  } catch (e) {
    console.error("[admin/advisor] read threw:", e);
    return null;
  }
}

/** Set the planning knobs for one line. Null clears — "unknown" is honest. */
export async function saveSupplySettings(input: {
  sku: string;
  leadTimeDays: number | null;
  batchSize: number | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("stock_items")
      .update({ lead_time_days: input.leadTimeDays, batch_size: input.batchSize })
      .eq("sku", input.sku);

    if (error) {
      console.error("[admin/advisor] settings failed:", error.code, error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save the settings." };
  }
}
