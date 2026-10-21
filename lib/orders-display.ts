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
  /** Colour variant (HMD TCT OP Black/Purple), when the product has one. */
  variant: string | null;
  /** HMD add-ons ticked on this line (19 Oct 2026 — the list used to drop them). */
  lid: boolean;
  rubber: boolean;
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
  /** Nova Poshta reports the waybill deleted (2) or unknown (3): never handed over. */
  ttnDead: boolean;
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

  /* When each later step happened (migration 0047, 21 Oct 2026). Null on
     older rows and before the migration — the step then shows no date. */
  packedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
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
      variant: text(i.variant),
      lid: i.addon_lid === true,
      rubber: i.addon_rubber === true,
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
    ttnDead: !!text(row.np_ttn) && (text(row.np_status_code) === "2" || text(row.np_status_code) === "3"),
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

    packedAt: text(row.packed_at),
    shippedAt: text(row.shipped_at),
    deliveredAt: text(row.delivered_at),
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

/* ---------------------------------------------------------------------------
   Which orders are waiting for somebody to buy postage.

   UKRPOSHTA_BOOKING IS OFF, DELIBERATELY. lib/order-ukrposhta stands aside when
   it is, logs "needs a parcel bought by hand" at info and leaves the order
   paid — so the parcel is bought at a counter and the barcode pasted back in
   through OrderUkrposhtaForm. That works at one order a day and stops working
   the week the flagship lands, because nothing on the orders page said which
   orders were waiting. Now it does.

   THE BARCODE IS THE SIGNAL, NOT THE STATUS. Saving one calls markProcessing,
   so an order that has been posted reads `processing` — but so does one moved
   there by hand before anybody went to the post office. The barcode is the
   thing that only exists once the parcel does.

   TERMINAL STATES ARE EXCLUDED, AND NOTHING ELSE IS. A cancelled order needs
   no parcel and a delivered one already had one. Every other status stays in,
   including one this code has never heard of — for a work queue an extra row
   costs a glance, and a missing row costs a customer their parcel. This is the
   one list where showing too much is the safe way to be wrong.

   HERE RATHER THAN IN THE PAGE because it is a rule about an order, like
   orderTotal and statusLabel above it, and because a rule in a page component
   cannot be tested without rendering the page — which this one needs an admin
   session to do.
--------------------------------------------------------------------------- */
const POSTED_OR_DONE = new Set(["shipped", "delivered", "cancelled"]);

export function awaitingParcel(o: AdminOrder): boolean {
  return o.carrier === "ukrposhta" && !o.ukrposhtaBarcode && !POSTED_OR_DONE.has(o.status);
}

/**
 * Any order still waiting to leave the building, whichever carrier.
 *
 * The overview's headline number. It is awaitingParcel's rule extended to
 * Nova Poshta: the tracking number is the signal for both carriers (a waybill
 * for Nova Poshta, a barcode for Ukrposhta), terminal states are excluded, and
 * an unknown status stays IN for the same reason it does there — a spare row
 * costs a glance, a missing one costs a customer their parcel.
 */
export function needsDispatch(o: AdminOrder): boolean {
  if (POSTED_OR_DONE.has(o.status)) return false;
  return o.carrier === "ukrposhta" ? !o.ukrposhtaBarcode : !o.ttn;
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

/* ---------------------------------------------------------------------------
   The progress line (Mario, 21 Oct 2026).

   Every order reads Paid → Packed → Shipped → Delivered. "Processing" alone
   said nothing about WHY an order had not moved, and three paid orders sat on
   it for different reasons — a deleted waybill, a barcode on the wrong
   carrier, a parcel not yet bought.

   GREEN FILLS IN STEP BY STEP. Paid is green the moment the order exists (an
   order row is only written once Monobank confirms payment); each later step
   turns green as it happens. The NEXT step is the orange one — the thing the
   order is waiting on — and the rest are grey.

   THE CARD TAKES ONE TONE: green when delivered (nothing left to do), red when
   it needs Mario, light orange otherwise. Red means a human is the only way
   forward:
     · Nova Poshta deleted the waybill or never heard of it;
     · paid two days ago and still no waybill or barcode;
     · packed five days ago and the carrier has never scanned it.
   The thresholds are generous on purpose — red that cries wolf stops being
   read — and "Mark as shipped" clears the last one when the parcel went out
   under another number.

   Pure, like the rest of this file, and `now` is a parameter so the
   thresholds can be tested without a clock.
--------------------------------------------------------------------------- */

export type StepKey = "paid" | "packed" | "shipped" | "delivered";
export type StepState = "done" | "current" | "todo" | "problem";
export type OrderTone = "done" | "progress" | "problem" | "cancelled";

export type ProgressStep = {
  key: StepKey;
  label: string;
  state: StepState;
  /** When it happened, for a done step that knows. */
  at: string | null;
  /** A few words under the current or problem step: what it is waiting on. */
  note: string | null;
};

const STEP_RANK: Record<string, number> = { paid: 0, processing: 1, shipped: 2, delivered: 3 };
const PAID_NO_PARCEL_MS = 2 * 24 * 3600 * 1000;
const PACKED_NO_SCAN_MS = 5 * 24 * 3600 * 1000;

export function orderProgress(
  o: AdminOrder,
  locale: string,
  now: number = Date.now()
): { steps: ProgressStep[]; tone: OrderTone } {
  const L = (uk: string, en: string) => t(locale, { uk, en, ja: en, ar: en });
  const ukrposhta = o.carrier === "ukrposhta" || (!o.ttn && !!o.ukrposhtaBarcode);
  const hasNumber = ukrposhta ? !!o.ukrposhtaBarcode : !!o.ttn && !o.ttnDead;

  /* How many steps are done. The status is the record, but a number on the
     order is a parcel even where the status lagged (a waybill saved before
     the status write existed), so Packed counts either. */
  const rank = STEP_RANK[o.status] ?? 0;
  const done = Math.max(rank + 1, hasNumber ? 2 : 1);

  const keys: StepKey[] = ["paid", "packed", "shipped", "delivered"];
  const labels: Record<StepKey, string> = {
    paid: L("Оплачено", "Paid"),
    packed: L("Упаковано", "Packed"),
    shipped: L("Відправлено", "Shipped"),
    delivered: L("Доставлено", "Delivered"),
  };
  const at: Record<StepKey, string | null> = {
    paid: o.createdAt,
    packed: o.packedAt,
    shipped: o.shippedAt,
    delivered: o.deliveredAt,
  };

  const steps: ProgressStep[] = keys.map((key, i) => ({
    key,
    label: labels[key],
    state: i < done ? "done" : i === done ? "current" : "todo",
    at: i < done ? at[key] : null,
    note: null,
  }));

  if (o.status === "cancelled") {
    return { steps: steps.map((s) => ({ ...s, state: s.key === "paid" ? "done" : "todo", at: s.key === "paid" ? s.at : null })), tone: "cancelled" };
  }
  if (done >= 4) return { steps, tone: "done" };

  const current = steps[done];
  let problem = false;

  if (o.ttnDead && !ukrposhta) {
    // The waybill is on the order but was never handed over: Packed is the
    // broken step even though a number exists.
    const packed = steps[1];
    packed.state = "problem";
    packed.at = null;
    packed.note = L("накладну видалено", "waybill deleted");
    for (const s of steps.slice(2)) s.state = "todo";
    steps[2].note = null;
    problem = true;
  } else if (current.key === "packed") {
    const age = now - new Date(o.createdAt).getTime();
    const what = ukrposhta ? L("потрібен трек-номер", "needs barcode") : L("потрібна накладна", "needs waybill");
    if (age > PAID_NO_PARCEL_MS) {
      current.state = "problem";
      current.note = L(`${what} · 2+ дні`, `${what} · 2+ days`);
      problem = true;
    } else {
      current.note = what;
    }
  } else if (current.key === "shipped") {
    const since = o.packedAt ? new Date(o.packedAt).getTime() : NaN;
    if (Number.isFinite(since) && now - since > PACKED_NO_SCAN_MS) {
      current.state = "problem";
      current.note = L("немає сканування 5+ днів", "no scan in 5+ days");
      problem = true;
    } else {
      current.note = L("чекає сканування", "waiting for scan");
    }
  } else if (current.key === "delivered") {
    current.note = L("в дорозі", "on its way");
  }

  return { steps, tone: problem ? "problem" : "progress" };
}

/** Problems first, then orders still moving, then finished ones; newest first within each. */
export function sortByAttention(orders: AdminOrder[], locale: string, now: number = Date.now()): AdminOrder[] {
  const weight: Record<OrderTone, number> = { problem: 0, progress: 1, done: 2, cancelled: 3 };
  return orders
    .map((o) => ({ o, w: weight[orderProgress(o, locale, now).tone] }))
    .sort((a, b) => a.w - b.w || b.o.createdAt.localeCompare(a.o.createdAt))
    .map((x) => x.o);
}
