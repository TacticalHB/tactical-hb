import { requireUser } from "@/lib/supabase/require-user";
import { DEFAULT_LOYALTY_CONFIG, type LoyaltyConfig, type Milestone } from "@/lib/loyalty/config";
import { splitVouchers, VOUCHER_COLUMNS, type Voucher } from "@/lib/loyalty/vouchers";
import LoyaltyDashboard from "@/components/account/LoyaltyDashboard";

export default async function LoyaltyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { supabase, user } = await requireUser(locale);
  const uid = user.id;

  const [{ data: cfgRow }, { data: orders }, { data: points }, { data: vouchers }] = await Promise.all([
    supabase.from("loyalty_config").select("*").eq("id", 1).single(),
    supabase.from("orders").select("amount_eur").eq("user_id", uid),
    supabase.from("points_transactions").select("xp, reason, created_at, order_id").eq("user_id", uid).order("created_at", { ascending: false }),
    supabase.from("vouchers").select(VOUCHER_COLUMNS).eq("user_id", uid).order("issued_at", { ascending: false }),
  ]);

  const cfg: LoyaltyConfig = cfgRow
    ? {
        xp_per_eur: Number(cfgRow.xp_per_eur),
        min_order_eur: Number(cfgRow.min_order_eur),
        voucher_expiry_months: Number(cfgRow.voucher_expiry_months),
        uah_per_eur: Number(cfgRow.uah_per_eur),
        milestones: (cfgRow.milestones as Milestone[]).map((m) => ({
          spend_eur: Number(m.spend_eur),
          voucher_eur: Number(m.voucher_eur),
        })),
      }
    : DEFAULT_LOYALTY_CONFIG;

  const totalXP = (points ?? []).reduce((s, p) => s + Number(p.xp), 0);
  const totalSpend = (orders ?? []).reduce((s, o) => s + Number(o.amount_eur), 0);

  const milestones = [...cfg.milestones].sort((a, b) => a.spend_eur - b.spend_eur);
  const reached = milestones.filter((m) => totalSpend >= m.spend_eur);
  const next = milestones.find((m) => totalSpend < m.spend_eur) ?? null;
  const lower = reached.length ? reached[reached.length - 1].spend_eur : 0;
  const progress = next ? Math.max(0, Math.min(1, (totalSpend - lower) / (next.spend_eur - lower))) : 1;

  // Normalise numerics (Postgres numeric arrives as string) then split into the
  // two account sections: unused (main) vs redeemed ("Used vouchers").
  const allVouchers: Voucher[] = (vouchers ?? []).map((v) => ({
    id: String(v.id),
    code: String(v.code),
    amount_eur: Number(v.amount_eur),
    min_order_eur: Number(v.min_order_eur),
    milestone_eur: Number(v.milestone_eur),
    issued_at: String(v.issued_at),
    expires_at: String(v.expires_at),
    used_at: v.used_at ? String(v.used_at) : null,
    used_order_id: v.used_order_id ? String(v.used_order_id) : null,
  }));
  const { activeVouchers, usedVouchers } = splitVouchers(allVouchers);

  return (
    <LoyaltyDashboard
      locale={locale}
      cfg={cfg}
      totalXP={totalXP}
      totalSpend={totalSpend}
      milestones={milestones}
      reachedCount={reached.length}
      next={next}
      progress={progress}
      points={(points ?? []).map((p) => ({ xp: Number(p.xp), reason: String(p.reason), created_at: String(p.created_at) }))}
      activeVouchers={activeVouchers}
      usedVouchers={usedVouchers}
    />
  );
}
