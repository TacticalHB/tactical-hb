"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Voucher } from "@/lib/loyalty/vouchers";

/* ---------------------------------------------------------------------------
   Voucher redemption — the single choke point for "this voucher was spent".

   Everything that redeems a voucher should funnel through markVoucherUsed():
     • today  — called manually (admin/testing)
     • later  — called by the Shopify order webhook once it confirms the
                discount code was actually applied to a paid order

   It delegates to the SQL function public.mark_voucher_used(), which is
   SECURITY DEFINER + service_role-only and IDEMPOTENT (a retry keeps the
   original used_at). That matters: webhooks are delivered at-least-once.
--------------------------------------------------------------------------- */

export type MarkVoucherResult =
  /** `alreadyUsed: null` = the redemption succeeded but we couldn't determine
   *  whether it was a replay (the diagnostic read failed). Never silently
   *  report `false` for that case — that hid a missing-grants bug once. */
  | { ok: true; voucher: Voucher; alreadyUsed: boolean | null }
  | { ok: false; error: string };

/**
 * Mark a voucher as used.
 *
 * @param code    the voucher code, e.g. "TCT-9F3A2B7C"
 * @param orderId optional order reference (Shopify order id later)
 *
 * Safe to call more than once for the same code — the first redemption wins.
 */
export async function markVoucherUsed(code: string, orderId?: string): Promise<MarkVoucherResult> {
  const trimmed = code?.trim();
  if (!trimmed) return { ok: false, error: "A voucher code is required." };

  try {
    const admin = createAdminClient();

    // Read first so we can report whether this call actually redeemed it or
    // was a no-op replay (useful for webhook logs). Diagnostic only — a
    // failure here must not block the redemption itself.
    const { data: before, error: beforeError } = await admin
      .from("vouchers")
      .select("used_at")
      .eq("code", trimmed)
      .maybeSingle();

    if (beforeError) {
      console.error("[markVoucherUsed] replay check failed:", beforeError.code, beforeError.message);
    }

    const { data, error } = await admin.rpc("mark_voucher_used", {
      p_code: trimmed,
      p_order_id: orderId ?? null,
    });

    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: false, error: `Voucher ${trimmed} not found.` };

    // Refresh the account pages that display vouchers.
    revalidatePath("/[locale]/account/loyalty", "page");

    return {
      ok: true,
      voucher: data as Voucher,
      alreadyUsed: beforeError ? null : !!before?.used_at,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to mark voucher used." };
  }
}
