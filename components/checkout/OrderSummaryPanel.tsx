"use client";

import Image from "next/image";
import { useCart, lineKey, linePrice } from "@/components/CartContext";
import { describeLine } from "@/lib/cart-display";
import Price from "@/components/Price";
import { addMoney, moneyFromUah, subtractMoney, type Money } from "@/lib/currency";

/* ---------------------------------------------------------------------------
   The order summary rail shown beside every checkout step, so what's being
   paid for is never off-screen.
--------------------------------------------------------------------------- */

export default function OrderSummaryPanel({
  locale,
  discount,
  voucherCode,
  shippingUah,
  shippingPending,
}: {
  locale: string;
  /** Applied voucher value, in both currencies. Omitted when none is applied. */
  discount?: Money;
  voucherCode?: string | null;
  /** Quoted Nova Poshta cost, or null when no branch is chosen yet. */
  shippingUah?: number | null;
  /** International: shipping is invoiced after the order, not now. */
  shippingPending?: boolean;
}) {
  const { lines, subtotal, count } = useCart();
  const uk = locale === "uk";
  const goods = discount ? subtractMoney(subtotal, discount) : subtotal;
  // Carriers quote shipping in UAH; the summary shows ONE currency, so the
  // quote is converted at the display rate and the total includes it on BOTH
  // sides — the "includes shipping" line under the total must be true in
  // whichever currency the page is showing. (Loyalty is unaffected: it reads
  // the goods value the server stores, never this display figure.)
  const shipping: Money | null = shippingUah != null ? moneyFromUah(shippingUah) : null;
  const total: Money = shipping ? addMoney(goods, shipping) : goods;

  const L = {
    title: uk ? "Підсумок замовлення" : "Order Summary",
    items: uk ? "товарів" : "items",
    subtotal: uk ? "Проміжний підсумок" : "Subtotal",
    discount: uk ? "Ваучер" : "Voucher",
    shipping: uk ? "Доставка" : "Shipping",
    shippingNote: uk ? "Розраховується згодом" : "Calculated later",
    shippingAfter: uk ? "Підтвердимо листом" : "Confirmed by email",
    total: uk ? "Разом" : "Total",
    totalNote: uk ? "Без вартості доставки" : "Excludes delivery",
    // The FOP-2 brief's checkout microcopy, verbatim (§4). Shown once shipping
    // is actually inside the figure above it — never sooner.
    totalIncludes: uk
      ? "До суми замовлення включено доставку до обраного напрямку."
      : "Order total includes shipping to your destination.",
    // International: nothing is charged at this step; one total follows by email.
    totalIntl: uk
      ? "Точну суму замовлення з доставкою підтвердимо листом — оплата одним платежем."
      : "We'll confirm your order total including delivery by email — one single payment.",
    qty: uk ? "К-сть" : "Qty",
  };

  return (
    <aside className="p-7" style={{ background: "var(--bg-soft)" }}>
      <h2 className="text-[17px] font-medium mb-1" style={{ color: "var(--text)" }}>{L.title}</h2>
      <p className="text-[12px] mb-6" style={{ color: "var(--text-faint)" }}>{count} {L.items}</p>

      <ul className="flex flex-col gap-5 mb-6">
        {lines.map((l) => {
          const d = describeLine(l, locale);
          if (!d) return null;
          return (
            <li key={lineKey(l.slug, l.options)} className="flex gap-4">
              <div className="relative w-14 h-14 shrink-0" style={{ background: "var(--bg-card)" }}>
                <Image src={d.image} alt={d.name} fill sizes="56px" className="object-contain p-1" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium leading-snug" style={{ color: "var(--text)" }}>{d.name}</div>
                <div className="text-[12px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {[d.colour, d.addons].filter(Boolean).join(" · ") || d.material}
                </div>
                <div className="text-[12px] mt-0.5" style={{ color: "var(--text-muted)" }}>{L.qty} {l.qty}</div>
              </div>
              <div className="text-[13px] shrink-0" style={{ color: "var(--text)" }}>
                <Price money={linePrice(l)} locale={locale} />
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-2.5 text-[13px] pt-5" style={{ borderTop: "1px solid var(--border-strong)" }}>
        <div className="flex items-center justify-between">
          <span style={{ color: "var(--text-muted)" }}>{L.subtotal}</span>
          <span style={{ color: "var(--text)" }}><Price money={subtotal} locale={locale} /></span>
        </div>
        {discount && discount.eur > 0 && (
          <div className="flex items-center justify-between">
            <span style={{ color: "var(--text-muted)" }}>
              {L.discount}
              {voucherCode && <span className="font-mono tracking-wider"> · {voucherCode}</span>}
            </span>
            <span style={{ color: "var(--accent-hover)" }}>
              −<Price money={discount} locale={locale} />
            </span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span style={{ color: "var(--text-muted)" }}>{L.shipping}</span>
          <span style={{ color: shipping ? "var(--text)" : "var(--text-muted)" }}>
            {/* Through <Price>, like every other figure — a ₴ quote on a €
                page was exactly the bug this row used to have. */}
            {shipping ? (
              <Price money={shipping} locale={locale} />
            ) : shippingPending ? (
              L.shippingAfter
            ) : (
              L.shippingNote
            )}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: "1px solid var(--border-strong)" }}>
        <span className="text-[15px] font-medium" style={{ color: "var(--text)" }}>{L.total}</span>
        <span className="text-[19px] font-medium" style={{ color: "var(--text)" }}>
          <Price money={total} locale={locale} />
        </span>
      </div>
      {/* One line under the total, and it must always be TRUE of the figure
          shown: quoted shipping → "includes shipping"; international → the
          email-confirmation note; not yet quoted → "excludes delivery". */}
      <p className="text-[11px] mt-1.5" style={{ color: "var(--text-faint)" }}>
        {shipping ? L.totalIncludes : shippingPending ? L.totalIntl : L.totalNote}
      </p>
    </aside>
  );
}
