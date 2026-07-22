"use client";

import Image from "next/image";
import { useCart, lineKey, linePrice } from "@/components/CartContext";
import { describeLine } from "@/lib/cart-display";
import Price from "@/components/Price";
import { subtractMoney, type Money } from "@/lib/currency";

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
  // Shipping is quoted in UAH only, and only added to the UAH side. The EUR
  // figure stays the merchandise value, which is what loyalty is based on.
  const total: Money = { eur: goods.eur, uah: goods.uah + (shippingUah ?? 0) };

  const L = {
    title: uk ? "Підсумок замовлення" : "Order Summary",
    items: uk ? "товарів" : "items",
    subtotal: uk ? "Проміжний підсумок" : "Subtotal",
    discount: uk ? "Ваучер" : "Voucher",
    shipping: uk ? "Доставка" : "Shipping",
    shippingNote: uk ? "Розраховується згодом" : "Calculated later",
    shippingAfter: uk ? "Після оформлення" : "After your order",
    total: uk ? "Разом" : "Total",
    totalNote: uk ? "Без вартості доставки" : "Excludes delivery",
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
          <span style={{ color: shippingUah != null ? "var(--text)" : "var(--text-muted)" }}>
            {shippingUah != null
              ? `₴${shippingUah.toLocaleString("uk-UA")}`
              : shippingPending
              ? L.shippingAfter
              : L.shippingNote}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: "1px solid var(--border-strong)" }}>
        <span className="text-[15px] font-medium" style={{ color: "var(--text)" }}>{L.total}</span>
        <span className="text-[19px] font-medium" style={{ color: "var(--text)" }}>
          <Price money={total} locale={locale} />
        </span>
      </div>
      {shippingUah == null && (
        <p className="text-[11px] mt-1.5" style={{ color: "var(--text-faint)" }}>{L.totalNote}</p>
      )}
    </aside>
  );
}
