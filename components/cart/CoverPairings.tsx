"use client";

import { products, availabilityOf, isPurchasable, type Product } from "@/lib/products";
import { useCart, linePrice, type CartLine } from "@/components/CartContext";
import { t } from "@/lib/i18n-text";
import ProductThumb from "@/components/ProductThumb";
import Price from "@/components/Price";

/* ---------------------------------------------------------------------------
   After a wind cover goes in: what the session still needs (Mario,
   15 Oct 2026 — "for windcovers, offer to add hookah or something").

   IN THIS ORDER, AND ONLY WHAT IS MISSING:
     1. the set pieces the basket lacks — a heat device, then a bowl — because
        a cover alone covers nothing, and completing the set brings the saving;
     2. Project KI 06, the hookah, while it is not in the basket.
   Three rows at most, so the hookah still shows beside two missing set
   pieces; in stock or on pre-order, default configuration.

   Adding one makes it the "last added", so the panel moves on to that item —
   a heat device then offers its lid and FEAR, which is the right next step.
--------------------------------------------------------------------------- */

const MAX = 3;

export function coverPairings(lines: CartLine[]): Product[] {
  const have = new Set(lines.map((l) => products.find((p) => p.slug === l.slug)?.category));
  const firstOf = (category: string) =>
    products.find((p) => p.category === category && availabilityOf(p) === "available");
  const out: Product[] = [];
  if (!have.has("hmd")) {
    const p = firstOf("hmd");
    if (p) out.push(p);
  }
  if (!have.has("bowl")) {
    const p = firstOf("bowl");
    if (p) out.push(p);
  }
  const hookah = products.find((p) => p.category === "hookah" && isPurchasable(p));
  if (hookah && !lines.some((l) => l.slug === hookah.slug)) out.push(hookah);
  return out.slice(0, MAX);
}

export default function CoverPairings({ locale }: { locale: string }) {
  const { lines, addToCart } = useCart();
  const picks = coverPairings(lines);
  if (picks.length === 0) return null;

  const L = {
    title: t(locale, { uk: "Доповніть сесію", en: "Complete the session", ja: "セッションを揃える", ar: "أكمل الجلسة" }),
    add: t(locale, { uk: "Додати", en: "Add", ja: "追加", ar: "إضافة" }),
    preorder: t(locale, { uk: "Передзамовлення", en: "Pre-order", ja: "予約注文", ar: "طلب مسبق" }),
  };
  const nameOf = (p: Product) => (locale === "uk" ? p.nameUk : p.nameEn);

  return (
    <div className="mx-7 mt-6 pt-5" style={{ borderTop: "1px solid var(--border)" }}>
      <p className="text-[12px] tracking-[0.14em] uppercase mb-3" style={{ color: "var(--text-faint)" }}>
        {L.title}
      </p>
      <ul className="flex flex-col gap-2">
        {picks.map((p) => {
          const options = p.variants?.length ? { variant: p.variants[0].name } : undefined;
          const unit = linePrice({ slug: p.slug, qty: 1, options });
          const image = p.variants?.[0]?.image || p.tileImage || p.gridImage || p.image;
          return (
            <li key={p.slug} className="flex items-center gap-3 rounded-lg p-2 pe-3" style={{ border: "1px solid var(--border)" }}>
              <div className="relative w-12 h-12 shrink-0 rounded-md overflow-hidden" style={{ background: "#f5f5f5" }}>
                <ProductThumb src={image} name={nameOf(p)} sizes="48px" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13.5px] font-medium leading-snug truncate" style={{ color: "var(--text)" }}>{nameOf(p)}</p>
                <p className="text-[12.5px] tabular-nums" style={{ color: "var(--text-muted)" }}>
                  <Price money={unit} locale={locale} />
                  {p.preorder && <span className="ms-2" style={{ color: "var(--accent-ink)" }}>· {L.preorder}</span>}
                </p>
              </div>
              <button
                type="button"
                onClick={() => addToCart(p, null, options, false)}
                className="shrink-0 h-9 px-4 rounded-full text-[12.5px] font-medium transition-opacity hover:opacity-85"
                style={{ background: "#111111", color: "#ffffff" }}
                aria-label={`${L.add}: ${nameOf(p)}`}
              >
                + {L.add}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
