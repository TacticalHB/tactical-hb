"use client";

import { useState } from "react";
import { t } from "@/lib/i18n-text";
import { markVoucherUsed, type MarkVoucherResult } from "@/app/actions/vouchers";

/* ---------------------------------------------------------------------------
   Admin: redeem a voucher by code.

   The action re-checks admin rights server-side, so this form is a convenience
   rather than the security boundary — reaching it doesn't grant anything.
--------------------------------------------------------------------------- */

export default function VoucherRedeemForm({ locale }: { locale: string }) {
  const [code, setCode] = useState("");
  const [orderId, setOrderId] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<MarkVoucherResult | null>(null);

  const L = {
    code: t(locale, { uk: "Код ваучера", en: "Voucher code", ja: "バウチャーコード" }),
    order: t(locale, { uk: "Номер замовлення (необовʼязково)", en: "Order reference (optional)", ja: "注文番号（任意）" }),
    submit: t(locale, { uk: "Погасити", en: "Redeem", ja: "利用する" }),
    working: t(locale, { uk: "Обробка…", en: "Redeeming…", ja: "処理しています…" }),
    redeemed: t(locale, { uk: "Ваучер погашено", en: "Voucher redeemed", ja: "バウチャーを利用しました" }),
    already: t(locale, { uk: "Цей ваучер вже було погашено раніше", en: "This voucher had already been redeemed", ja: "このバウチャーはすでに使用されています" }),
    unknown: t(locale, { uk: "Погашено, але не вдалося перевірити, чи це повтор", en: "Redeemed, but couldn't tell whether it was a repeat", ja: "利用しましたが、重複かどうかは確認できませんでした" }),
    hint: t(locale, { uk: "Введіть код точно як на сторінці бонусів, напр. TCT-F47A5C95.", en: "Enter the code exactly as it appears on the loyalty page, e.g. TCT-F47A5C95.", ja: "ロイヤルティページに表示されているとおりにコードをご入力ください（例：TCT-F47A5C95）。" }),
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      setResult(await markVoucherUsed(code, orderId.trim() || undefined));
    } catch (err) {
      console.error("[redeem] action failed:", err);
      setResult({ ok: false, error: t(locale, { uk: "Не вдалося виконати запит.", en: "The request failed.", ja: "リクエストに失敗しました。" }) });
    } finally {
      setBusy(false);
    }
  }

  const field =
    "w-full h-11 px-3 rounded-lg border text-[15px] outline-none transition-colors focus:border-[color:var(--console-accent-line)]";

  return (
    <div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4 max-w-md">
        <div>
          <label className="block text-[13px] mb-1.5" style={{ color: "var(--console-muted)" }}>{L.code}</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            required
            autoComplete="off"
            spellCheck={false}
            placeholder="TCT-XXXXXXXX"
            className={`${field} font-mono tracking-wider`}
            style={{ borderColor: "var(--console-border)" }}
          />
          <p className="text-xs mt-1.5" style={{ color: "var(--console-faint)" }}>{L.hint}</p>
        </div>

        <div>
          <label className="block text-[13px] mb-1.5" style={{ color: "var(--console-muted)" }}>{L.order}</label>
          <input
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            autoComplete="off"
            className={field}
            style={{ borderColor: "var(--console-border)" }}
          />
        </div>

        <button
          type="submit"
          disabled={busy || !code.trim()}
          className="h-12 rounded-full text-[15px] font-medium transition-opacity hover:opacity-85 disabled:opacity-40"
          style={{ background: "var(--console-accent)", color: "#14151a" }}
        >
          {busy ? L.working : L.submit}
        </button>
      </form>

      {result && (
        <div
          role="status"
          className="mt-6 max-w-md rounded-xl p-4 text-sm"
          style={{
            background: result.ok ? "var(--console-ok-soft)" : "var(--console-alert-soft)",
            border: `1px solid ${result.ok ? "rgba(61,154,106,0.35)" : "rgba(196,92,92,0.35)"}`,
            color: result.ok ? "var(--console-ok)" : "var(--console-alert)",
          }}
        >
          {result.ok ? (
            <>
              <div className="font-medium">
                {result.alreadyUsed === true
                  ? L.already
                  : result.alreadyUsed === null
                  ? L.unknown
                  : L.redeemed}
              </div>
              <div className="mt-1 font-mono text-xs">{result.voucher.code}</div>
              {result.voucher.used_at && (
                <div className="mt-0.5 text-xs" style={{ opacity: 0.8 }}>
                  {new Date(result.voucher.used_at).toLocaleString(t(locale, { uk: "uk-UA", en: "en-GB", ja: "ja-JP" }))}
                  {result.voucher.used_order_id ? ` · ${result.voucher.used_order_id}` : ""}
                </div>
              )}
            </>
          ) : (
            result.error
          )}
        </div>
      )}
    </div>
  );
}
