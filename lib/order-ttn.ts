import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createTtn, type TtnDestination } from "@/lib/nova-poshta-ttn";
import type { PaymentRow } from "@/lib/fulfilment";

/* ---------------------------------------------------------------------------
   Turning a paid order into a Nova Poshta waybill.

   BEST EFFORT, ALWAYS. This runs after the order exists and the money is in;
   nothing it does may undo either. Every failure path ends the same way: log
   loudly, leave the order 'paid', and let an admin create the waybill by hand
   from /admin/orders. An order without a TTN is an afternoon's inconvenience;
   an order lost because a courier API was down is a customer who paid for
   nothing.

   Orders only reach 'processing' once a waybill actually exists, which makes
   'paid' exactly the queue of things still needing one.
--------------------------------------------------------------------------- */

export type TtnOutcome =
  | { ok: true; number: string }
  | { ok: false; reason: string };

/** Why this order can't have a waybill made for it automatically. */
function ineligible(p: PaymentRow): string | null {
  if (p.shipping_method !== "nova_poshta") {
    return `shipping method is ${p.shipping_method ?? "unset"} — not a Nova Poshta parcel`;
  }
  if (!p.np_city_ref) return "no Nova Poshta city on the order";

  const d = p.delivery as Record<string, string>;
  if (!d?.firstName?.trim() || !d?.surname?.trim()) return "recipient name missing";
  if (!d?.phone?.trim()) return "recipient phone missing";

  if (p.np_delivery_type === "courier") {
    // Orders placed before the structured address columns existed carry only
    // the joined np_address line, which cannot be resolved into a street ref.
    if (!p.np_street?.trim() || !p.np_building?.trim()) {
      return "courier address not structured (pre-0013 order) — create the waybill by hand";
    }
  } else if (!p.np_warehouse_ref) {
    return "no Nova Poshta branch on the order";
  }

  return null;
}

/** What goes on the waybill so a parcel is identifiable without a lookup. */
function describeParcel(p: PaymentRow): string {
  const goods = p.lines.map((l) => `${l.qty}x ${l.name}`).join(", ");
  return `${p.reference} — ${goods}`.slice(0, 250);
}

function destinationFor(p: PaymentRow): TtnDestination {
  if (p.np_delivery_type === "courier") {
    return {
      kind: "courier",
      cityRef: p.np_city_ref as string,
      street: p.np_street as string,
      building: p.np_building as string,
      flat: p.np_flat,
    };
  }
  return {
    kind: "warehouse",
    cityRef: p.np_city_ref as string,
    warehouseRef: p.np_warehouse_ref as string,
  };
}

/**
 * Create the waybill for a freshly paid order and record it.
 *
 * Never throws — the caller is the payment webhook, and a raised error there
 * would look like a delivery failure to Monobank and trigger pointless retries
 * against an order that is already complete.
 */
export async function createTtnForOrder(orderId: string, payment: PaymentRow): Promise<TtnOutcome> {
  const why = ineligible(payment);
  if (why) {
    console.log("[ttn] skipped for", payment.reference, "—", why);
    return { ok: false, reason: why };
  }

  const d = payment.delivery as Record<string, string>;

  try {
    const ttn = await createTtn({
      recipient: {
        firstName: d.firstName.trim(),
        lastName: d.surname.trim(),
        phone: d.phone.trim(),
      },
      destination: destinationFor(payment),
      // Insure for the merchandise value, which is what the customer would
      // lose. Postage is excluded — it isn't part of the parcel's worth.
      declaredValueUah: payment.amount_uah,
      description: describeParcel(payment),
    });

    const admin = createAdminClient();
    const { error } = await admin
      .from("orders")
      .update({ np_ttn: ttn.number, np_ttn_ref: ttn.ref, status: "processing" })
      .eq("id", orderId);

    if (error) {
      // The waybill exists at Nova Poshta but we failed to record it. Loud,
      // because it will otherwise be created a second time by hand.
      console.error(
        "[ttn] CREATED BUT NOT SAVED — record it manually.",
        "order:", orderId, "reference:", payment.reference,
        "ttn:", ttn.number, "error:", error.code, error.message
      );
      return { ok: false, reason: `created ${ttn.number} but the database write failed` };
    }

    console.log("[ttn] created", ttn.number, "for", payment.reference,
      ttn.costUah !== null ? `(₴${ttn.costUah})` : "");
    return { ok: true, number: ttn.number };
  } catch (e) {
    // Order stays 'paid' — the admin queue for waybills made by hand.
    console.error("[ttn] creation failed for", payment.reference, "—", e);
    return { ok: false, reason: e instanceof Error ? e.message : "unknown error" };
  }
}
