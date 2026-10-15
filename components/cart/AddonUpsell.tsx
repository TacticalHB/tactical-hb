"use client";

import { products, addonAvailability } from "@/lib/products";
import { useCart, lineKey, type CartLine, type CartOptions } from "@/components/CartContext";
import { MATERIAL_PRICE } from "@/lib/hmd-options";
import { TIMER_PRICE } from "@/lib/windcover-options";
import { t } from "@/lib/i18n-text";
import ProductThumb from "@/components/ProductThumb";
import Price from "@/components/Price";
import type { Money } from "@/lib/currency";

/* ---------------------------------------------------------------------------
   "Add the lid / FEAR / timer" — offered the moment a heat device or a wind
   cover goes into the bag, and again on its line in the basket (Mario,
   15 Oct 2026).

   AN UPGRADE OF THE LINE, NOT A SECOND PRODUCT. The add-ons are options on the
   device or cover (the same flags the product page ticks, priced from the same
   MATERIAL_PRICE / TIMER_PRICE), so taking one changes what is in the bag
   rather than adding a loose part beside it.

   Only what the line does not already have, and only what can be sent (the
   lid and FEAR follow their own products' stock). Nothing is ticked for the
   customer; every offer is one press.

   TWO SHAPES:
     panel — in "Added to bag", for the unit just added: rows with a picture.
             Upgrading moves that one unit to the new configuration, so a bag
             that already held two plain devices keeps them plain.
     line  — under a basket line: compact chips that upgrade the whole line,
             which is what the line on screen is.
--------------------------------------------------------------------------- */

type Key = "lid" | "rubber" | "timer";

const OFFER: Record<Key, { name: string; image: string; price: Money }> = {
  lid: { name: "LID 9E418", image: "/images/accessories/lid-9e418-1-v3.jpg", price: MATERIAL_PRICE.lid },
  rubber: { name: "FEAR Stabiliser 9E418", image: "/images/accessories/fear-9e418-1-v3.jpg", price: MATERIAL_PRICE.rubber },
  timer: { name: "Timer", image: "/images/windcover-timer-cut.png", price: TIMER_PRICE },
};

/** The add-ons this line could still take, in the order the page lists them. */
export function missingAddons(line: CartLine): Key[] {
  const p = products.find((x) => x.slug === line.slug);
  if (!p) return [];
  const keys: Key[] = p.category === "hmd" ? ["lid", "rubber"] : p.category === "windcover" ? ["timer"] : [];
  return keys.filter((k) => !line.options?.[k] && (k === "timer" || addonAvailability(k as "lid" | "rubber") === "available"));
}

export default function AddonUpsell({
  line,
  locale,
  mode,
}: {
  line: CartLine;
  locale: string;
  mode: "panel" | "line";
}) {
  const { lines, addToCart, removeLine, changeQty, setLineOptions } = useCart();
  const product = products.find((x) => x.slug === line.slug);
  const missing = missingAddons(line);
  if (!product || missing.length === 0) return null;

  const timerName = t(locale, { uk: "Таймер", en: "Timer", ja: "タイマー", ar: "المؤقّت" });
  const nameOf = (k: Key) => (k === "timer" ? timerName : OFFER[k].name);
  const L = {
    title:
      product.category === "hmd"
        ? t(locale, { uk: "Доповніть свій пристрій нагріву", en: "Complete your heat device", ja: "ヒートデバイスを仕上げる", ar: "أكمل جهاز الحرارة" })
        : t(locale, { uk: "Додайте таймер до ковпака", en: "Add the timer to your cover", ja: "カバーにタイマーを追加", ar: "أضف المؤقّت إلى الغطاء" }),
    add: t(locale, { uk: "Додати", en: "Add", ja: "追加", ar: "إضافة" }),
    each: t(locale, { uk: "за шт.", en: "each", ja: "1点あたり", ar: "للقطعة" }),
  };

  const upgradePanel = (k: Key) => {
    /* Move the unit just added to the new configuration. addToCart records
       the new configuration as `lastAdded`, so the panel then shows it and
       stops offering what was just taken. */
    const oldKey = lineKey(line.slug, line.options);
    const inBag = lines.find((l) => lineKey(l.slug, l.options) === oldKey);
    if (!inBag) return;
    if (inBag.qty <= 1) removeLine(oldKey);
    else changeQty(oldKey, -1);
    const next: CartOptions = { ...line.options, [k]: true };
    addToCart(product, null, next, false);
  };

  if (mode === "line") {
    return (
      <div className="flex flex-wrap gap-2 mt-3">
        {missing.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setLineOptions(lineKey(line.slug, line.options), { ...line.options, [k]: true })}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[12.5px] transition-colors hover:border-black"
            style={{ border: "1px solid var(--border-strong)", color: "var(--text)" }}
          >
            <span aria-hidden="true" style={{ color: "var(--accent-ink)" }}>+</span>
            {nameOf(k)}
            <span style={{ color: "var(--text-muted)" }}>
              · <Price money={OFFER[k].price} locale={locale} />
              {line.qty > 1 && ` ${L.each}`}
            </span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="mx-7 mt-6 pt-5" style={{ borderTop: "1px solid var(--border)" }}>
      <p className="text-[12px] tracking-[0.14em] uppercase mb-3" style={{ color: "var(--text-faint)" }}>
        {L.title}
      </p>
      <ul className="flex flex-col gap-2">
        {missing.map((k) => (
          <li key={k} className="flex items-center gap-3 rounded-lg p-2 pe-3" style={{ border: "1px solid var(--border)" }}>
            <div className="relative w-12 h-12 shrink-0 rounded-md overflow-hidden" style={{ background: "#f5f5f5" }}>
              <ProductThumb src={OFFER[k].image} name={nameOf(k)} sizes="48px" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13.5px] font-medium leading-snug" style={{ color: "var(--text)" }}>{nameOf(k)}</p>
              <p className="text-[12.5px] tabular-nums" style={{ color: "var(--text-muted)" }}>
                +<Price money={OFFER[k].price} locale={locale} />
              </p>
            </div>
            <button
              type="button"
              onClick={() => upgradePanel(k)}
              className="shrink-0 h-9 px-4 rounded-full text-[12.5px] font-medium transition-opacity hover:opacity-85"
              style={{ background: "#111111", color: "#ffffff" }}
              aria-label={`${L.add}: ${nameOf(k)}`}
            >
              + {L.add}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
