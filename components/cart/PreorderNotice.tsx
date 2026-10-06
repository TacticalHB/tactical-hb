"use client";

import { products } from "@/lib/products";
import { formatShipDate } from "@/lib/cart-display";
import { t } from "@/lib/i18n-text";
import type { CartLine } from "@/components/CartContext";

/* ---------------------------------------------------------------------------
   The bag says when it ships, whenever a pre-order is in it (pre-launch audit,
   BUG-15).

   ONE PARCEL (Mario, 6 Oct 2026): an order holding a pre-order ships whole on
   the release date — the in-stock pieces wait for it rather than going ahead
   on their own. So a mixed bag says so plainly before anyone pays, and a bag
   of only the pre-order just repeats the date.
--------------------------------------------------------------------------- */
export default function PreorderNotice({ lines, locale, className = "" }: { lines: CartLine[]; locale: string; className?: string }) {
  const pre = lines
    .map((l) => products.find((p) => p.slug === l.slug))
    .filter((p) => p?.preorder && p.shipsOn);
  if (pre.length === 0) return null;

  // The latest release date governs a single parcel.
  const ships = pre.map((p) => p!.shipsOn!).sort().at(-1)!;
  const d = formatShipDate(ships, locale);
  const mixed = lines.some((l) => !products.find((p) => p.slug === l.slug)?.preorder);

  const text = mixed
    ? t(locale, {
        en: `Your order includes a pre-order, so everything ships together in one parcel on ${d}.`,
        uk: `У замовленні є передзамовлення, тож усе буде відправлено разом, однією посилкою, ${d}.`,
        ja: `ご注文に予約商品が含まれるため、すべての商品を ${d} にまとめて一つの荷物で発送します。`,
        ar: `يتضمّن طلبك طلبًا مسبقًا، لذا يُشحن كل شيء معًا في طرد واحد في ${d}.`,
      })
    : t(locale, {
        en: `Pre-order — your order ships on ${d}.`,
        uk: `Передзамовлення — замовлення буде відправлено ${d}.`,
        ja: `予約注文 — ${d} に発送します。`,
        ar: `طلب مسبق — يُشحن طلبك في ${d}.`,
      });

  return (
    <div
      role="note"
      className={`flex gap-3 rounded-[10px] px-4 py-3 text-[13px] leading-relaxed ${className}`}
      style={{ background: "color-mix(in srgb, var(--accent) 12%, #ffffff)", border: "1px solid var(--accent)", color: "#111114" }}
    >
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 mt-0.5" style={{ color: "var(--accent-ink)" }}>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </svg>
      <span>{text}</span>
    </div>
  );
}
