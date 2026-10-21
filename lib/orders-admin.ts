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
  shipping_method, shipping_uah, shipping_carrier,
  np_delivery_type, np_city_name, np_warehouse_name, np_address, np_notes, np_ttn, np_status_code,
  ukrposhta_barcode, ukrposhta_uuid,
  checkbox_receipt_id, checkbox_fiscalised_at, checkbox_error,
  order_items ( product_id, product_name, quantity, price_eur, price_uah, variant, addon_lid, addon_rubber )
`;

/** The progress line's dates (migration 0047). Asked for separately so the
    list still loads, without dates, before Mario has run it. */
const STEP_COLUMNS = ", packed_at, shipped_at, delivered_at";

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
    const read = (columns: string) =>
      admin.from("orders").select(columns).order("created_at", { ascending: false }).limit(limit);
    let { data, error } = await read(ORDER_SELECT + STEP_COLUMNS);
    // 42703 = undefined column: 0047 not run yet. Same list, no dates.
    if (error?.code === "42703") ({ data, error } = await read(ORDER_SELECT));

    if (error) {
      console.error("[admin/orders] read failed:", error.code, error.message);
      return null;
    }
    return (data ?? []).map((r) => toOrder(r as unknown as Record<string, unknown>));
  } catch (e) {
    console.error("[admin/orders] read threw:", e);
    return null;
  }
}
