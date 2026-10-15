"use client";

import { FREE_SHIPPING_UAH, toFreeShipping } from "@/lib/free-shipping";

/* ---------------------------------------------------------------------------
   "₴1 100 more for free delivery" — in the basket and the checkout summary,
   Ukrainian storefront only (Mario, 15 Oct 2026).

   Ukrainian copy only, because it only ever renders on /uk. The bar fills in
   the brand orange and turns into a plain confirmation once the basket is
   over the line. Renders nothing elsewhere or on an empty basket.
--------------------------------------------------------------------------- */

const uah = (n: number) => `₴${Math.round(n).toLocaleString("uk-UA")}`;

export default function FreeShippingProgress({
  locale,
  goodsUah,
  className = "",
}: {
  locale: string;
  /** The goods the customer is paying for, after any discount. */
  goodsUah: number;
  className?: string;
}) {
  const left = toFreeShipping(locale, goodsUah);
  if (left === null || goodsUah <= 0) return null;
  const done = left === 0;
  const pct = Math.min(100, Math.round((goodsUah / FREE_SHIPPING_UAH) * 100));

  return (
    <div
      className={`rounded-lg px-4 py-3 ${className}`}
      style={{ background: done ? "rgba(46,125,50,0.08)" : "var(--bg-soft)", border: "1px solid var(--border)" }}
      role="status"
    >
      <p className="text-[13px] leading-snug" style={{ color: "var(--text)" }}>
        {done ? (
          <>
            <span aria-hidden="true" style={{ color: "#2e7d32" }}>✓ </span>
            <strong className="font-medium">Безкоштовна доставка</strong> по Україні — для цього замовлення.
          </>
        ) : (
          <>
            Ще <strong className="font-medium tabular-nums">{uah(left)}</strong> — і доставка по Україні буде
            безкоштовною.
          </>
        )}
      </p>
      {!done && (
        <div
          className="mt-2 h-1.5 rounded-full overflow-hidden"
          style={{ background: "var(--border)" }}
          aria-hidden="true"
        >
          <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: "var(--accent)" }} />
        </div>
      )}
    </div>
  );
}
