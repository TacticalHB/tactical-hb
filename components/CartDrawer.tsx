"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart, lineKey, linePrice } from "./CartContext";
import { describeLine } from "@/lib/cart-display";
import SlideOver, { CloseButton } from "./SlideOver";
import Price from "./Price";

/* ---------------------------------------------------------------------------
   Mini cart — the slide-over behind the header bag icon.

   Reviews the whole bag: image, name, colour, material, quantity, price. The
   single call to action leads to the full cart page; checkout itself is only
   entered from there, so there is one route into payment rather than two.
--------------------------------------------------------------------------- */

export default function CartDrawer({ locale }: { locale: string }) {
  const { cartOpen, setCartOpen, lines, subtotal, changeQty, removeLine, count } = useCart();
  const uk = locale === "uk";

  const L = {
    title: uk ? "Ваш кошик" : "Your Shopping Bag",
    empty: uk ? "Ваш кошик порожній" : "Your shopping bag is empty",
    browse: uk ? "Перейти до товарів" : "Browse products",
    total: uk ? "Разом" : "Total",
    view: uk ? "Переглянути кошик" : "View your shopping bag",
    remove: uk ? "Видалити" : "Remove",
    close: uk ? "Закрити" : "Close",
    colour: uk ? "Колір" : "Colour",
    material: uk ? "Матеріал" : "Materials",
    dec: uk ? "Зменшити кількість" : "Decrease quantity",
    inc: uk ? "Збільшити кількість" : "Increase quantity",
  };

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
          <div className="flex flex-col items-center justify-center h-full gap-5 pb-20">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>{L.empty}</p>
            <Link
              href={`/${locale}/products`}
              onClick={close}
              className="text-sm underline underline-offset-4"
              style={{ color: "var(--text)" }}
            >
              {L.browse}
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
                  <div className="relative w-20 h-20 shrink-0" style={{ background: "var(--bg-soft)" }}>
                    <Image src={d.image} alt={d.name} fill sizes="80px" className="object-contain p-1.5" />
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
                          className="w-8 h-8 flex items-center justify-center transition-opacity hover:opacity-60"
                          style={{ color: "var(--text)" }}
                          aria-label={L.dec}
                        >
                          −
                        </button>
                        <span className="w-8 text-center text-sm tabular-nums" style={{ color: "var(--text)" }}>
                          {l.qty}
                        </span>
                        <button
                          onClick={() => changeQty(key, 1)}
                          className="w-8 h-8 flex items-center justify-center transition-opacity hover:opacity-60"
                          style={{ color: "var(--text)" }}
                          aria-label={L.inc}
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => removeLine(key)}
                        className="text-[12px] underline underline-offset-4 transition-opacity hover:opacity-60"
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
      </div>

      {lines.length > 0 && (
        <div className="px-7 py-6 shrink-0" style={{ borderTop: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-5">
            <span className="text-[15px]" style={{ color: "var(--text)" }}>{L.total}</span>
            <span className="text-[17px] font-medium" style={{ color: "var(--text)" }}>
              <Price money={subtotal} locale={locale} />
            </span>
          </div>
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
