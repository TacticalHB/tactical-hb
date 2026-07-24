"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";

/* ---------------------------------------------------------------------------
   Admin: attach a Nova Poshta tracking number to an order.

   AUTHORISATION LIVES HERE, not on the page that renders the form. Next.js
   exposes every exported server action as its own endpoint, so guarding only
   the admin page would be theatre — anyone holding the action id could write
   to any order. This runs with the service-role key and bypasses RLS, so it
   establishes for itself that the caller is an admin. Same reasoning as
   markVoucherUsed().

   Stage 2 will book the consignment with Nova Poshta directly; for now the
   number is pasted in by hand.
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

    revalidatePath("/[locale]/admin/orders", "page");
    return { ok: true, ttn: value || null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save the TTN." };
  }
}
