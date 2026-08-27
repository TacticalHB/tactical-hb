"use client";

import ProductThumb from "@/components/ProductThumb";
import { pick } from "@/lib/i18n-text";
import Link from "next/link";
import { useCart, lineKey, linePrice } from "./CartContext";
import { describeLine } from "@/lib/cart-display";
import SlideOver, { CloseButton } from "./SlideOver";
import Price from "./Price";
import { WasPrice, SetupNote } from "./SetupSaving";
import CartSuggestion from "./CartSuggestion";

/* ---------------------------------------------------------------------------
   Mini cart — the slide-over behind the header bag icon.

   Reviews the whole bag: image, name, colour, material, quantity, price. The
   single call to action leads to the full cart page; checkout itself is only
   entered from there, so there is one route into payment rather than two.
--------------------------------------------------------------------------- */

export default function CartDrawer({ locale }: { locale: string }) {
  const { cartOpen, setCartOpen, lines, subtotal, subtotalFull, bundle, changeQty, removeLine, count } = useCart();

  const L = pick(locale, {
    title: { uk: "Ваш кошик", en: "Your Shopping Bag", ja: "ショッピングバッグ", ar: "حقيبتك" },
    empty: { uk: "Ваш кошик порожній", en: "Your shopping bag is empty", ja: "バッグは空です", ar: "حقيبتك فارغة" },
    emptyHint: {
      uk: "Додайте окрему річ або зберіть повний сет.",
      en: "Add a piece, or build a full setup.",
      ja: "単品で選ぶか、フルセットを組んでみてください。",
      ar: "أضف قطعة، أو كوّن طقمًا كاملًا.",
    },
    buildSetup: { uk: "Зібрати сет", en: "Build a setup", ja: "セットを組む", ar: "كوّن طقمًا" },
    browse: { uk: "Перейти до товарів", en: "Browse products", ja: "製品を見る", ar: "تصفّح المنتجات" },
    total: { uk: "Разом", en: "Total", ja: "合計", ar: "الإجمالي" },
    view: { uk: "Переглянути кошик", en: "View your shopping bag", ja: "バッグを見る", ar: "عرض الحقيبة" },
    remove: { uk: "Видалити", en: "Remove", ja: "削除", ar: "إزالة" },
    close: { uk: "Закрити", en: "Close", ja: "閉じる", ar: "إغلاق" },
    colour: { uk: "Колір", en: "Colour", ja: "カラー", ar: "اللون" },
    material: { uk: "Матеріал", en: "Materials", ja: "素材", ar: "المواد" },
    dec: { uk: "Зменшити кількість", en: "Decrease quantity", ja: "数量を減らす", ar: "إنقاص الكمية" },
    inc: { uk: "Збільшити кількість", en: "Increase quantity", ja: "数量を増やす", ar: "زيادة الكمية" },
  });

  const close = () => setCartOpen(false);

  return (
    <SlideOver open={cartOpen} onClose={close} label={L.title} width={440} z={120}>
      <div className="flex items-center justify-between px-7 h-[72px] shrink-0">
        <h2 className="text-[17px] font-medium" style={{ color: "var(--text)" }}>
          {L.title} {count > 0 && <span style={{ color: "var(--text-muted)" }}>({count})</span>}
        </h2>
        <CloseButton onClick={close} label={L.close} />
      </div>

      <div className="flex-1 overflow-y-auto px-7">
        {lines.length === 0 ? (
          /* The same hierarchy as the full cart page, compressed: one line of
             state, one of guidance, a primary and a quiet alternative. A
             drawer that offered only "browse products" sent people back where
             they came from; the setup link is the one that answers "I do not
             know what I need". */
          <div className="flex flex-col items-center justify-center h-full gap-4 px-6 pb-20 text-center">
            <p className="text-[15px]" style={{ color: "var(--text)" }}>{L.empty}</p>
            <p className="text-[13px] max-w-[16rem]" style={{ color: "var(--text-muted)" }}>{L.emptyHint}</p>
            <Link
              href={`/${locale}/products`}
              onClick={close}
              className="mt-1 inline-flex h-11 px-7 rounded-full items-center justify-center text-[14px] font-medium transition-opacity hover:opacity-85"
              style={{ background: "var(--accent)", color: "#111114" }}
            >
              {L.browse}
            </Link>
            <Link
              href={`/${locale}/setup`}
              onClick={close}
              className="inline-flex items-center h-11 text-[13px] underline underline-offset-4 transition-opacity hover:opacity-70"
              style={{ color: "var(--text-muted)" }}
            >
              {L.buildSetup}
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col">
            {lines.map((l, i) => {
              const d = describeLine(l, locale);
              if (!d) return null;
              const key = lineKey(l.slug, l.options);
              return (
                <li
                  key={key}
                  className="flex gap-4 py-6"
                  style={{ borderTop: i > 0 ? "1px solid var(--border)" : "none" }}
                >
                  {/* The studio plate — see CartPageClient. */}
                  <div className="relative w-20 h-20 shrink-0" style={{ background: "#f5f5f5" }}>
                    <ProductThumb src={d.image} name={d.name} sizes="80px" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-[14px] font-medium leading-snug" style={{ color: "var(--text)" }}>
                        {d.name}
                      </span>
                      <span className="text-[14px] shrink-0" style={{ color: "var(--text)" }}>
                        <Price money={linePrice(l)} locale={locale} />
                      </span>
                    </div>
                    <div className="mt-1 text-[12.5px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                      {d.colour && <div>{L.colour}: {d.colour}</div>}
                      {d.material && <div>{L.material}: {d.material}</div>}
                      {d.addons && <div>{d.addons}</div>}
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center" style={{ border: "1px solid var(--border-strong)" }}>
                        <button
                          onClick={() => changeQty(key, -1)}
                          className="w-11 h-11 flex items-center justify-center transition-opacity hover:opacity-60"
                          style={{ color: "var(--text)" }}
                          aria-label={L.dec}
                        >
                          −
                        </button>
                        <span className="w-8 text-center text-sm tabular-nums select-none" style={{ color: "var(--text)" }}>
                          {l.qty}
                        </span>
                        <button
                          onClick={() => changeQty(key, 1)}
                          className="w-11 h-11 flex items-center justify-center transition-opacity hover:opacity-60"
                          style={{ color: "var(--text)" }}
                          aria-label={L.inc}
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => removeLine(key)}
                        className="inline-flex items-center h-11 text-[12px] underline underline-offset-4 transition-opacity hover:opacity-60"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {L.remove}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* The pairing card, inside the scroller and below the lines — it
            scrolls away with the bag rather than sitting between the customer
            and the checkout button, which stays pinned in the footer. */}
        {lines.length > 0 && <CartSuggestion locale={locale} />}
      </div>

      {/* The footer carries the total and the only way forward, so it takes the
          home-indicator inset: on a notched phone the checkout button was
          sitting in the system's own 34px strip. */}
      {lines.length > 0 && (
        <div
          className="px-7 pt-6 shrink-0"
          style={{
            borderTop: "1px solid var(--border)",
            paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))",
          }}
        >
          <div className={`flex items-center justify-between ${bundle ? "mb-1" : "mb-5"}`}>
            <span className="text-[15px]" style={{ color: "var(--text)" }}>{L.total}</span>
            {/* Was and now on one line, the old figure muted and struck. No
                percentage and no name for the mechanism — see SetupSaving. */}
            <span className="flex items-baseline gap-2">
              {bundle && <WasPrice money={subtotalFull} locale={locale} />}
              <span className="text-[17px] font-medium" style={{ color: "var(--text)" }}>
                <Price money={subtotal} locale={locale} />
              </span>
            </span>
          </div>
          {bundle && <SetupNote locale={locale} className="mb-4" />}
          <Link
            href={`/${locale}/cart`}
            onClick={close}
            className="h-12 rounded-full flex items-center justify-center text-[15px] font-medium transition-opacity hover:opacity-85"
            style={{ background: "var(--accent)", color: "#111114" }}
          >
            {L.view}
          </Link>
        </div>
      )}
    </SlideOver>
  );
}
