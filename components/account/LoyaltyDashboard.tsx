"use client";

import Link from "next/link";
import { t } from "@/lib/i18n-text";
import { useEffect, useState } from "react";
import { formatVoucher, type LoyaltyConfig, type Milestone } from "@/lib/loyalty/config";
import type { Voucher } from "@/lib/loyalty/vouchers";
import { COLONEL_DISCOUNT_RATE, RANKS, TOP_RANK as TOP, type RankProgress } from "@/lib/loyalty/ranks";
import RankBadge from "./RankBadge";
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
  rank,
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
  /** Derived on the server from the same lifetime spend the vouchers use. */
  rank: RankProgress;
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
  const dateFmt = (d: string) => new Date(d).toLocaleDateString(t(locale, { uk: "uk-UA", en: "en-GB", ja: "ja-JP" }), { day: "numeric", month: "short", year: "numeric" });

  const pct = Math.round(COLONEL_DISCOUNT_RATE * 100);
  const rankName = (r: { en: string; uk: string }) => (uk ? r.uk : r.en);

  /* Rank thresholds are NOT run through money(). That helper converts a euro
     figure at the loyalty rate, which is exactly the shortcut that once put
     Colonel ₴13 000 early: each rank carries its own hryvnia number and the
     Ukrainian page has to show that one, not a conversion of the euro one. */
  const rankGate = (r: { thresholdEur: number; thresholdUah: number }) =>
    uk ? `${r.thresholdUah.toLocaleString("uk-UA")} UAH` : `€${r.thresholdEur}`;
  const rankRemaining = uk
    ? `${rank.remainingUah.toLocaleString("uk-UA")} UAH`
    : `€${rank.remainingEur}`;

  const L = {
    title: t(locale, { uk: "Бонуси Tactical HB", en: "Tactical HB Rewards", ja: "Tactical HB リワード" }),
    xp: "XP",
    maxTier: t(locale, { uk: "Максимальний рівень", en: "Max tier complete", ja: "最上位ランク達成" }),
    toNext: t(locale, { uk: "до наступного ваучера", en: "to your next voucher", ja: "次のバウチャーまで" }),
    voucherWorth: (v: string) => (uk ? `Ваучер на ${v}` : `${v} voucher`),
    /* The Ukrainian storefront must never quote the rate in euro. `money(1)`
       renders one euro of spend as the hryvnia the loyalty rate calls it, so
       the sentence follows loyalty_config instead of hardcoding "50". */
    earnRate: uk
      ? `${cfg.xp_per_eur} XP за кожні ${money(1)}`
      : `${cfg.xp_per_eur} XP for every €1 spent`,
    /* Rank line under the badge: where you are going, or that you have
       arrived and what it is worth. */
    nextRank: rank.next
      ? uk
        ? `Наступне звання: ${rankName(rank.next)} · ще ${rankRemaining}`
        : `Next rank: ${rankName(rank.next)} · ${rankRemaining} to go`
      : uk
        ? `Найвище звання · –${pct}% на продукцію назавжди`
        : `Top rank · ${pct}% permanent discount on products`,
    vouchers: t(locale, { uk: "Ваші ваучери", en: "Your vouchers", ja: "お持ちのバウチャー" }),
    noVouchers: t(locale, { uk: "Ще немає активних ваучерів — витрачайте, щоб відкрити.", en: "No active vouchers — spend to unlock your first.", ja: "有効なバウチャーはありません — ご購入で最初の一枚が手に入ります。" }),
    usedVouchers: t(locale, { uk: "Використані ваучери", en: "Used vouchers", ja: "使用済みのバウチャー" }),
    history: t(locale, { uk: "Історія балів", en: "Points history", ja: "ポイント履歴" }),
    noHistory: t(locale, { uk: "Історія з'явиться після першої покупки.", en: "Your history appears after your first purchase.", ja: "履歴は最初のご購入のあとに表示されます。" }),
    /* The zero state. Deliberately states only what the system already does —
       the ladder starts at the first rank and moves on lifetime spend — and
       invents no rule of its own. The rank name is read from RANKS so it can
       never drift from the ladder itself. */
    startTitle: t(locale, { uk: "Ваше звання починається тут", en: "Your rank starts here", ja: "ランクはここから始まります" }),
    startBody: uk
      ? `Ви — ${RANKS[0].uk}. Звання зростає від суми всіх покупок, тож перше замовлення вже рухає вас далі, а бонуси й ваучери з’являться тут автоматично.`
      : `You're a ${RANKS[0].en}. Rank grows with your lifetime spend, so your first order already moves you up — XP and vouchers appear here on their own.`,
    startBrowse: t(locale, { uk: "Переглянути колекцію", en: "Explore the collection", ja: "コレクションを見る" }),
    startSetup: t(locale, { uk: "Зібрати сет", en: "Build a setup", ja: "セットを組む" }),
    reasonOrder: t(locale, { uk: "Покупка", en: "Purchase", ja: "ご購入" }),
    howTitle: t(locale, { uk: "Як це працює", en: "How it works", ja: "仕組み" }),
    how: uk
      ? `Отримуйте ${cfg.xp_per_eur} XP за кожні ${money(1)}. Досягайте етапів витрат, щоб відкривати ваучери. Ваучери діють ${cfg.voucher_expiry_months} міс. і застосовуються до майбутнього замовлення від ${money(cfg.min_order_eur)}.`
      : `Earn ${cfg.xp_per_eur} XP for every €1 you spend. Hit spend milestones to unlock vouchers. Vouchers last ${cfg.voucher_expiry_months} months and apply to a future order over ${money(cfg.min_order_eur)}.`,
    /* The ranks paragraph, and the one rule people will actually ask about:
       the 7% and a voucher do not add together. */
    howRanks: uk
      ? `Звання відкриваються за сумою всіх покупок: ${RANKS.map((r) => `${r.uk} (${rankGate(r)})`).join(", ")}. Звання лише зростає. ${TOP.uk} дає –${pct}% на продукцію в кожному замовленні — постійно, окрім доставки. Знижка за звання й ваучер не додаються: застосовується те, що вигідніше для вас.`
      : `Ranks unlock on your lifetime spend: ${RANKS.map((r) => `${r.en} (${rankGate(r)})`).join(", ")}. Rank only goes up. ${TOP.en} takes ${pct}% off the products on every order, permanently — shipping excluded. The rank discount and a voucher never add together: whichever is worth more is the one applied.`,
  };

  return (
    <div>
      <h1 className="text-3xl font-semibold mb-6" style={{ color: "#111" }}>{t(locale, { uk: "Бонуси", en: "Loyalty", ja: "ロイヤルティ" })}</h1>

      {/* Hero card (dark + yellow, Gymshark-style) */}
      <div className="rounded-3xl px-7 py-9 sm:px-10 sm:py-12 text-center" style={{ background: "var(--ink)" }}>
        <div className="text-[11px] tracking-[0.3em] uppercase mb-4" style={{ color: "rgba(255,255,255,0.55)" }}>{L.title}</div>

        {/* Rank — badge and name as one group, sitting above the XP figure so
            the number stays the hero of the card. The insignia is drawn for
            black, so it needs no plate of its own here. */}
        <div className="flex flex-col items-center gap-2 mb-5">
          <RankBadge rank={rank.rank} size={72} locale={locale} />
          <div className="font-display text-lg tracking-[0.22em] uppercase" style={{ color: "#fff" }}>
            {rankName(rank.rank)}
          </div>
          <div className="text-xs" style={{ color: rank.next ? "rgba(255,255,255,0.55)" : "var(--accent)" }}>
            {L.nextRank}
          </div>
        </div>

        <div className="font-display leading-none tabular-nums" style={{ color: "var(--accent)", fontSize: "clamp(3.5rem,12vw,6rem)" }}>
          {xp.toLocaleString(t(locale, { uk: "uk-UA", en: "en-GB", ja: "ja-JP" }))}
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

      {/* AT ZERO, the three sections below all say "nothing yet" — no vouchers,
          no history, a bar at 0%. True, and read together they land as a
          broken page rather than a new one. This is one calm panel that says
          what happens next, shown only before anything has been earned. */}
      {totalXP === 0 && (
        <div
          className="mt-4 rounded-2xl border px-6 py-7 sm:px-8"
          style={{ borderColor: "var(--border)", background: "var(--bg-soft)" }}
        >
          <p className="text-[15px] font-medium mb-1.5" style={{ color: "#111" }}>{L.startTitle}</p>
          <p className="text-sm leading-relaxed max-w-xl" style={{ color: "var(--text-muted)" }}>{L.startBody}</p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-5">
            <Link
              href={`/${locale}/products`}
              className="inline-block h-11 leading-[44px] px-7 rounded-full text-sm font-medium transition-opacity hover:opacity-85"
              style={{ background: "#111", color: "#fff" }}
            >
              {L.startBrowse}
            </Link>
            <Link
              href={`/${locale}/setup`}
              className="text-[13px] underline underline-offset-4 transition-opacity hover:opacity-70"
              style={{ color: "var(--text-muted)" }}
            >
              {L.startSetup}
            </Link>
          </div>
        </div>
      )}

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

      {/* The ladder, in order. Reached ranks are lit and named; the rest are
          the same artwork turned down, so it reads as one row of objects with
          some still to earn rather than two different things. Deliberately
          quiet — the card above is the headline, this is the map. */}
      <div className="flex items-start justify-between gap-1 mt-5 max-w-lg">
        {RANKS.map((r) => {
          const reached = r.order <= rank.rank.order;
          const current = r.order === rank.rank.order;
          return (
            <div key={r.key} className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
              <RankBadge rank={r} size={36} locale={locale} dim={!reached} />
              <div
                className="text-[9px] tracking-[0.12em] uppercase text-center leading-tight truncate w-full"
                style={{
                  color: current ? "var(--accent)" : reached ? "var(--ink)" : "var(--text-faint)",
                  fontWeight: current ? 600 : 400,
                }}
              >
                {rankName(r)}
              </div>
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
                {p.xp >= 0 ? "+" : ""}{p.xp.toLocaleString(t(locale, { uk: "uk-UA", en: "en-GB", ja: "ja-JP" }))} XP
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* How it works */}
      <div className="mt-12 rounded-2xl p-6" style={{ background: "var(--bg-soft)" }}>
        <div className="text-sm font-semibold mb-1" style={{ color: "#111" }}>{L.howTitle}</div>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{L.how}</p>
        <p className="text-sm leading-relaxed mt-3" style={{ color: "var(--text-muted)" }}>{L.howRanks}</p>
      </div>
    </div>
  );
}
