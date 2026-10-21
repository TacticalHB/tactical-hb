"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { createTtnForOrder } from "@/lib/order-ttn";
import { fiscaliseOrderRow, type PaymentRow } from "@/lib/fulfilment";
import { stampOrderStep } from "@/lib/order-steps";
import { advanceOrderByHand, runTracking } from "@/lib/order-tracking";

/* ---------------------------------------------------------------------------
   Admin: attach a carrier's tracking number to an order — one action per
   carrier, because a waybill and a postal barcode are different documents
   with different shapes going into different columns.

   AUTHORISATION LIVES HERE, not on the page that renders the form. Next.js
   exposes every exported server action as its own endpoint, so guarding only
   the admin page would be theatre — anyone holding the action id could write
   to any order. This runs with the service-role key and bypasses RLS, so it
   establishes for itself that the caller is an admin. Same reasoning as
   markVoucherUsed().

   Stage 2 will book the consignment with Nova Poshta directly; for now the
   number is pasted in by hand.

   PASTING A NUMBER MOVES THE ORDER TO 'processing', and that is not cosmetic.
   The tracking cron only looks at orders that have left 'paid' (Nova Poshta)
   and the admin reads 'paid' as "this one still needs a parcel buying". A
   hand-pasted waybill left the order on 'paid', so it sat in the dispatch
   queue as outstanding work AND was never tracked — no status, no shipping
   email, for exactly the orders a human had to handle personally. Both
   automated paths (lib/order-ttn, lib/order-ukrposhta) already write the
   status alongside the number; these now do the same.
--------------------------------------------------------------------------- */

export type SaveTtnResult = { ok: true; ttn: string | null } | { ok: false; error: string };

/** Nova Poshta consignment numbers are 14 digits, but we accept spaces too. */
function normalise(raw: string): string {
  return raw.replace(/\s+/g, "").trim();
}

/**
 * Save (or clear) an order's Nova Poshta TTN.
 *
 * Passing an empty string clears it — useful when a consignment is cancelled
 * and rebooked, which would otherwise leave a dead number on the order.
 */
export async function saveOrderTtn(orderId: string, ttn: string): Promise<SaveTtnResult> {
  // Authorise BEFORE touching anything. Deliberately vague to the caller: a
  // stranger probing this endpoint learns nothing about who is an admin.
  const supabase = await createClient();
  const caller = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!isAdminEmail(caller?.email)) {
    console.warn("[saveOrderTtn] refused for", caller?.email ?? "anonymous");
    return { ok: false, error: "Not authorised." };
  }

  const id = orderId?.trim();
  if (!id) return { ok: false, error: "An order id is required." };

  const value = normalise(ttn ?? "");
  // Only a length/shape sanity check — a real number we refuse would block a
  // dispatch, which is worse than storing an odd one.
  if (value && !/^\d{8,20}$/.test(value)) {
    return { ok: false, error: "A TTN should be 8–20 digits." };
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("orders")
      /* The status code belonged to the OLD number. Left behind, a deleted
         waybill's "2" kept the order red after Mario pasted the number the
         parcel really went under (TCT-LAS6TL); the next tracking run fills it
         in for the new one. */
      .update({ np_ttn: value || null, np_status_code: null, np_status_checked_at: null })
      .eq("id", id);

    if (error) {
      console.error("[saveOrderTtn] update failed:", error.code, error.message);
      return { ok: false, error: error.message };
    }

    await markProcessing(id, value);

    revalidatePath("/[locale]/admin/orders", "page");
    return { ok: true, ttn: value || null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save the TTN." };
  }
}

export type CreateTtnResult = { ok: true; ttn: string } | { ok: false; error: string };

/**
 * Book the Nova Poshta waybill for a paid order — the same code the payment
 * webhook runs, pressed by a human.
 *
 * WHY IT EXISTS. When the automatic booking failed, the only way out was the
 * Nova Poshta cabinet and a pasted number, and the reason it failed was in a
 * log nobody could read. This retries the real thing with production's own
 * settings and puts Nova Poshta's answer on the screen.
 *
 * NEVER A SECOND WAYBILL. Refused unless the order is still 'paid' with no
 * number on it, re-read here rather than trusted from the page — a stale tab
 * pressed after someone pasted a number must not book the parcel twice.
 */
export async function createOrderTtn(orderId: string): Promise<CreateTtnResult> {
  const supabase = await createClient();
  const caller = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!isAdminEmail(caller?.email)) {
    console.warn("[createOrderTtn] refused for", caller?.email ?? "anonymous");
    return { ok: false, error: "Not authorised." };
  }

  const id = orderId?.trim();
  if (!id) return { ok: false, error: "An order id is required." };

  try {
    const admin = createAdminClient();
    const { data: order, error: oErr } = await admin
      .from("orders")
      .select("id, status, np_ttn, np_status_code")
      .eq("id", id)
      .maybeSingle();
    if (oErr || !order) return { ok: false, error: oErr?.message ?? "Order not found." };
    /* A waybill Nova Poshta has DELETED (2) or does not know (3) was never
       handed over, so it may be replaced (19 Oct 2026, TCT-LAS6TL). Any other
       existing waybill is real and is not touched. */
    const dead = !!order.np_ttn && (order.np_status_code === "2" || order.np_status_code === "3");
    if (order.np_ttn && !dead) return { ok: false, error: `This order already has a waybill: ${order.np_ttn}.` };
    if (order.status !== "paid" && !(dead && order.status === "processing")) {
      return { ok: false, error: `Only a paid order can be booked (this one is ${order.status}).` };
    }

    // The payment row carries the delivery details the waybill is built from.
    const { data: payment, error: pErr } = await admin
      .from("payments")
      .select("*")
      .eq("order_id", id)
      .maybeSingle();
    if (pErr || !payment) {
      return { ok: false, error: "No payment is linked to this order — create the waybill in the Nova Poshta cabinet." };
    }

    const res = await createTtnForOrder(id, payment as PaymentRow, { alert: false });
    revalidatePath("/[locale]/admin/orders", "page");
    return res.ok ? { ok: true, ttn: res.number } : { ok: false, error: res.reason };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not create the waybill." };
  }
}

/**
 * A parcel exists, so the order is being processed.
 *
 * ONLY EVER FROM 'paid', AND ONLY FORWARD. The condition is in the WHERE
 * clause rather than read first and decided in JavaScript: a shipped or
 * delivered order must not be walked backwards because somebody corrected a
 * typo in its number, and a cancelled one must not be quietly revived.
 *
 * Clearing the number does NOT undo it. The parcel was still booked, and the
 * usual reason to clear is that it is being rebooked; dropping the order back
 * to 'paid' would put it back in the "needs buying" queue mid-rebooking.
 *
 * Never throws: the number is saved by the time this runs, and failing to
 * tidy the status is not a reason to tell the admin their paste failed.
 */
async function markProcessing(orderId: string, value: string): Promise<void> {
  if (!value) return;
  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("orders")
      .update({ status: "processing" })
      .eq("id", orderId)
      .eq("status", "paid");
    if (error) console.error("[orders] could not advance to processing:", error.code, error.message);
    await stampOrderStep(orderId, "packed");
  } catch (e) {
    console.error("[orders] could not advance to processing:", e);
  }
}

export type SaveBarcodeResult = { ok: true; barcode: string | null } | { ok: false; error: string };

/**
 * Ukrposhta barcodes come in two published shapes.
 *
 *   CV062216404UA   S10 (UPU): two letters, nine digits, a two-letter country
 *   0500012345678   domestic: thirteen digits
 *
 * Both are thirteen characters, and the tracking site prints them in groups —
 * "CV 0622 1640 4UA" — so spaces and hyphens are stripped before checking
 * rather than rejected. Letters are upper-cased for the same reason: what is
 * copied off a label is not always what a form wants.
 */
function normaliseBarcode(raw: string): string {
  return raw.replace(/[\s-]+/g, "").trim().toUpperCase();
}

const S10 = /^[A-Z]{2}\d{9}[A-Z]{2}$/;
const DOMESTIC = /^\d{13}$/;

/**
 * Save (or clear) an order's Ukrposhta barcode.
 *
 * A SEPARATE COLUMN AND A SEPARATE ACTION FROM THE TTN, deliberately: migration
 * 0028 kept ukrposhta_barcode apart from np_ttn so the tracking cron can never
 * ask one carrier about the other's number, and one form writing either would
 * hand that mistake straight back.
 *
 * THIS IS THE ONLY WAY A BARCODE REACHES AN ORDER WHILE UKRPOSHTA_BOOKING IS
 * OFF. Parcels are bought at the counter in that mode, and until this existed
 * the number on the receipt had nowhere to go — so the tracking pass had
 * nothing to track and the customer got no shipping email.
 */
export async function saveOrderUkrposhtaBarcode(
  orderId: string,
  barcode: string
): Promise<SaveBarcodeResult> {
  const supabase = await createClient();
  const caller = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!isAdminEmail(caller?.email)) {
    console.warn("[saveOrderUkrposhtaBarcode] refused for", caller?.email ?? "anonymous");
    return { ok: false, error: "Not authorised." };
  }

  const id = orderId?.trim();
  if (!id) return { ok: false, error: "An order id is required." };

  const value = normaliseBarcode(barcode ?? "");
  if (value && !S10.test(value) && !DOMESTIC.test(value)) {
    return {
      ok: false,
      error: "An Ukrposhta barcode is 13 characters — CV123456789UA, or 13 digits.",
    };
  }

  try {
    const admin = createAdminClient();
    /* A BARCODE MEANS UKRPOSHTA IS CARRYING IT (21 Oct 2026). TCT-BCWJ4J was
       booked as Nova Poshta, sent by Ukrposhta, and kept saying Nova Poshta —
       so the shipping email would have linked a Nova Poshta tracking page
       with no number on it. Unless the order also holds a live Nova Poshta
       waybill (then the barcode is a second document, not a change of
       carrier), saving a barcode switches the carrier with it. */
    const { data: current } = await admin
      .from("orders")
      .select("shipping_carrier, np_ttn, np_status_code")
      .eq("id", id)
      .maybeSingle();
    const liveWaybill =
      !!current?.np_ttn && current.np_status_code !== "2" && current.np_status_code !== "3";
    const patch: Record<string, unknown> = { ukrposhta_barcode: value || null };
    if (value && current && current.shipping_carrier !== "ukrposhta" && !liveWaybill) {
      patch.shipping_carrier = "ukrposhta";
    }
    const { error } = await admin
      .from("orders")
      .update(patch)
      .eq("id", id);

    if (error) {
      console.error("[saveOrderUkrposhtaBarcode] update failed:", error.code, error.message);
      return { ok: false, error: error.message };
    }

    await markProcessing(id, value);

    revalidatePath("/[locale]/admin/orders", "page");
    return { ok: true, barcode: value || null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save the barcode." };
  }
}

export type ReissueReceiptResult = { ok: true; receiptId: string } | { ok: false; error: string };

/**
 * Re-issue the Checkbox fiscal receipt for a paid order whose receipt failed
 * (19 Oct 2026 — TCT-BCWJ4J was refused by an expired shift). Runs the very
 * same step the payment webhook runs; the receipt id is derived from the order
 * reference, so pressing it twice can never create two fiscal documents.
 */
export async function reissueOrderReceipt(orderId: string): Promise<ReissueReceiptResult> {
  const supabase = await createClient();
  const caller = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!isAdminEmail(caller?.email)) {
    console.warn("[reissueOrderReceipt] refused for", caller?.email ?? "anonymous");
    return { ok: false, error: "Not authorised." };
  }
  const id = orderId?.trim();
  if (!id) return { ok: false, error: "An order id is required." };

  try {
    const admin = createAdminClient();
    const { data: order } = await admin.from("orders").select("id, checkbox_receipt_id").eq("id", id).maybeSingle();
    if (!order) return { ok: false, error: "Order not found." };
    if (order.checkbox_receipt_id) return { ok: true, receiptId: order.checkbox_receipt_id };

    const { data: payment } = await admin.from("payments").select("*").eq("order_id", id).maybeSingle();
    if (!payment) return { ok: false, error: "No payment is linked to this order — issue the receipt in the Checkbox app." };

    await fiscaliseOrderRow(id, payment as PaymentRow);
    const { data: after } = await admin
      .from("orders")
      .select("checkbox_receipt_id, checkbox_error")
      .eq("id", id)
      .maybeSingle();
    revalidatePath("/[locale]/admin/orders", "page");
    return after?.checkbox_receipt_id
      ? { ok: true, receiptId: after.checkbox_receipt_id }
      : { ok: false, error: after?.checkbox_error ?? "Checkbox did not issue the receipt." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not issue the receipt." };
  }
}

/* ---------------------------------------------------------------------------
   The progress line's buttons (21 Oct 2026).

   Mark as shipped / delivered move an order forward by hand, through the very
   code the carriers' tracking uses (lib/order-tracking advanceOrderByHand) —
   so "shipped" sends the customer the usual on-its-way email, once. Check
   tracking now is the evening cron's tracking pass, run while Mario watches
   instead of at 21:00 Kyiv, with what it found put on the screen.
--------------------------------------------------------------------------- */

async function callerIsAdmin(tag: string): Promise<boolean> {
  const supabase = await createClient();
  const caller = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (isAdminEmail(caller?.email)) return true;
  console.warn(`[${tag}] refused for`, caller?.email ?? "anonymous");
  return false;
}

export type AdvanceOrderResult = { ok: true; emailed: boolean } | { ok: false; error: string };

export async function markOrderAdvanced(orderId: string, target: "shipped" | "delivered"): Promise<AdvanceOrderResult> {
  if (!(await callerIsAdmin("markOrderAdvanced"))) return { ok: false, error: "Not authorised." };
  const id = orderId?.trim();
  if (!id) return { ok: false, error: "An order id is required." };
  if (target !== "shipped" && target !== "delivered") return { ok: false, error: "Unknown step." };
  try {
    const res = await advanceOrderByHand(id, target);
    revalidatePath("/[locale]/admin/orders", "page");
    return res;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not update the order." };
  }
}

export type CheckTrackingResult =
  | { ok: true; checked: number; shipped: number; delivered: number; emailed: number; notes: string[] }
  | { ok: false; error: string };

export async function checkTrackingNow(): Promise<CheckTrackingResult> {
  if (!(await callerIsAdmin("checkTrackingNow"))) return { ok: false, error: "Not authorised." };
  try {
    const r = await runTracking();
    revalidatePath("/[locale]/admin/orders", "page");
    return { ok: true, checked: r.checked, shipped: r.shipped, delivered: r.delivered, emailed: r.emailed, notes: r.notes };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Tracking could not run." };
  }
}
