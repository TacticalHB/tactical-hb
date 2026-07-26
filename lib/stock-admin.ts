import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { StockItem, StockMovement, MovementReason } from "@/lib/stock-display";

/* ---------------------------------------------------------------------------
   Reading stock for the admin screens.

   Service-role, like orders-admin.ts, and for a blunter reason: stock_items and
   stock_movements have RLS enabled with NO policies at all, so they are simply
   unreachable through the anon or authenticated keys. Authorisation is the
   caller's job — the page 404s for non-admins and every action re-checks
   isAdminEmail() for itself.

   Returns null (not an empty list) when a read fails, so a page can tell "no
   stock recorded" apart from "the database didn't answer".
--------------------------------------------------------------------------- */

/** How many recent movements travel with each item. Enough to see what just
    happened without turning the page into a ledger. */
const MOVEMENT_TAIL = 6;

const ITEM_SELECT = `
  sku, kind, product_slug, variant, name_en, name_uk,
  on_hand, reorder_level, critical_level, lead_time_days, active
`;

type ItemRow = {
  sku: string;
  kind: string;
  product_slug: string | null;
  variant: string | null;
  name_en: string;
  name_uk: string;
  on_hand: number;
  reorder_level: number;
  critical_level: number;
  lead_time_days: number | null;
  active: boolean;
};

type MovementRow = {
  id: string;
  sku: string;
  delta: number;
  reason: string;
  order_id: string | null;
  note: string | null;
  created_by: string;
  created_at: string;
};

/**
 * Every stock line, with its recent movements and current unit cost.
 *
 * Three queries rather than one embedded select: PostgREST can only embed
 * across a declared foreign key, and it would fetch the *whole* movement
 * history per item to then throw most of it away. Three small reads beat one
 * unbounded one, and product_costs_current is a view, which cannot be embedded
 * at all.
 */
export async function fetchStock(): Promise<StockItem[] | null> {
  try {
    const admin = createAdminClient();

    const { data: items, error } = await admin
      .from("stock_items")
      .select(ITEM_SELECT)
      .eq("active", true)
      .order("sku");

    if (error) {
      console.error("[admin/stock] read failed:", error.code, error.message);
      return null;
    }

    const rows = (items ?? []) as ItemRow[];
    if (rows.length === 0) return [];

    const skus = rows.map((r) => r.sku);

    // Recent movements for these skus, newest first, trimmed per sku below.
    // Over-fetching by a factor of MOVEMENT_TAIL is deliberate: one bounded
    // query is cheaper than one query per item, and the list is small.
    const { data: moves } = await admin
      .from("stock_movements")
      .select("id, sku, delta, reason, order_id, note, created_by, created_at")
      .in("sku", skus)
      .order("created_at", { ascending: false })
      .limit(skus.length * MOVEMENT_TAIL);

    const { data: costs } = await admin
      .from("product_costs_current")
      .select("sku, unit_cost_uah")
      .in("sku", skus);

    const bySku = new Map<string, StockMovement[]>();
    for (const m of (moves ?? []) as MovementRow[]) {
      const list = bySku.get(m.sku) ?? [];
      if (list.length < MOVEMENT_TAIL) {
        list.push({
          id: m.id,
          delta: m.delta,
          reason: m.reason as MovementReason,
          orderId: m.order_id,
          note: m.note,
          createdBy: m.created_by,
          createdAt: m.created_at,
        });
      }
      bySku.set(m.sku, list);
    }

    const costBySku = new Map<string, number>();
    for (const c of (costs ?? []) as { sku: string; unit_cost_uah: number }[]) {
      costBySku.set(c.sku, Number(c.unit_cost_uah));
    }

    return rows.map((r) => ({
      sku: r.sku,
      kind: r.kind === "part" ? "part" : "product",
      productSlug: r.product_slug,
      variant: r.variant,
      nameEn: r.name_en,
      nameUk: r.name_uk,
      onHand: r.on_hand,
      reorderLevel: r.reorder_level,
      criticalLevel: r.critical_level,
      leadTimeDays: r.lead_time_days,
      active: r.active,
      movements: bySku.get(r.sku) ?? [],
      unitCostUah: costBySku.get(r.sku) ?? null,
    }));
  } catch (e) {
    console.error("[admin/stock] read threw:", e);
    return null;
  }
}

/**
 * Record a movement and move the level with it, as one unit of work.
 *
 * Shared by every writer so the two can never drift apart: a movement without
 * a level change is a lie, and a level change without a movement is worse.
 * Callers must already have established that the caller is an admin.
 *
 * The level is adjusted with an RPC rather than a read-then-write, so two
 * admins receiving batches at the same moment cannot overwrite each other.
 */
export async function recordMovement(input: {
  sku: string;
  delta: number;
  reason: MovementReason;
  note?: string | null;
  createdBy: string;
}): Promise<{ ok: true; onHand: number } | { ok: false; error: string }> {
  if (!Number.isInteger(input.delta) || input.delta === 0) {
    return { ok: false, error: "A movement needs a non-zero whole number." };
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("record_stock_movement", {
      p_sku: input.sku,
      p_delta: input.delta,
      p_reason: input.reason,
      p_note: input.note ?? null,
      p_created_by: input.createdBy,
    });

    if (error) {
      console.error("[admin/stock] movement failed:", error.code, error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true, onHand: Number(data) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not record the movement." };
  }
}

/** Set the thresholds that decide Low and Critical for one sku. */
export async function saveThresholds(input: {
  sku: string;
  criticalLevel: number;
  reorderLevel: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("stock_items")
      .update({ critical_level: input.criticalLevel, reorder_level: input.reorderLevel })
      .eq("sku", input.sku);

    if (error) {
      console.error("[admin/stock] thresholds failed:", error.code, error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save the thresholds." };
  }
}
