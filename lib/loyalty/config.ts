/* ---------------------------------------------------------------------------
   Loyalty configuration (display defaults).

   The single source of truth for ACCRUAL lives in the `loyalty_config` row in
   Supabase (so values can be changed without a redeploy, and DB triggers read
   the same numbers). These defaults mirror that row and are used by the UI as
   an instant fallback before the live config loads. Keep them in sync with the
   `loyalty_config` table.
--------------------------------------------------------------------------- */

export type Milestone = { spend_eur: number; voucher_eur: number };

export type LoyaltyConfig = {
  xp_per_eur: number;
  min_order_eur: number;
  voucher_expiry_months: number;
  uah_per_eur: number;
  milestones: Milestone[];
};

export const DEFAULT_LOYALTY_CONFIG: LoyaltyConfig = {
  xp_per_eur: 10, // 10 XP per €1 spent
  min_order_eur: 35, // minimum order value to redeem a voucher
  voucher_expiry_months: 3, // vouchers expire 3 months after issue
  uah_per_eur: 50, // display rate: €10 → 500 UAH, €25 → 1,250 UAH
  milestones: [
    { spend_eur: 100, voucher_eur: 10 },
    { spend_eur: 250, voucher_eur: 25 },
  ],
};

/** Format a euro voucher amount for display, localised to UAH when needed. */
export function formatVoucher(amountEur: number, cfg: LoyaltyConfig, locale: string): string {
  if (locale === "uk") {
    return `${(amountEur * cfg.uah_per_eur).toLocaleString("uk-UA")} UAH`;
  }
  return `€${amountEur}`;
}
