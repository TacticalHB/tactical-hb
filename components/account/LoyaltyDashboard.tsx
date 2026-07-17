"use client";

import { useEffect, useState } from "react";
import { formatVoucher, type LoyaltyConfig, type Milestone } from "@/lib/loyalty/config";
import type { Voucher } from "@/lib/loyalty/vouchers";
import VoucherCard from "./VoucherCard";

type PointRow = { xp: number; reason: string; created_at: string };

function useCountUp(target: number, ms = 900) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return n;
}

export default function LoyaltyDashboard({
  locale,
  cfg,
  totalXP,
  totalSpend,
  milestones,
  reachedCount,
  next,
  progress,
  points,
  activeVouchers,
  usedVouchers,
}: {
  locale: string;
  cfg: LoyaltyConfig;
  totalXP: number;
  totalSpend: number;
  milestones: Milestone[];
  reachedCount: number;
  next: Milestone | null;
  progress: number;
  points: PointRow[];
  /** used_at IS NULL — spendable (or expired) */
  activeVouchers: Voucher[];
  /** used_at IS NOT NULL — already redeemed */
  usedVouchers: Voucher[];
}) {
  const uk = locale === "uk";
  const xp = useCountUp(totalXP);
  const [barW, setBarW] = useState(0);
  useEffect(() => {
    const id = setTimeout(() => setBarW(progress), 150);
    return () => clearTimeout(id);
  }, [progress]);

  const money = (eur: number) => formatVoucher(eur, cfg, locale);
  const toNext = next ? next.spend_eur - totalSpend : 0;
  const dateFmt = (d: string) => new Date(d).toLocaleDateString(uk ? "uk-UA" : "en-GB", { day: "numeric", month: "short", year: "numeric" });

  const L = {
    title: uk ? "Бонуси Tactical HB" : "Tactical HB Rewards",
    xp: "XP",
    maxTier: uk ? "Максимальний рівень" : "Max tier complete",
    toNext: uk ? "до наступного ваучера" : "to your next voucher",
    voucherWorth: (v: string) => (uk ? `Ваучер на ${v}` : `${v} voucher`),
    earnRate: uk ? `${cfg.xp_per_eur} XP за кожен €1` : `${cfg.xp_per_eur} XP for every €1 spent`,
    vouchers: uk ? "Ваші ваучери" : "Your vouchers",
    noVouchers: uk ? "Ще немає активних ваучерів — витрачайте, щоб відкрити." : "No active vouchers — spend to unlock your first.",
    usedVouchers: uk ? "Використані ваучери" : "Used vouchers",
    history: uk ? "Історія балів" : "Points history",
    noHistory: uk ? "Історія з'явиться після першої покупки." : "Your history appears after your first purchase.",
    reasonOrder: uk ? "Покупка" : "Purchase",
    howTitle: uk ? "Як це працює" : "How it works",
    how: uk
      ? `Отримуйте ${cfg.xp_per_eur} XP за кожен €1. Досягайте етапів витрат, щоб відкривати ваучери. Ваучери діють ${cfg.voucher_expiry_months} міс. і застосовуються до майбутнього замовлення від ${money(cfg.min_order_eur)}.`
      : `Earn ${cfg.xp_per_eur} XP for every €1 you spend. Hit spend milestones to unlock vouchers. Vouchers last ${cfg.voucher_expiry_months} months and apply to a future order over ${money(cfg.min_order_eur)}.`,
  };

  return (
    <div>
      <h1 className="text-3xl font-semibold mb-6" style={{ color: "#111" }}>{uk ? "Бонуси" : "Loyalty"}</h1>

      {/* Hero card (dark + yellow, Gymshark-style) */}
      <div className="rounded-3xl px-7 py-9 sm:px-10 sm:py-12 text-center" style={{ background: "var(--ink)" }}>
        <div className="text-[11px] tracking-[0.3em] uppercase mb-4" style={{ color: "rgba(255,255,255,0.55)" }}>{L.title}</div>
        <div className="font-display leading-none tabular-nums" style={{ color: "var(--accent)", fontSize: "clamp(3.5rem,12vw,6rem)" }}>
          {xp.toLocaleString(uk ? "uk-UA" : "en-GB")}
          <span className="text-[0.28em] align-top ml-2" style={{ color: "rgba(255,255,255,0.6)" }}>{L.xp}</span>
        </div>
        <div className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.55)" }}>{L.earnRate}</div>

        <div className="mt-8 max-w-md mx-auto">
          {next ? (
            <>
              <div className="flex items-end justify-between text-sm mb-2">
                <span style={{ color: "#fff" }}>{money(totalSpend)}</span>
                <span style={{ color: "rgba(255,255,255,0.6)" }}>{money(next.spend_eur)}</span>
              </div>
              <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.15)" }}>
                <div className="h-full rounded-full transition-[width] duration-[1100ms] ease-out" style={{ width: `${barW * 100}%`, background: "var(--accent)" }} />
              </div>
              <div className="text-sm mt-3" style={{ color: "#fff" }}>
                {money(toNext)} {L.toNext} — <span style={{ color: "var(--accent)" }}>{L.voucherWorth(money(next.voucher_eur))}</span>
              </div>
            </>
          ) : (
            <div className="py-2">
              <div className="h-2.5 rounded-full" style={{ background: "var(--accent)" }} />
              <div className="text-sm mt-3 font-medium" style={{ color: "var(--accent)" }}>{L.maxTier}</div>
            </div>
          )}
        </div>
      </div>

      {/* Milestone chips */}
      <div className="flex flex-wrap gap-2 mt-4">
        {milestones.map((m, i) => {
          const done = i < reachedCount;
          return (
            <div key={m.spend_eur} className="text-xs px-3 py-1.5 rounded-full border" style={{
              borderColor: done ? "#111" : "var(--border)",
              background: done ? "#111" : "transparent",
              color: done ? "#fff" : "var(--text-muted)",
            }}>
              {done ? "✓ " : ""}{money(m.spend_eur)} → {money(m.voucher_eur)}
            </div>
          );
        })}
      </div>

      {/* Vouchers — only unused ones here (used_at IS NULL) */}
      <h2 className="text-lg font-semibold mt-12 mb-4" style={{ color: "#111" }}>{L.vouchers}</h2>
      {activeVouchers.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>{L.noVouchers}</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {activeVouchers.map((v) => (
            <VoucherCard key={v.id} voucher={v} cfg={cfg} locale={locale} />
          ))}
        </div>
      )}

      {/* Used vouchers — separate section, only rendered when there are any */}
      {usedVouchers.length > 0 && (
        <>
          <h2 className="text-lg font-semibold mt-12 mb-4" style={{ color: "#111" }}>{L.usedVouchers}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {usedVouchers.map((v) => (
              <VoucherCard key={v.id} voucher={v} cfg={cfg} locale={locale} />
            ))}
          </div>
        </>
      )}

      {/* Points history */}
      <h2 className="text-lg font-semibold mt-12 mb-4" style={{ color: "#111" }}>{L.history}</h2>
      {points.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>{L.noHistory}</p>
      ) : (
        <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
          {points.map((p, i) => (
            <li key={i} className="flex items-center justify-between py-3">
              <div>
                <div className="text-sm" style={{ color: "#111" }}>{L.reasonOrder}</div>
                <div className="text-xs" style={{ color: "var(--text-faint)" }}>{dateFmt(p.created_at)}</div>
              </div>
              <div className="text-sm font-medium tabular-nums" style={{ color: p.xp >= 0 ? "#0a7d2c" : "#b42318" }}>
                {p.xp >= 0 ? "+" : ""}{p.xp.toLocaleString(uk ? "uk-UA" : "en-GB")} XP
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* How it works */}
      <div className="mt-12 rounded-2xl p-6" style={{ background: "var(--bg-soft)" }}>
        <div className="text-sm font-semibold mb-1" style={{ color: "#111" }}>{L.howTitle}</div>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{L.how}</p>
      </div>
    </div>
  );
}
