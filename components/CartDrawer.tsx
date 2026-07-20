"use client";

import Image from "next/image";
import { useEffect } from "react";
import { products } from "@/lib/products";
import { useCart, lineKey, linePrice, type CartLine } from "./CartContext";
import Price from "./Price";


/** "Purple · With Lid + With Rubber" — what the shopper actually picked. */
function describeOptions(l: CartLine, locale: string): string | null {
  const uk = locale === "uk";
  const parts: string[] = [];
  if (l.options?.variant) parts.push(l.options.variant);
  const addons: string[] = [];
  if (l.options?.lid) addons.push(uk ? "З кришкою" : "With Lid");
  if (l.options?.rubber) addons.push(uk ? "З гумкою" : "With Rubber");
  if (addons.length) parts.push(addons.join(" + "));
  return parts.length ? parts.join(" · ") : null;
}

export default function CartDrawer({ locale }: { locale: string }) {
  const { cartOpen, setCartOpen, lines, subtotal, changeQty, removeLine, count } = useCart();

  useEffect(() => {
    document.body.style.overflow = cartOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [cartOpen]);

  const t = {
    title: locale === "uk" ? "Кошик" : "Cart",
    empty: locale === "uk" ? "Ваш кошик порожній" : "Your cart is empty",
    subtotal: locale === "uk" ? "Проміжний підсумок" : "Subtotal",
    // Must name the same providers as the About page — a reviewer comparing
    // the two should not find the checkout advertising a different gateway.
    note:
      locale === "uk"
        ? "Оплата (Plata by Mono, Apple Pay, Google Pay, PayPal) підключається до запуску."
        : "Checkout (Plata by Mono, Apple Pay, Google Pay, PayPal) connects at launch.",
    checkout: locale === "uk" ? "Оформити" : "Checkout",
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setCartOpen(false)}
        className="fixed inset-0 z-[120] transition-opacity duration-300"
        style={{
          background: "rgba(0,0,0,0.4)",
          opacity: cartOpen ? 1 : 0,
          pointerEvents: cartOpen ? "auto" : "none",
        }}
        aria-hidden="true"
      />
      {/* Panel */}
      <aside
        className="fixed top-0 right-0 z-[121] h-full w-full max-w-[400px] flex flex-col transition-transform duration-300"
        style={{
          background: "#ffffff",
          transform: cartOpen ? "translateX(0)" : "translateX(100%)",
          boxShadow: "-20px 0 60px -20px rgba(0,0,0,0.35)",
        }}
        aria-hidden={!cartOpen}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 h-16 border-b" style={{ borderColor: "var(--border)" }}>
          <span className="font-display text-2xl tracking-widest" style={{ color: "var(--text)" }}>
            {t.title}{count > 0 ? ` (${count})` : ""}
          </span>
          <button onClick={() => setCartOpen(false)} aria-label="Close cart" style={{ color: "var(--text-muted)" }}>
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M6 6l10 10M16 6L6 16" />
            </svg>
          </button>
        </div>

        {/* Lines */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {lines.length === 0 ? (
            <p className="text-sm text-center mt-16" style={{ color: "var(--text-muted)" }}>{t.empty}</p>
          ) : (
            <ul className="flex flex-col gap-5">
              {lines.map((l) => {
                const p = products.find((pp) => pp.slug === l.slug);
                if (!p) return null;
                const key = lineKey(l.slug, l.options);
                const name = p.tileTitle || (locale === "uk" ? p.nameUk : p.nameEn);
                // Show the chosen colour's photo, not the default one.
                const chosen = l.options?.variant
                  ? p.variants?.find((v) => v.name === l.options!.variant)
                  : undefined;
                const thumb = chosen?.image || p.tileImage || p.image;
                const spec = describeOptions(l, locale);
                return (
                  <li key={key} className="flex gap-4">
                    <div className="relative w-16 h-16 shrink-0" style={{ background: "var(--bg-soft)", borderRadius: 8 }}>
                      <Image src={thumb} alt={name} fill sizes="64px" className="object-contain p-1.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{name}</div>
                        {spec && (
                          <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{spec}</div>
                        )}
                      <div className="font-display text-base" style={{ color: "var(--gold)" }}><Price money={linePrice(l)} locale={locale} /></div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <div className="flex items-center border" style={{ borderColor: "var(--border-strong)", borderRadius: 6 }}>
                          <button onClick={() => changeQty(key, -1)} className="px-2 py-0.5 text-sm" style={{ color: "var(--text-muted)" }} aria-label="Decrease">–</button>
                          <span className="px-2 text-sm tabular-nums" style={{ color: "var(--text)" }}>{l.qty}</span>
                          <button onClick={() => changeQty(key, 1)} className="px-2 py-0.5 text-sm" style={{ color: "var(--text-muted)" }} aria-label="Increase">+</button>
                        </div>
                        <button onClick={() => removeLine(key)} className="text-xs tracking-wide uppercase" style={{ color: "var(--text-faint)" }}>
                          {locale === "uk" ? "Видалити" : "Remove"}
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        {lines.length > 0 && (
          <div className="px-6 py-5 border-t" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>{t.subtotal}</span>
              <span className="font-display text-2xl" style={{ color: "var(--text)" }}><Price money={subtotal} locale={locale} /></span>
            </div>
            <button
              disabled
              className="w-full font-display text-lg tracking-widest py-3.5 cursor-not-allowed"
              style={{ background: "var(--ink)", color: "#f4f3f0", opacity: 0.55 }}
            >
              {t.checkout}
            </button>
            <p className="text-[0.7rem] text-center mt-3" style={{ color: "var(--text-faint)" }}>{t.note}</p>
          </div>
        )}
      </aside>
    </>
  );
}
