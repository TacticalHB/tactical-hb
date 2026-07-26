"use server";

import { revalidatePath } from "next/cache";
import { requireAdminActor } from "@/lib/admin-guard";
import { recordMovement, saveThresholds } from "@/lib/stock-admin";
import type { MovementReason } from "@/lib/stock-display";

/* ---------------------------------------------------------------------------
   Admin: the two ways a human moves stock.

   AUTHORISATION LIVES HERE, not on the page that renders the forms — Next
   exposes every server action as its own endpoint, so guarding only the page
   would leave these writable by anyone holding the action id. Same reasoning
   as saveOrderTtn().

   Both actions run through record_stock_movement(), which writes the movement
   and the level together. Neither ever sets a level directly: a number nobody
   can account for is precisely what this module exists to prevent.
--------------------------------------------------------------------------- */

export type StockResult = { ok: true; onHand: number } | { ok: false; error: string };

const MAX_QTY = 100_000;

function parseQty(raw: string): number | null {
  const n = Number(String(raw).trim());
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
  if (Math.abs(n) > MAX_QTY) return null;
  return n;
}

/**
 * Log a batch that arrived, or goods coming back.
 *
 * Positive quantities only — "receiving minus five" is a correction, and it
 * should say so in the history rather than hiding in the batch log.
 */
export async function receiveStock(
  sku: string,
  qty: string,
  reason: "batch" | "return",
  note: string
): Promise<StockResult> {
  const actor = await requireAdminActor();
  if (!actor) return { ok: false, error: "Not authorised." };

  const id = sku?.trim();
  if (!id) return { ok: false, error: "A sku is required." };

  const n = parseQty(qty);
  if (n === null || n <= 0) return { ok: false, error: "Enter a whole number above zero." };

  const res = await recordMovement({
    sku: id,
    delta: n,
    reason,
    note: note?.trim() || null,
    createdBy: actor,
  });

  if (!res.ok) return res;
  revalidatePath("/[locale]/admin/stock", "page");
  return res;
}

/**
 * Correct a count, or write goods off.
 *
 * A correction is entered as the TRUE number on the shelf, not as a delta: the
 * admin has just counted, and asking them to work out the difference is asking
 * them to make an arithmetic mistake. The delta is derived here, and the
 * history still records a movement, so the correction remains as accountable
 * as everything else.
 *
 * A note is required. A count that changed for no stated reason is the thing
 * this table is supposed to make impossible.
 */
export async function correctStock(
  sku: string,
  countedTotal: string,
  onHandNow: number,
  reason: "correction" | "write_off",
  note: string
): Promise<StockResult> {
  const actor = await requireAdminActor();
  if (!actor) return { ok: false, error: "Not authorised." };

  const id = sku?.trim();
  if (!id) return { ok: false, error: "A sku is required." };

  const trimmedNote = note?.trim() ?? "";
  if (!trimmedNote) return { ok: false, error: "Say why the count changed." };

  const target = parseQty(countedTotal);
  if (target === null) return { ok: false, error: "Enter a whole number." };

  const delta = target - onHandNow;
  if (delta === 0) return { ok: false, error: "That is already the recorded count." };

  const res = await recordMovement({
    sku: id,
    delta,
    reason,
    note: trimmedNote,
    createdBy: actor,
  });

  if (!res.ok) return res;
  revalidatePath("/[locale]/admin/stock", "page");
  return res;
}

/** Set where Low and Critical begin for one sku. */
export async function updateThresholds(
  sku: string,
  criticalLevel: string,
  reorderLevel: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const actor = await requireAdminActor();
  if (!actor) return { ok: false, error: "Not authorised." };

  const id = sku?.trim();
  if (!id) return { ok: false, error: "A sku is required." };

  const critical = parseQty(criticalLevel);
  const reorder = parseQty(reorderLevel);
  if (critical === null || critical < 0 || reorder === null || reorder < 0) {
    return { ok: false, error: "Thresholds must be whole numbers of zero or more." };
  }
  // Critical above reorder would make "Low" unreachable — an item would jump
  // straight from OK to Critical, and the early warning would never fire.
  if (critical > reorder) {
    return { ok: false, error: "Critical must be at or below the reorder level." };
  }

  const res = await saveThresholds({ sku: id, criticalLevel: critical, reorderLevel: reorder });
  if (!res.ok) return res;

  revalidatePath("/[locale]/admin/stock", "page");
  return { ok: true };
}

export type { MovementReason };
