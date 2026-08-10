import { statusLabel, totalFromAmounts } from "@/lib/orders-display";

/* ---------------------------------------------------------------------------
   The customer's own view of their orders.

   A DELIBERATELY SMALLER SHAPE THAN THE ADMIN'S. lib/orders-display carries an
   AdminOrder with the buyer's phone, the fiscal receipt id, the courier's
   internal refs and the ops notes on it. None of that belongs in a page the
   customer opens, and the surest way to keep it out is for the customer half
   never to construct that type at all — so this file names, field by field,
   what a customer may see, and the query beside it selects only those columns.

   PURE AND I/O-FREE, like the admin half. No Supabase client, no server-only:
   reading rows and deciding how they read are different jobs.

   AMOUNTS COME FROM THE SAME FUNCTION THE ADMIN USES. Two screens disagreeing
   about what someone paid is a support email, not a bug report.
--------------------------------------------------------------------------- */

export type CustomerOrderItem = {
  id: string;
  slug: string;
  name: string | null;
  quantity: number;
  priceEur: number | null;
  priceUah: number | null;
  variant: string | null;
  lid: boolean;
  rubber: boolean;
};

export type CustomerOrder = {
  id: string;
  /** What the customer is told to quote. Falls back to a short id for rows
      that predate the Monobank reference. */
  reference: string;
  createdAt: string;
  status: string;
  amountEur: number | null;
  amountUah: number | null;
  shippingUah: number;
  /** Nova Poshta waybill, when one has been booked. */
  ttn: string | null;
  /** "Kyiv · Branch #12" — the destination in the customer's own terms. */
  destination: string | null;
  items: CustomerOrderItem[];
};

const num = (v: unknown): number | null => {
  const n = Number(v);
  return v === null || v === undefined || Number.isNaN(n) ? null : n;
};

/** Row → customer shape. Defensive: rows predate several migrations. */
export function toCustomerOrder(row: Record<string, unknown>): CustomerOrder {
  const id = String(row.id ?? "");
  const ref = row.external_ref ? String(row.external_ref) : "";

  const city = row.np_city_name ? String(row.np_city_name) : null;
  const where = row.np_warehouse_name
    ? String(row.np_warehouse_name)
    : row.np_address
      ? String(row.np_address)
      : null;

  return {
    id,
    // A reference the customer can actually quote. Orders placed before the
    // Monobank flow have none, so the id's first block stands in — short
    // enough to read down a phone, and unique enough to find the row.
    reference: ref || id.split("-")[0].toUpperCase(),
    createdAt: String(row.created_at ?? ""),
    status: String(row.status ?? "paid"),
    amountEur: num(row.amount_eur),
    amountUah: num(row.amount_uah),
    shippingUah: num(row.shipping_uah) ?? 0,
    ttn: row.np_ttn ? String(row.np_ttn) : null,
    destination: [city, where].filter(Boolean).join(" · ") || null,
    items: Array.isArray(row.order_items)
      ? (row.order_items as Record<string, unknown>[]).map((it) => ({
          id: String(it.id ?? ""),
          slug: String(it.product_id ?? ""),
          name: it.product_name ? String(it.product_name) : null,
          quantity: Number(it.quantity ?? 1),
          priceEur: num(it.price_eur),
          priceUah: num(it.price_uah),
          variant: it.variant ? String(it.variant) : null,
          lid: !!it.addon_lid,
          rubber: !!it.addon_rubber,
        }))
      : [],
  };
}

/** Exactly the columns a customer may see. Anything absent here cannot leak. */
export const CUSTOMER_ORDER_COLUMNS =
  "id, created_at, status, external_ref, amount_eur, amount_uah, shipping_uah, np_ttn, np_city_name, np_warehouse_name, np_address, " +
  "order_items(id, product_id, product_name, quantity, price_eur, price_uah, variant, addon_lid, addon_rubber)";

export function orderTotalText(o: CustomerOrder): { text: string; sub: string | null } {
  return totalFromAmounts(o.amountEur, o.amountUah, o.shippingUah);
}

/* ---- The timeline ------------------------------------------------------ */

/**
 * The four steps an order walks, in order.
 *
 * THESE ARE THE DATABASE'S OWN VALUES, not a parallel enum invented for the
 * UI: orders_status_check allows paid, processing, shipped, delivered and
 * cancelled. If a status ever moves, it moves here first.
 */
export const ORDER_STEPS = ["paid", "processing", "shipped", "delivered"] as const;
export type OrderStep = (typeof ORDER_STEPS)[number];

export type TimelineStep = {
  key: OrderStep;
  label: string;
  state: "done" | "current" | "future";
};

/**
 * The timeline for a status, or null when there isn't one to draw.
 *
 * CANCELLED GETS NO LADDER. It is not a stage on the way to delivery, and
 * drawing it as one — four steps with a red mark somewhere in the middle —
 * would tell the customer a story about progress that is not happening. The
 * detail page states it plainly instead.
 *
 * NOTHING IS PREDICTED. A step is only "done" once the order has actually
 * reached or passed it; the last real status is where the line stops. An order
 * sitting at paid shows shipped and delivered as future, not as promises.
 */
export function timelineFor(status: string, uk: boolean): TimelineStep[] | null {
  const at = ORDER_STEPS.indexOf(status as OrderStep);
  if (at === -1) return null; // cancelled, or a status this build has not met

  return ORDER_STEPS.map((key, i) => ({
    key,
    label: statusLabel(key, uk),
    state: i < at ? "done" : i === at ? "current" : "future",
  }));
}
