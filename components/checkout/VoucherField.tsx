"use client";

import Link from "next/link";
import { t } from "@/lib/i18n-text";
import { useState } from "react";
import { checkVoucher, type VoucherCheck } from "@/app/actions/checkout-voucher";
import { formatMoney, currencyForLocale, money } from "@/lib/currency";
import type { CartLine } from "@/components/CartContext";

/* ---------------------------------------------------------------------------
   Apply a loyalty voucher or a gift code at checkout.

   Gift codes (GIFT20-…, 19 Oct 2026) are open to everyone, so the field shows
   for guests too; a guest typing a loyalty voucher is told to sign in, since
   those belong to an account.
--------------------------------------------------------------------------- */

/** amountEur for a loyalty voucher; percent for a gift code (GIFT20-…), 19 Oct 2026. */
export type AppliedVoucher = { code: string; amountEur: number; percent?: number };

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
    title: t(locale, { uk: "Ваучер або подарунковий код", en: "Voucher or gift code", ja: "バウチャー / ギフトコード", ar: "قسيمة أو رمز هدية" }),
    apply: t(locale, { uk: "Застосувати", en: "Apply", ja: "適用する", ar: "تطبيق" }),
    remove: t(locale, { uk: "Видалити", en: "Remove", ja: "削除", ar: "إزالة" }),
    signIn: t(locale, { uk: "Ваучер програми лояльності? Увійдіть, щоб його використати.", en: "Loyalty voucher? Sign in to use it.", ja: "ロイヤルティ バウチャーをお持ちの方はログインしてください。", ar: "لديك قسيمة ولاء؟ سجّل الدخول لاستخدامها." }),
    signInCta: t(locale, { uk: "Увійти", en: "Sign in", ja: "ログイン", ar: "تسجيل الدخول" }),
    appliedLabel: t(locale, { uk: "Ваучер застосовано", en: "Voucher applied", ja: "バウチャーを適用しました", ar: "تم تطبيق القسيمة" }),
  };

  const message = (r: VoucherCheck): string => {
    if (r.ok) return "";
    switch (r.reason) {
      case "auth":
        return t(locale, { uk: "Увійдіть, щоб використати ваучер.", en: "Please sign in to use a voucher.", ja: "バウチャーのご利用にはログインが必要です。", ar: "يرجى تسجيل الدخول لاستخدام قسيمة." });
      case "used":
        return t(locale, { uk: "Цей ваучер вже використано.", en: "This voucher has already been used.", ja: "このバウチャーはすでに使用済みです。", ar: "هذه القسيمة مستخدَمة بالفعل." });
      case "expired":
        return t(locale, { uk: "Термін дії ваучера минув.", en: "This voucher has expired.", ja: "このバウチャーは有効期限が切れています。", ar: "انتهت صلاحية هذه القسيمة." });
      case "min_order":
        return t(locale, {
          uk: `Ваучер діє від ${formatMoney(money(r.minOrderEur ?? 0), currencyForLocale(locale))}.`,
          en: `This voucher applies to orders over ${formatMoney(money(r.minOrderEur ?? 0), currencyForLocale(locale))}.`,
          ja: `このバウチャーは ${formatMoney(money(r.minOrderEur ?? 0), currencyForLocale(locale))} 以上のご注文が対象です。`,
          ar: `هذه القسيمة صالحة للطلبات من ${formatMoney(money(r.minOrderEur ?? 0), currencyForLocale(locale))} فأكثر.`,
        });
      case "sale":
        return t(locale, {
          uk: "Ціна Halloween вигідніша за цей код — його збережено для наступного замовлення.",
          en: "The Halloween price already beats this code — it stays saved for your next order.",
          ja: "ハロウィン価格の方がこのコードよりお得です。コードは次回のご注文まで保存されます。",
          ar: "سعر الهالوين أفضل من هذا الرمز — يبقى محفوظًا لطلبك القادم.",
        });
      default:
        return t(locale, { uk: "Ваучер не знайдено.", en: "Voucher not found.", ja: "バウチャーが見つかりません。", ar: "لم يُعثر على القسيمة." });
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
        onApply({ code: result.code, amountEur: result.amountEur, percent: result.percent });
        setCode("");
      } else {
        setError(message(result));
      }
    } catch (err) {
      console.error("[voucher] check failed:", err);
      setError(t(locale, { uk: "Не вдалося перевірити ваучер.", en: "Couldn't check that voucher.", ja: "バウチャーを確認できませんでした。", ar: "تعذّر التحقق من تلك القسيمة." }));
    } finally {
      setBusy(false);
    }
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
      {/* Gift codes work for everyone; loyalty vouchers belong to an account. */}
      {!signedIn && (
        <p className="text-[12.5px] mt-2" style={{ color: "var(--text-muted)" }}>
          {L.signIn}{" "}
          <Link href={`/${locale}/login?redirect=/${locale}/checkout`} className="underline underline-offset-4" style={{ color: "var(--text)" }}>
            {L.signInCta}
          </Link>
        </p>
      )}
    </div>
  );
}
