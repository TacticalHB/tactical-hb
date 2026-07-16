/* ---------------------------------------------------------------------------
   Voucher types + pure lifecycle helpers.

   `used_at` is the single source of truth for "has this been spent?".
   (`status` / `redeemed_at` are legacy columns kept in sync by
   public.mark_voucher_used — prefer used_at everywhere in app code.)

   Pure functions only, so they're usable from server components, client
   components and tests alike.
--------------------------------------------------------------------------- */

export interface Voucher {
  id: string;
  code: string;
  amount_eur: number;
  min_order_eur: number;
  milestone_eur: number;
  issued_at: string;
  expires_at: string;
  /** NULL = never redeemed. Set = the moment it was spent. */
  used_at: string | null;
  /** Order it was spent on (text: Shopify order id later). */
  used_order_id: string | null;
}

/** Three visible states. Expired only applies to vouchers never used. */
export type VoucherState = "active" | "expired" | "used";

export function getVoucherState(v: Voucher, now: Date = new Date()): VoucherState {
  if (v.used_at) return "used"; // used wins: a spent voucher isn't "expired"
  if (new Date(v.expires_at).getTime() < now.getTime()) return "expired";
  return "active";
}

export type SplitVouchers = {
  /** used_at IS NULL — the main section (includes expired-but-unused). */
  activeVouchers: Voucher[];
  /** used_at IS NOT NULL — the "Used" section. */
  usedVouchers: Voucher[];
};

/**
 * Split a flat list into the two account sections.
 * Active are sorted soonest-to-expire first (most urgent to spend);
 * used are sorted most-recently-used first.
 */
export function splitVouchers(vouchers: Voucher[]): SplitVouchers {
  const activeVouchers = vouchers
    .filter((v) => !v.used_at)
    .sort((a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime());

  const usedVouchers = vouchers
    .filter((v) => !!v.used_at)
    .sort((a, b) => new Date(b.used_at!).getTime() - new Date(a.used_at!).getTime());

  return { activeVouchers, usedVouchers };
}

/** Columns to select — one list so every query stays in sync with the type. */
export const VOUCHER_COLUMNS =
  "id, code, amount_eur, min_order_eur, milestone_eur, issued_at, expires_at, used_at, used_order_id";
