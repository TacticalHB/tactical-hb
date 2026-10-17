"use client";

import { useMemo } from "react";
import { products, availabilityOf, type Product } from "@/lib/products";
import { useCart, linePrice, type CartLine } from "@/components/CartContext";
import { bundleFor } from "@/lib/bundle";
import { permanentDiscount } from "@/lib/loyalty/ranks";
import { addMoney, money, scaleMoney, subtractMoney, type Money } from "@/lib/currency";
import { FREE_SHIPPING_UAH, freeShippingApplies, toFreeShipping } from "@/lib/free-shipping";
import ProductThumb from "@/components/ProductThumb";
import Price from "@/components/Price";

/* ---------------------------------------------------------------------------
   "Add one of these and delivery is free" — under the progress note in the
   basket, Ukrainian storefront only (Mario, 15 Oct 2026).

   EACH SUGGESTION IS PRICED AS THE BASKET WOULD BE WITH IT IN, not by its
   sticker price: adding the missing piece of a set takes the set saving off,
   so a ₴850 cover can move the basket by less than ₴850. The basket is
   re-run through the same bundle and rank rules the cart, checkout and invoice
   use, and only a suggestion that really crosses ₴5 000 is marked as doing so.

   ORDER: the ones that get the customer over the line first, smallest
   overshoot first — the cheapest way to free delivery — then, if fewer than
   three can, the ones that get closest. In stock only, never a pre-order, a
   product already in the basket, or a second heat device or wind cover;
   default configuration (first colour, no add-ons). Ukrainian copy only: it never renders anywhere else.
--------------------------------------------------------------------------- */

const SUGGESTABLE = new Set(["bowl", "hmd", "windcover", "mouthpiece", "accessory"]);
const MAX = 3;

/* Mirrors CartContext's subtotal exactly (one bundle item per line, as there),
   then the rank perk as CartPageClient takes it. */
function basketGoods(lines: CartLine[], rankDiscountRate: number): Money {
  const full = lines.reduce<Money>((s, l) => addMoney(s, scaleMoney(linePrice(l), l.qty)), money(0, 0));
  const bundle = bundleFor(
    lines.flatMap((l) => {
      const p = products.find((x) => x.slug === l.slug);
      return p ? [{ category: p.category, unit: linePrice(l) }] : [];
    })
  );
  const subtotal = bundle ? subtractMoney(full, bundle.saved) : full;
  return subtractMoney(subtotal, permanentDiscount(rankDiscountRate, subtotal));
}

export default function FreeShippingSuggestions({
  locale,
  goodsUah,
  rankDiscountRate = 0,
}: {
  locale: string;
  goodsUah: number;
  rankDiscountRate?: number;
}) {
  const { lines, addToCart } = useCart();
  const left = toFreeShipping(locale, goodsUah);

  const picks = useMemo(() => {
    if (!left) return [];
    const inBasket = new Set(lines.map((l) => l.slug));
    /* One heat device and one cover is what a setup needs — a second of
       either is not a sensible nudge. Bowls and accessories can repeat. */
    const ownedOnce = new Set<string>(
      lines.map((l) => products.find((x) => x.slug === l.slug)?.category ?? "").filter((c) => c === "hmd" || c === "windcover")
    );
    const scored = products
      .filter(
        (p) =>
          SUGGESTABLE.has(p.category) &&
          availabilityOf(p) === "available" &&
          !inBasket.has(p.slug) &&
          !ownedOnce.has(p.category)
      )
      .map((p) => {
        const line: CartLine = { slug: p.slug, qty: 1, options: p.variants?.length ? { variant: p.variants[0].name } : undefined };
        const after = basketGoods([...lines, line], rankDiscountRate);
        return { p, line, unit: linePrice(line), after: after.uah, closes: freeShippingApplies(locale, after.uah) };
      });
    const closing = scored.filter((s) => s.closes).sort((a, b) => a.after - b.after);
    const nearing = scored.filter((s) => !s.closes).sort((a, b) => b.after - a.after);
    return [...closing, ...nearing].slice(0, MAX);
  }, [left, lines, locale, rankDiscountRate]);

  if (!left || picks.length === 0) return null;

  return (
    <div className="mt-4">
      <p className="text-[12px] tracking-[0.12em] uppercase mb-2.5" style={{ color: "var(--text-faint)" }}>
        {/* The promise only where it is kept: if no single item gets the
            basket over ₴5 000, the heading says "closer", and each row says
            what would still be left. */}
        {picks.some((x) => x.closes) ? "Додайте — і доставка буде безкоштовною" : "Ближче до безкоштовної доставки"}
      </p>
      <ul className="flex flex-col gap-2">
        {picks.map(({ p, line, unit, closes, after }) => (
          <li
            key={p.slug}
            className="flex items-center gap-3 rounded-lg p-2 pe-3"
            style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
          >
            <div className="relative w-12 h-12 shrink-0 rounded-md overflow-hidden" style={{ background: "#f5f5f5" }}>
              <ProductThumb src={imageOf(p, line)} name={p.nameUk} sizes="48px" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium leading-snug truncate" style={{ color: "var(--text)" }}>
                {p.nameUk}
              </p>
              <p className="text-[12px] tabular-nums" style={{ color: "var(--text-muted)" }}>
                <Price money={unit} locale={locale} />
                {closes ? (
                  <span className="ms-2" style={{ color: "#2e7d32" }}>
                    · безкоштовна доставка
                  </span>
                ) : (
                  <span className="ms-2" style={{ color: "var(--text-faint)" }}>
                    · залишиться {`₴${Math.max(0, Math.ceil(FREE_SHIPPING_UAH - after)).toLocaleString("uk-UA")}`}
                  </span>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => addToCart(p, e.currentTarget, line.options)}
              className="shrink-0 h-9 px-3.5 rounded-full text-[12.5px] font-medium transition-opacity hover:opacity-85"
              style={{ background: "#111111", color: "#ffffff" }}
              aria-label={`Додати ${p.nameUk} у кошик`}
            >
              + Додати
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function imageOf(p: Product, line: CartLine): string | undefined {
  const v = p.variants?.find((x) => x.name === line.options?.variant);
  return v?.image || p.tileImage || p.gridImage || p.image;
}
