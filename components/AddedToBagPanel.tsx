"use client";

import ProductThumb from "@/components/ProductThumb";
import { pick } from "@/lib/i18n-text";
import Link from "next/link";
import { useCart, linePrice } from "./CartContext";
import { describeLine } from "@/lib/cart-display";
import SlideOver, { CloseButton } from "./SlideOver";
import Price from "./Price";
import CartSuggestion from "./CartSuggestion";

/* ---------------------------------------------------------------------------
   "Added to Shopping Bag" — the confirmation slide-over shown after adding
   from the product page. Deliberately separate from the mini cart: this one
   confirms a single action, the cart reviews everything.

   Sits above the mini cart (z 130 vs 120) so the two can never interleave.
--------------------------------------------------------------------------- */

export default function AddedToBagPanel({ locale }: { locale: string }) {
  const { addedOpen, setAddedOpen, lastAdded } = useCart();
  const d = lastAdded ? describeLine(lastAdded, locale) : null;

  const L = pick(locale, {
    title: { uk: "Додано в кошик", en: "Added to Shopping Bag", ja: "バッグに追加しました", ar: "أُضيف إلى الحقيبة" },
    view: { uk: "Переглянути кошик", en: "View your shopping bag", ja: "バッグを見る", ar: "عرض الحقيبة" },
    keep: { uk: "Продовжити покупки", en: "Continue shopping", ja: "買い物を続ける", ar: "متابعة التسوّق" },
    close: { uk: "Закрити", en: "Close", ja: "閉じる", ar: "إغلاق" },
    colour: { uk: "Колір", en: "Colour", ja: "カラー", ar: "اللون" },
    material: { uk: "Матеріал", en: "Materials", ja: "素材", ar: "المواد" },
    config: { uk: "Комплектація", en: "Configuration", ja: "構成", ar: "التكوين" },
  });

  const close = () => setAddedOpen(false);

  return (
    <SlideOver open={addedOpen} onClose={close} label={L.title} width={460} z={130}>
      <div className="flex items-center justify-between px-7 h-[72px] shrink-0">
        <h2 className="text-[17px] font-medium" style={{ color: "var(--text)" }}>{L.title}</h2>
        <CloseButton onClick={close} label={L.close} />
      </div>

      <div className="flex-1 overflow-y-auto pt-2 pb-7">
        {d && lastAdded && (
          <div className="flex gap-5 px-7">
            <div
              className="relative w-[104px] h-[104px] shrink-0"
              /* The studio plate — see CartPageClient. */
              style={{ background: "#f5f5f5" }}
            >
              <ProductThumb src={d.image} name={d.name} sizes="104px" className="object-contain p-2" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-medium leading-snug" style={{ color: "var(--text)" }}>
                {d.name}
              </div>
              <dl className="mt-2 text-[13px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                {d.colour && (
                  <div><span>{L.colour}: </span><span style={{ color: "var(--text)" }}>{d.colour}</span></div>
                )}
                {d.material && (
                  <div><span>{L.material}: </span><span style={{ color: "var(--text)" }}>{d.material}</span></div>
                )}
                {d.addons && (
                  <div><span>{L.config}: </span><span style={{ color: "var(--text)" }}>{d.addons}</span></div>
                )}
              </dl>
              <div className="mt-2.5 text-[15px]" style={{ color: "var(--text)" }}>
                <Price money={linePrice(lastAdded)} locale={locale} />
              </div>
            </div>
          </div>
        )}

      {/* The success actions, and the pairing card beneath them.

          Both moved INSIDE the scroller rather than staying pinned to the
          bottom. The card is a tall square poster, and as a fixed block below
          fixed actions it would have squeezed the item confirmation off a
          phone screen entirely. Scrolling them together keeps "View your
          shopping bag" the first thing under the item on any screen, with the
          suggestion a flick below it — which is also the order asked for. */}
      <div className="px-7 pt-7 pb-2 flex flex-col gap-3">
        <Link
          href={`/${locale}/cart`}
          onClick={close}
          className="h-12 rounded-full flex items-center justify-center text-[15px] font-medium transition-opacity hover:opacity-85 shrink-0"
          style={{ background: "var(--accent)", color: "#111114" }}
        >
          {L.view}
        </Link>
        <button
          onClick={close}
          className="h-12 rounded-full text-[15px] font-medium transition-colors shrink-0"
          style={{ background: "#ffffff", color: "#111114", border: "1px solid var(--border-strong)" }}
        >
          {L.keep}
        </button>

        {/* Same component, same pairing rules, same session dismissal — turning
            it down here clears it from the bag drawer too.

            The quiet Add here and the strong one in the drawer are the same
            button at two weights: the accent above already belongs to "View
            your shopping bag", and two orange pills this close read as two
            primaries competing rather than an offer inside a card. */}
        <CartSuggestion locale={locale} cta="quiet" />
      </div>
      </div>
    </SlideOver>
  );
}
