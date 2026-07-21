"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart, linePrice } from "./CartContext";
import { describeLine } from "@/lib/cart-display";
import SlideOver, { CloseButton } from "./SlideOver";
import Price from "./Price";

/* ---------------------------------------------------------------------------
   "Added to Shopping Bag" — the confirmation slide-over shown after adding
   from the product page. Deliberately separate from the mini cart: this one
   confirms a single action, the cart reviews everything.

   Sits above the mini cart (z 130 vs 120) so the two can never interleave.
--------------------------------------------------------------------------- */

export default function AddedToBagPanel({ locale }: { locale: string }) {
  const { addedOpen, setAddedOpen, lastAdded } = useCart();
  const uk = locale === "uk";
  const d = lastAdded ? describeLine(lastAdded, locale) : null;

  const L = {
    title: uk ? "Додано в кошик" : "Added to Shopping Bag",
    view: uk ? "Переглянути кошик" : "View your shopping bag",
    keep: uk ? "Продовжити покупки" : "Continue shopping",
    close: uk ? "Закрити" : "Close",
    colour: uk ? "Колір" : "Colour",
    material: uk ? "Матеріал" : "Materials",
    config: uk ? "Комплектація" : "Configuration",
  };

  const close = () => setAddedOpen(false);

  return (
    <SlideOver open={addedOpen} onClose={close} label={L.title} width={460} z={130}>
      <div className="flex items-center justify-between px-7 h-[72px] shrink-0">
        <h2 className="text-[17px] font-medium" style={{ color: "var(--text)" }}>{L.title}</h2>
        <CloseButton onClick={close} label={L.close} />
      </div>

      <div className="flex-1 overflow-y-auto px-7 pt-2">
        {d && lastAdded && (
          <div className="flex gap-5">
            <div
              className="relative w-[104px] h-[104px] shrink-0"
              style={{ background: "var(--bg-soft)" }}
            >
              <Image src={d.image} alt={d.name} fill sizes="104px" className="object-contain p-2" />
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
      </div>

      <div className="px-7 py-7 flex flex-col gap-3 shrink-0">
        <Link
          href={`/${locale}/cart`}
          onClick={close}
          className="h-12 rounded-full flex items-center justify-center text-[15px] font-medium transition-opacity hover:opacity-85"
          style={{ background: "var(--accent)", color: "#111114" }}
        >
          {L.view}
        </Link>
        <button
          onClick={close}
          className="h-12 rounded-full text-[15px] font-medium transition-colors"
          style={{ background: "#ffffff", color: "#111114", border: "1px solid var(--border-strong)" }}
        >
          {L.keep}
        </button>
      </div>
    </SlideOver>
  );
}
