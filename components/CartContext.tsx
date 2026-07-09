"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { products, Product } from "@/lib/products";

export type CartLine = { slug: string; qty: number };

type CartCtx = {
  lines: CartLine[];
  count: number;
  subtotal: number;
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
  const subtotal = lines.reduce((s, l) => {
    const p = products.find((p) => p.slug === l.slug);
    return s + (p ? p.price * l.qty : 0);
  }, 0);

  const addToCart = useCallback((product: Product, sourceEl?: HTMLElement | null) => {
    const target = cartIconRef.current;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (sourceEl && target && !reduce) {
      const s = sourceEl.getBoundingClientRect();
      const t = target.getBoundingClientRect();
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
        "transition:transform .8s cubic-bezier(.5,-.25,.25,1),opacity .8s ease-in",
        "will-change:transform,opacity",
      ].join(";");
      document.body.appendChild(fly);
      const tx = t.left + t.width / 2 - (s.left + s.width / 2);
      const ty = t.top + t.height / 2 - (s.top + s.height / 2);
      requestAnimationFrame(() => {
        fly.style.transform = `translate(${tx}px, ${ty}px) scale(0.06)`;
        fly.style.opacity = "0.25";
      });
      setTimeout(() => fly.remove(), 820);
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
