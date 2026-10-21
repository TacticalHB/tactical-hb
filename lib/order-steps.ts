import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/* ---------------------------------------------------------------------------
   When an order reached each step of the progress line (21 Oct 2026).

   Admin › Orders draws Paid → Packed → Shipped → Delivered with the moment
   under every finished step. Paid is the order's created_at; the other three
   are stamped here, by whichever path moved the order — the automatic
   waybill, a pasted number, the tracking run, or Mario's own buttons.

   A SEPARATE WRITE FROM THE STATUS, ON PURPOSE. The columns arrive with
   migration 0047, which Mario runs by hand. Folded into the status update, a
   missing column would fail the whole update and the order would stop moving;
   on its own it can only fail to record a date, which the page shows as no
   date. That is also why this never throws.

   FIRST TIME ONLY: `.is(column, null)` keeps the original moment when a
   number is corrected or a run sees the same stage twice.
--------------------------------------------------------------------------- */

export type OrderStep = "packed" | "shipped" | "delivered";

const COLUMN: Record<OrderStep, string> = {
  packed: "packed_at",
  shipped: "shipped_at",
  delivered: "delivered_at",
};

export async function stampOrderStep(orderId: string, step: OrderStep, at = new Date().toISOString()): Promise<void> {
  const column = COLUMN[step];
  try {
    const { error } = await createAdminClient()
      .from("orders")
      .update({ [column]: at })
      .eq("id", orderId)
      .is(column, null);
    // 42703 = the column is not there yet (0047 not run). Expected, not news.
    if (error && error.code !== "42703") {
      console.error("[order-steps] could not stamp", column, "on", orderId, error.code, error.message);
    }
  } catch (e) {
    console.error("[order-steps] could not stamp", column, "on", orderId, e);
  }
}
