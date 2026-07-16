"use client";

import { useState } from "react";
import { toast } from "sonner";
import { getVoucherState, type Voucher } from "@/lib/loyalty/vouchers";
import { formatVoucher, type LoyaltyConfig } from "@/lib/loyalty/config";

/* ---------------------------------------------------------------------------
   One voucher.

   States (from used_at / expires_at):
     • active  — full contrast + "Copy code"
     • expired — dimmed, no copy (nothing to spend)
     • used    — dimmed + "Used" badge, shows when and on which order
--------------------------------------------------------------------------- */

export default function VoucherCard({
  voucher,
  cfg,
  locale,
}: {
  voucher: Voucher;
  cfg: LoyaltyConfig;
  locale: string;
}) {
  const uk = locale === "uk";
  const [copied, setCopied] = useState(false);
  const state = getVoucherState(voucher);
  const money = (eur: number) => formatVoucher(eur, cfg, locale);

  const L = {
    active: uk ? "Активний" : "Active",
    expired: uk ? "Прострочений" : "Expired",
    used: uk ? "Використаний" : "Used",
    minOrder: (v: string) => (uk ? `Мін. замовлення ${v}` : `Min order ${v}`),
    expires: uk ? "Діє до" : "Expires",
    usedOn: uk ? "Використано" : "Used on",
    order: uk ? "Замовлення" : "Order",
    copy: uk ? "Копіювати код" : "Copy code",
    copied: uk ? "Код скопійовано" : "Code copied",
    copyFailed: uk ? "Не вдалося скопіювати" : "Couldn't copy",
  };

  const date = (s: string) =>
    new Date(s).toLocaleDateString(uk ? "uk-UA" : "en-GB", { day: "numeric", month: "short", year: "numeric" });

  const badge =
    state === "active"
      ? { text: L.active, bg: "#f8f880", fg: "#111" }
      : state === "used"
      ? { text: L.used, bg: "var(--ink)", fg: "#fff" }
      : { text: L.expired, bg: "var(--bg-soft)", fg: "var(--text-muted)" };

  const dimmed = state !== "active";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(voucher.code);
      setCopied(true);
      toast.success(L.copied);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(L.copyFailed);
    }
  };

  return (
    <div
      className="rounded-2xl border p-5"
      style={{
        borderColor: "var(--border)",
        // Used/expired are visibly de-emphasised so the spendable ones pop.
        opacity: dimmed ? 0.6 : 1,
        background: dimmed ? "var(--bg-soft)" : "#fff",
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div
            className="text-2xl font-semibold"
            style={{ color: "#111", textDecoration: state === "used" ? "line-through" : "none" }}
          >
            {money(voucher.amount_eur)}
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            {L.minOrder(money(voucher.min_order_eur))}
          </div>
        </div>
        <span
          className="text-[11px] uppercase tracking-wide px-2.5 py-1 rounded-full shrink-0"
          style={{ background: badge.bg, color: badge.fg }}
        >
          {badge.text}
        </span>
      </div>

      {/* Code */}
      <div className="mt-4 flex items-center gap-2">
        <code
          className="flex-1 min-w-0 truncate text-sm font-mono tracking-wider px-3 py-2 rounded-lg"
          style={{ background: dimmed ? "transparent" : "var(--bg-soft)", color: "#111" }}
        >
          {voucher.code}
        </code>
        {state === "active" && (
          <button
            onClick={copy}
            className="shrink-0 h-9 px-4 rounded-full text-xs font-medium transition-opacity hover:opacity-85"
            style={{ background: "#111", color: "#fff" }}
          >
            {copied ? "✓" : L.copy}
          </button>
        )}
      </div>

      {/* Dates / order reference */}
      <div className="mt-3 text-xs" style={{ color: "var(--text-faint)" }}>
        {state === "used" ? (
          <>
            <div>
              {L.usedOn} {date(voucher.used_at!)}
            </div>
            {voucher.used_order_id && (
              <div className="mt-0.5">
                {L.order}: <span className="font-mono">{voucher.used_order_id}</span>
              </div>
            )}
          </>
        ) : (
          <div>
            {L.expires} {date(voucher.expires_at)}
          </div>
        )}
      </div>
    </div>
  );
}
