import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/* ---------------------------------------------------------------------------
   Gift promo codes (migration 0046, Mario 19 Oct 2026).

   A percentage off the goods, single-use, usable by anyone — guests included.
   Kept apart from the loyalty vouchers (fixed euro, owned by one account),
   and told apart by shape: GIFT20-7F3A9C. The table is service-role only, so
   every read goes through here, on the server.
--------------------------------------------------------------------------- */

export const GIFT_CODE_PATTERN = /^GIFT\d{2}-[0-9A-F]{6}$/;

export const isGiftCodeShape = (code: string) => GIFT_CODE_PATTERN.test(code.trim().toUpperCase());

export type GiftCode = { code: string; percent: number; usedAt: string | null; usedReference: string | null; createdAt: string };

/** One code, or null when it does not exist (or the table is not there yet). */
export async function findGiftCode(raw: string): Promise<GiftCode | null> {
  const code = raw.trim().toUpperCase();
  if (!GIFT_CODE_PATTERN.test(code)) return null;
  const { data, error } = await createAdminClient()
    .from("gift_codes")
    .select("code, percent, used_at, used_reference, created_at")
    .eq("code", code)
    .maybeSingle();
  if (error || !data) return null;
  return {
    code: String(data.code),
    percent: Number(data.percent),
    usedAt: data.used_at ? String(data.used_at) : null,
    usedReference: data.used_reference ? String(data.used_reference) : null,
    createdAt: String(data.created_at),
  };
}

/** Every code, for Admin › Vouchers: unused first, then by percentage. */
export async function listGiftCodes(): Promise<GiftCode[] | null> {
  const { data, error } = await createAdminClient()
    .from("gift_codes")
    .select("code, percent, used_at, used_reference, created_at")
    .order("percent", { ascending: false })
    .order("code", { ascending: true });
  if (error) return null;
  return (data ?? []).map((d) => ({
    code: String(d.code),
    percent: Number(d.percent),
    usedAt: d.used_at ? String(d.used_at) : null,
    usedReference: d.used_reference ? String(d.used_reference) : null,
    createdAt: String(d.created_at),
  }));
}

/** Spend a code on a paid order. True if this call spent it. Never throws. */
export async function markGiftCodeUsed(code: string, reference: string): Promise<boolean> {
  try {
    const { data, error } = await createAdminClient().rpc("mark_gift_code_used", { p_code: code, p_reference: reference });
    if (error) {
      console.error("[gift] mark used failed:", error.message);
      return false;
    }
    return !!(data && (data as { code?: string }).code);
  } catch (e) {
    console.error("[gift] mark used threw:", e);
    return false;
  }
}
