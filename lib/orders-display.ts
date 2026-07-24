import type { DeliveryDetails } from "@/lib/checkout";

/* ---------------------------------------------------------------------------
   Turning a raw `orders` row into what the admin list actually shows.

   Pure and I/O-free on purpose: no Supabase client, no server-only. Reading the
   database and deciding how a row should read are different jobs, and keeping
   them apart means this half can be exercised directly against real rows.

   Everything is read defensively. Rows predate several migrations — the seeded
   demo orders from 0004 carry nothing but a user_id and an amount — so every
   field that arrived later is treated as possibly absent rather than assumed.
--------------------------------------------------------------------------- */

/** One line on an order, snapshotted at purchase time. */
export type AdminOrderItem = {
  productId: string;
  name: string;
  qty: number;
  priceEur: number | null;
  priceUah: number | null;
};

export type DeliveryKind = "warehouse" | "courier" | "international" | "unknown";

export type AdminOrder = {
  id: string;
  /** TCT-XXXXXX where we have it; falls back to a short id for legacy rows. */
  reference: string;
  createdAt: string;
  status: string;
  /** 'monobank' for real paid orders, 'manual' for the seeded demo rows. */
  source: string;
  isGuest: boolean;

  name: string | null;
  email: string | null;
  phone: string | null;

  items: AdminOrderItem[];

  amountEur: number | null;
  amountUah: number | null;
  shippingUah: number;
  discountEur: number;
  voucherCode: string | null;
  currency: string;

  deliveryKind: DeliveryKind;
  /** Branch name, courier address, or international address — already joined. */
  deliveryDetail: string | null;
  deliveryNotes: string | null;
  ttn: string | null;
};

function num(v: unknown): number | null {
  // Guard the empties explicitly: Number(null) and Number("") are both 0, and 0
  // is finite — so without this a NULL amount_uah reads as a ₴0 order rather
  // than "no UAH figure", and the total silently shows as zero.
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function text(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s : null;
}

/** Where the parcel is going, in the shape the admin actually needs to read. */
function describeDelivery(row: Record<string, unknown>, d: Partial<DeliveryDetails>) {
  const method = text(row.shipping_method);

  if (method === "nova_poshta") {
    const city = text(row.np_city_name);
    // np_delivery_type is null on rows predating 0011 — those are warehouse.
    const courier = text(row.np_delivery_type) === "courier";
    const detail = courier ? text(row.np_address) : text(row.np_warehouse_name);
    return {
      kind: (courier ? "courier" : "warehouse") as DeliveryKind,
      detail: [city, detail].filter(Boolean).join(" — ") || null,
    };
  }

  if (method === "international") {
    const detail = [
      [d.address, d.apartment].filter(Boolean).join(", "),
      [d.postcode, d.city].filter(Boolean).join(" "),
      d.country,
    ]
      .map((p) => (p ?? "").trim())
      .filter(Boolean)
      .join(", ");
    return { kind: "international" as DeliveryKind, detail: detail || null };
  }

  return { kind: "unknown" as DeliveryKind, detail: null };
}

/** Map one raw row (with `order_items` embedded) to the display shape. */
export function toOrder(row: Record<string, unknown>): AdminOrder {
  const d = (row.delivery ?? {}) as Partial<DeliveryDetails>;
  const id = String(row.id);
  const { kind, detail } = describeDelivery(row, d);

  const name = [d.firstName, d.surname]
    .map((p) => (p ?? "").trim())
    .filter(Boolean)
    .join(" ");

  const items = (Array.isArray(row.order_items) ? row.order_items : []).map((raw) => {
    const i = raw as Record<string, unknown>;
    return {
      productId: String(i.product_id ?? ""),
      name: text(i.product_name) ?? String(i.product_id ?? "—"),
      qty: Number(i.quantity ?? 1),
      priceEur: num(i.price_eur),
      priceUah: num(i.price_uah),
    };
  });

  return {
    id,
    reference: text(row.external_ref) ?? id.slice(0, 8).toUpperCase(),
    createdAt: String(row.created_at),
    status: text(row.status) ?? "paid",
    source: text(row.source) ?? "manual",
    isGuest: !row.user_id,

    name: name || null,
    email: text(row.email) ?? text(d.email),
    phone: text(d.phone),

    items,

    amountEur: num(row.amount_eur),
    amountUah: num(row.amount_uah),
    shippingUah: num(row.shipping_uah) ?? 0,
    discountEur: num(row.discount_eur) ?? 0,
    voucherCode: text(row.voucher_code),
    currency: text(row.currency) ?? "UAH",

    deliveryKind: kind,
    deliveryDetail: detail,
    deliveryNotes: text(row.np_notes),
    ttn: text(row.np_ttn),
  };
}

/* ---------------------------- display helpers ---------------------------- */

/** What the customer actually paid: goods + postage, in the settled currency. */
export function orderTotal(o: AdminOrder): { text: string; sub: string | null } {
  if (o.amountUah !== null) {
    const total = Math.round(o.amountUah + o.shippingUah);
    const sub =
      o.shippingUah > 0
        ? `goods ₴${Math.round(o.amountUah).toLocaleString("uk-UA")} + delivery ₴${Math.round(o.shippingUah).toLocaleString("uk-UA")}`
        : o.amountEur !== null
          ? `€${o.amountEur.toFixed(2)} goods`
          : null;
    return { text: `₴${total.toLocaleString("uk-UA")}`, sub };
  }
  // Legacy/manual rows carry EUR only.
  return { text: o.amountEur !== null ? `€${o.amountEur.toFixed(2)}` : "—", sub: null };
}

export function deliveryLabel(kind: DeliveryKind, uk: boolean): string {
  if (kind === "warehouse") return uk ? "Відділення" : "Warehouse";
  if (kind === "courier") return uk ? "Курʼєр" : "Courier";
  if (kind === "international") return uk ? "Міжнародна" : "International";
  return "—";
}

export function statusLabel(status: string, uk: boolean): string {
  const map: Record<string, [string, string]> = {
    paid: ["Оплачено", "Paid"],
    shipped: ["Відправлено", "Shipped"],
    delivered: ["Доставлено", "Delivered"],
    cancelled: ["Скасовано", "Cancelled"],
  };
  const hit = map[status];
  return hit ? (uk ? hit[0] : hit[1]) : status;
}

export function formatWhen(iso: string, uk: boolean): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(uk ? "uk-UA" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
