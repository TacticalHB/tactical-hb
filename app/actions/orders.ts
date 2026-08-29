"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";

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
      .update({ np_ttn: value || null })
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
    const { error } = await admin
      .from("orders")
      .update({ ukrposhta_barcode: value || null })
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
