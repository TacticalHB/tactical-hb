"use client";

import Link from "next/link";
import { t } from "@/lib/i18n-text";
import { useState } from "react";
import { checkVoucher, type VoucherCheck } from "@/app/actions/checkout-voucher";
import { formatMoney, currencyForLocale, money } from "@/lib/currency";
import type { CartLine } from "@/components/CartContext";

/* ---------------------------------------------------------------------------
   Apply a loyalty voucher at checkout.

   Only offered to signed-in customers, because vouchers are issued to an
   account. A guest is told plainly to sign in rather than being given a field
   that could never work.
--------------------------------------------------------------------------- */

export type AppliedVoucher = { code: string; amountEur: number };

export default function VoucherField({
  locale,
  signedIn,
  cart,
  applied,
  onApply,
  onRemove,
}: {
  locale: string;
  signedIn: boolean;
  cart: CartLine[];
  applied: AppliedVoucher | null;
  onApply: (v: AppliedVoucher) => void;
  onRemove: () => void;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const L = {
    title: t(locale, { uk: "Ваучер", en: "Voucher", ja: "バウチャー" }),
    placeholder: "TCT-XXXXXXXX",
    apply: t(locale, { uk: "Застосувати", en: "Apply", ja: "適用する" }),
    remove: t(locale, { uk: "Видалити", en: "Remove", ja: "削除" }),
    signIn: t(locale, { uk: "Увійдіть, щоб використати ваучер.", en: "Sign in to use a voucher.", ja: "バウチャーのご利用にはログインが必要です。" }),
    signInCta: t(locale, { uk: "Увійти", en: "Sign in", ja: "ログイン" }),
    appliedLabel: t(locale, { uk: "Ваучер застосовано", en: "Voucher applied", ja: "バウチャーを適用しました" }),
  };

  const message = (r: VoucherCheck): string => {
    if (r.ok) return "";
    switch (r.reason) {
      case "auth":
        return t(locale, { uk: "Увійдіть, щоб використати ваучер.", en: "Please sign in to use a voucher.", ja: "バウチャーのご利用にはログインが必要です。" });
      case "used":
        return t(locale, { uk: "Цей ваучер вже використано.", en: "This voucher has already been used.", ja: "このバウチャーはすでに使用済みです。" });
      case "expired":
        return t(locale, { uk: "Термін дії ваучера минув.", en: "This voucher has expired.", ja: "このバウチャーは有効期限が切れています。" });
      case "min_order":
        return t(locale, {
          uk: `Ваучер діє від ${formatMoney(money(r.minOrderEur ?? 0), currencyForLocale(locale))}.`,
          en: `This voucher applies to orders over ${formatMoney(money(r.minOrderEur ?? 0), currencyForLocale(locale))}.`,
          ja: `このバウチャーは ${formatMoney(money(r.minOrderEur ?? 0), currencyForLocale(locale))} 以上のご注文が対象です。`,
        });
      default:
        return t(locale, { uk: "Ваучер не знайдено.", en: "Voucher not found.", ja: "バウチャーが見つかりません。" });
    }
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!code.trim()) return;
    setBusy(true);
    try {
      const result = await checkVoucher(code, cart);
      if (result.ok) {
        onApply({ code: result.code, amountEur: result.amountEur });
        setCode("");
      } else {
        setError(message(result));
      }
    } catch (err) {
      console.error("[voucher] check failed:", err);
      setError(t(locale, { uk: "Не вдалося перевірити ваучер.", en: "Couldn't check that voucher.", ja: "バウチャーを確認できませんでした。" }));
    } finally {
      setBusy(false);
    }
  }

  if (!signedIn) {
    return (
      <div className="p-4 text-[13px] leading-relaxed" style={{ background: "var(--bg-soft)", color: "var(--text-muted)" }}>
        {L.signIn}{" "}
        <Link
          href={`/${locale}/login?redirect=/${locale}/checkout`}
          className="underline underline-offset-4"
          style={{ color: "var(--text)" }}
        >
          {L.signInCta}
        </Link>
      </div>
    );
  }

  if (applied) {
    return (
      <div className="flex items-center justify-between gap-4 p-4" style={{ background: "var(--bg-soft)" }}>
        <span className="flex items-center gap-2.5 text-[14px] min-w-0" style={{ color: "var(--text)" }}>
          <svg width="15" height="15" viewBox="0 0 14 14" fill="none" aria-hidden="true"
            className="shrink-0" style={{ color: "var(--accent)" }}>
            <path d="M2.5 7.5l3 3 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="truncate">
            {L.appliedLabel}: <span className="font-mono tracking-wider">{applied.code}</span>
          </span>
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="text-[12px] underline underline-offset-4 shrink-0 transition-opacity hover:opacity-70"
          style={{ color: "var(--text-muted)" }}
        >
          {L.remove}
        </button>
      </div>
    );
  }

  return (
    <div>
      <label htmlFor="voucher-code" className="block text-[11px] tracking-[0.2em] uppercase mb-2" style={{ color: "var(--text-faint)" }}>
        {L.title}
      </label>
      {/* Not a <form>: this sits inside the checkout form on some steps, and
          nesting forms is invalid HTML. Enter is handled explicitly. */}
      <div className="flex gap-2.5">
        <input
          id="voucher-code"
          className="field font-mono tracking-wider"
          placeholder={L.placeholder}
          value={code}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void submit(e as unknown as React.FormEvent);
            }
          }}
        />
        <button
          type="button"
          onClick={submit}
          disabled={busy || !code.trim()}
          className="h-12 px-7 shrink-0 rounded-full text-[14px] font-medium transition-opacity hover:opacity-85 disabled:opacity-40"
          style={{ background: "var(--ink)", color: "#f4f3f0" }}
        >
          {busy ? "…" : L.apply}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-[13px] mt-2" style={{ color: "#b42318" }}>{error}</p>
      )}
    </div>
  );
}
