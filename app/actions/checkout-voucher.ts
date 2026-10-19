"use server";

import { createClient } from "@/lib/supabase/server";
import { priceCart } from "@/lib/pricing";
import { findGiftCode, isGiftCodeShape } from "@/lib/gift-codes";

/* ---------------------------------------------------------------------------
   Validate a voucher a customer is trying to apply at checkout.

   Vouchers belong to ONE account (vouchers.user_id is NOT NULL), so this is
   deliberately scoped to the signed-in user. Looking a code up by code alone
   would let anyone who guessed or overheard a code spend someone else's
   voucher. RLS does the scoping: another customer's code simply isn't visible,
   so the answer is "not found" — which also avoids confirming that a code
   exists at all.

   The basket total is recomputed from the catalogue, never taken from the
   caller, so the minimum-order rule can't be passed by inflating a number in
   devtools.

   This decides what to DISPLAY. It is not the final word: the voucher must be
   re-validated server-side when the payment is created, because the basket can
   change between applying it and paying.
--------------------------------------------------------------------------- */

export type VoucherCheck =
  /** amountEur for a loyalty voucher; percent (and amountEur 0) for a gift code. */
  | { ok: true; code: string; amountEur: number; percent?: number }
  | { ok: false; reason: "auth" | "not_found" | "used" | "expired" | "min_order"; minOrderEur?: number };

export async function checkVoucher(rawCode: string, cart: unknown): Promise<VoucherCheck> {
  const code = String(rawCode ?? "").trim().toUpperCase();
  if (!code) return { ok: false, reason: "not_found" };

  /* GIFT CODES FIRST (19 Oct 2026): a percentage off the goods, single-use,
     open to guests — so no sign-in check. Told apart by shape. */
  if (isGiftCodeShape(code)) {
    const gift = await findGiftCode(code);
    if (!gift) return { ok: false, reason: "not_found" };
    if (gift.usedAt) return { ok: false, reason: "used" };
    return { ok: true, code: gift.code, amountEur: 0, percent: gift.percent };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, reason: "auth" };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "auth" };

  const { data, error } = await supabase
    .from("vouchers")
    .select("code, amount_eur, min_order_eur, expires_at, used_at, status")
    .eq("code", code)
    .maybeSingle();

  if (error) {
    console.error("[voucher] lookup failed:", error.code, error.message);
    return { ok: false, reason: "not_found" };
  }
  // Either no such code, or it belongs to someone else and RLS hid it.
  if (!data) return { ok: false, reason: "not_found" };

  if (data.used_at || data.status !== "active") return { ok: false, reason: "used" };
  if (new Date(String(data.expires_at)).getTime() < Date.now()) return { ok: false, reason: "expired" };

  const minOrderEur = Number(data.min_order_eur) || 0;
  const { subtotal } = priceCart(cart);
  if (subtotal.eur < minOrderEur) return { ok: false, reason: "min_order", minOrderEur };

  return { ok: true, code: String(data.code), amountEur: Number(data.amount_eur) };
}
