"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { products, Product } from "@/lib/products";
import { addMoney, money, scaleMoney, type Money } from "@/lib/currency";

export type CartLine = { slug: string; qty: number };

type CartCtx = {
  lines: CartLine[];
  count: number;
  subtotal: Money;
  cartOpen: boolean;
  setCartOpen: (v: boolean) => void;
  addToCart: (product: Product, sourceEl?: HTMLElement | null) => void;
  removeLine: (slug: string) => void;
  changeQty: (slug: string, delta: number) => void;
  registerCartIcon: (el: HTMLElement | null) => void;
  bump: number;
};

const Ctx = createContext<CartCtx | null>(null);

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used within CartProvider");
  return c;
}

const STORAGE = "tct-cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [bump, setBump] = useState(0);
  const cartIconRef = useRef<HTMLElement | null>(null);

  const registerCartIcon = useCallback((el: HTMLElement | null) => {
    cartIconRef.current = el;
  }, []);

  useEffect(() => {
    try {
      const s = localStorage.getItem(STORAGE);
      if (s) setLines(JSON.parse(s));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(lines));
    } catch {}
  }, [lines]);

  const count = lines.reduce((n, l) => n + l.qty, 0);
  // Subtotal carries both currencies so the drawer can show either without
  // re-converting (and without the two ever disagreeing).
  const subtotal = lines.reduce<Money>((s, l) => {
    const p = products.find((p) => p.slug === l.slug);
    return p ? addMoney(s, scaleMoney(money(p.price, p.priceUah), l.qty)) : s;
  }, money(0, 0));

  const addToCart = useCallback((product: Product, sourceEl?: HTMLElement | null) => {
    // Pick the currently VISIBLE cart icon (nav renders both a desktop and a
    // mobile bag; the hidden one reports a zero-size rect at 0,0).
    const icons =
      typeof document !== "undefined"
        ? (Array.from(document.querySelectorAll("[data-cart-icon]")) as HTMLElement[])
        : [];
    const target =
      icons.find((el) => el.getBoundingClientRect().width > 0) || cartIconRef.current;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (sourceEl && target && !reduce) {
      const s = sourceEl.getBoundingClientRect();
      const t = target.getBoundingClientRect();
      const tx = t.left + t.width / 2 - (s.left + s.width / 2);
      const ty = t.top + t.height / 2 - (s.top + s.height / 2);
      const fly = document.createElement("img");
      fly.src = product.tileImage || product.image || "/tct-logo.svg";
      fly.style.cssText = [
        "position:fixed",
        `left:${s.left}px`,
        `top:${s.top}px`,
        `width:${s.width}px`,
        `height:${s.height}px`,
        "object-fit:contain",
        "z-index:200",
        "pointer-events:none",
        "margin:0",
        "transform:translate(0,0) scale(1)",
        "opacity:1",
        "transition:transform .85s cubic-bezier(.5,-.2,.3,1),opacity .7s ease-in",
        "will-change:transform,opacity",
      ].join(";");
      document.body.appendChild(fly);
      // Force the browser to commit the initial state so the transition runs
      // (without this, the element jumps straight to the end).
      void fly.getBoundingClientRect();
      fly.style.transform = `translate(${tx}px, ${ty}px) scale(0.08)`;
      fly.style.opacity = "0.2";
      setTimeout(() => fly.remove(), 880);
    }

    setLines((prev) => {
      const ex = prev.find((l) => l.slug === product.slug);
      if (ex) return prev.map((l) => (l.slug === product.slug ? { ...l, qty: l.qty + 1 } : l));
      return [...prev, { slug: product.slug, qty: 1 }];
    });
    setBump((b) => b + 1);
  }, []);

  const removeLine = useCallback(
    (slug: string) => setLines((prev) => prev.filter((l) => l.slug !== slug)),
    []
  );

  const changeQty = useCallback(
    (slug: string, delta: number) =>
      setLines((prev) =>
        prev.flatMap((l) =>
          l.slug === slug ? (l.qty + delta <= 0 ? [] : [{ ...l, qty: l.qty + delta }]) : [l]
        )
      ),
    []
  );

  return (
    <Ctx.Provider
      value={{ lines, count, subtotal, cartOpen, setCartOpen, addToCart, removeLine, changeQty, registerCartIcon, bump }}
    >
      {children}
    </Ctx.Provider>
  );
}
