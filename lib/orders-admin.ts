import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { toOrder, type AdminOrder } from "@/lib/orders-display";

/* ---------------------------------------------------------------------------
   Reading orders for the admin list.

   Uses the service-role client deliberately: RLS scopes `orders` to the owning
   customer, and an admin needs to see everyone's — including guest orders that
   have no user_id at all. Authorisation is the caller's job (the page 404s for
   non-admins), which is why this module is server-only.

   How a row should READ lives in lib/orders-display.ts, which is pure and has
   no database of its own — this half is only the query.
--------------------------------------------------------------------------- */

/** Columns pulled for the list, with line items embedded via the FK. */
export const ORDER_SELECT = `
  id, created_at, status, source, external_ref, user_id,
  email, delivery,
  amount_eur, amount_uah, currency, discount_eur, voucher_code,
  shipping_method, shipping_uah,
  np_delivery_type, np_city_name, np_warehouse_name, np_address, np_notes, np_ttn,
  order_items ( product_id, product_name, quantity, price_eur, price_uah )
`;

/**
 * Every order, newest first.
 *
 * Returns `null` (not an empty list) when the read fails, so the page can tell
 * "no orders yet" apart from "the database didn't answer" — reporting a broken
 * connection as an empty shop would be the worse lie.
 */
export async function fetchAdminOrders(limit = 200): Promise<AdminOrder[] | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("orders")
      .select(ORDER_SELECT)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[admin/orders] read failed:", error.code, error.message);
      return null;
    }
    return (data ?? []).map((r) => toOrder(r as Record<string, unknown>));
  } catch (e) {
    console.error("[admin/orders] read threw:", e);
    return null;
  }
}
