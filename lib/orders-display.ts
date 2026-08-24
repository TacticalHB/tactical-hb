import type { DeliveryDetails } from "@/lib/checkout";
import { t, type Text } from "@/lib/i18n-text";

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
  /** Nova Poshta's waybill number. Null on an Ukrposhta parcel. */
  ttn: string | null;
  /** 'nova_poshta' | 'ukrposhta'. Null on orders predating the choice. */
  carrier: string | null;
  /** Ukrposhta's tracking barcode. Null on a Nova Poshta parcel. */
  ukrposhtaBarcode: string | null;
  /** Ukrposhta's own handle for the shipment, for API calls about it. */
  ukrposhtaUuid: string | null;

  /* PRRO. A receipt id means a fiscal document exists; an error means one is
     owed and nobody has issued it. Both null on orders predating migration 0024
     and on orders that were never attempted. */
  fiscalReceiptId: string | null;
  fiscalisedAt: string | null;
  fiscalError: string | null;
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
    /* WHO IS CARRYING IT. Null on every row placed before carriers were a
       choice, which the admin renders as Nova Post rather than as a gap —
       that is what those orders were. */
    carrier: text(row.shipping_carrier),
    /* Ukrposhta's own identifiers, kept apart from np_ttn: different
       carrier, different format, and the tracking job must never confuse
       one for the other. */
    ukrposhtaBarcode: text(row.ukrposhta_barcode),
    ukrposhtaUuid: text(row.ukrposhta_uuid),

    fiscalReceiptId: text(row.checkbox_receipt_id),
    fiscalisedAt: text(row.checkbox_fiscalised_at),
    fiscalError: text(row.checkbox_error),
  };
}

/* ---------------------------- display helpers ---------------------------- */

/** What the customer actually paid: goods + postage, in the settled currency. */
/**
 * What an order cost, from the three amounts a row actually stores.
 *
 * Split out from orderTotal so the customer's own order history can print the
 * same figure the admin sees, without the customer half importing an AdminOrder
 * and everything on it. Two screens disagreeing about what someone paid is the
 * kind of bug that arrives as an email rather than a bug report.
 *
 * The hryvnia is the charged amount — Monobank bills UAH — and the euro is what
 * a euro-storefront customer was quoted. Legacy rows carry EUR only.
 */
export function totalFromAmounts(
  amountEur: number | null,
  amountUah: number | null,
  shippingUah: number
): { text: string; sub: string | null } {
  if (amountUah !== null) {
    const total = Math.round(amountUah + shippingUah);
    const sub =
      shippingUah > 0
        ? `goods ₴${Math.round(amountUah).toLocaleString("uk-UA")} + delivery ₴${Math.round(shippingUah).toLocaleString("uk-UA")}`
        : amountEur !== null
          ? `€${amountEur.toFixed(2)} goods`
          : null;
    return { text: `₴${total.toLocaleString("uk-UA")}`, sub };
  }
  // Legacy/manual rows carry EUR only.
  return { text: amountEur !== null ? `€${amountEur.toFixed(2)}` : "—", sub: null };
}

export function orderTotal(o: AdminOrder): { text: string; sub: string | null } {
  return totalFromAmounts(o.amountEur, o.amountUah, o.shippingUah);
}

export function deliveryLabel(kind: DeliveryKind, locale: string): string {
  if (kind === "warehouse") return t(locale, { uk: "Відділення", en: "Warehouse", ja: "営業所", ar: "فرع" });
  if (kind === "courier") return t(locale, { uk: "Курʼєр", en: "Courier", ja: "宅配", ar: "توصيل" });
  if (kind === "international") return t(locale, { uk: "Міжнародна", en: "International", ja: "海外", ar: "دولي" });
  return "—";
}

export function statusLabel(status: string, locale: string): string {
  const map: Record<string, Text> = {
    paid: { uk: "Оплачено", en: "Paid", ja: "支払い済み", ar: "مدفوع" },
    processing: { uk: "В обробці", en: "Processing", ja: "準備中", ar: "قيد التجهيز" },
    shipped: { uk: "Відправлено", en: "Shipped", ja: "発送済み", ar: "تم الشحن" },
    delivered: { uk: "Доставлено", en: "Delivered", ja: "配達済み", ar: "تم التسليم" },
    cancelled: { uk: "Скасовано", en: "Cancelled", ja: "キャンセル済み", ar: "مُلغى" },
  };
  const hit = map[status];
  return hit ? t(locale, hit) : status;
}

export function formatWhen(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(t(locale, { uk: "uk-UA", en: "en-GB", ja: "ja-JP", ar: "ar-u-nu-latn" }), {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
