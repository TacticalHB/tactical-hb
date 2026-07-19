"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { products, Product } from "@/lib/products";
import { addMoney, money, scaleMoney, type Money } from "@/lib/currency";
import { materialUpcharge } from "@/lib/hmd-options";

/** What the shopper chose. Absent fields = the base configuration. */
export type CartOptions = { variant?: string; lid?: boolean; rubber?: boolean };

export type CartLine = { slug: string; qty: number; options?: CartOptions };

/**
 * Identity of a cart line. The same product in two configurations must be two
 * separate lines, so the key folds in the options — keying on slug alone (as
 * this used to) silently merged "Purple + lid" into "Black".
 */
export function lineKey(slug: string, o?: CartOptions): string {
  return [slug, o?.variant ?? "", o?.lid ? "lid" : "", o?.rubber ? "rubber" : ""].join("|");
}

/** Price of one unit of a line: variant price + any add-ons. */
export function linePrice(line: CartLine): Money {
  const p = products.find((x) => x.slug === line.slug);
  if (!p) return money(0, 0);
  const v = line.options?.variant
    ? p.variants?.find((x) => x.name === line.options!.variant)
    : undefined;
  const base = money(v?.price ?? p.price, v?.priceUah ?? p.priceUah);
  // Add-ons only exist on heat devices; ignore stray flags on anything else.
  if (p.category !== "hmd") return base;
  return addMoney(base, materialUpcharge({ lid: !!line.options?.lid, rubber: !!line.options?.rubber }));
}

type CartCtx = {
  lines: CartLine[];
  count: number;
  subtotal: Money;
  cartOpen: boolean;
  setCartOpen: (v: boolean) => void;
  addToCart: (product: Product, sourceEl?: HTMLElement | null, options?: CartOptions) => void;
  removeLine: (key: string) => void;
  changeQty: (key: string, delta: number) => void;
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
      if (s) {
        // Untrusted input, and carts saved before options existed are still
        // valid — a missing `options` simply means the base configuration.
        const parsed: unknown = JSON.parse(s);
        if (Array.isArray(parsed)) {
          setLines(
            parsed
              .filter((l): l is CartLine => !!l && typeof l.slug === "string" && typeof l.qty === "number")
              .map((l) => ({ slug: l.slug, qty: l.qty, options: l.options }))
          );
        }
      }
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
  const subtotal = lines.reduce<Money>(
    (s, l) => addMoney(s, scaleMoney(linePrice(l), l.qty)),
    money(0, 0)
  );

  const addToCart = useCallback((product: Product, sourceEl?: HTMLElement | null, options?: CartOptions) => {
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

    const key = lineKey(product.slug, options);
    setLines((prev) => {
      const ex = prev.find((l) => lineKey(l.slug, l.options) === key);
      if (ex)
        return prev.map((l) =>
          lineKey(l.slug, l.options) === key ? { ...l, qty: l.qty + 1 } : l
        );
      return [...prev, { slug: product.slug, qty: 1, options }];
    });
    setBump((b) => b + 1);
  }, []);

  const removeLine = useCallback(
    (key: string) => setLines((prev) => prev.filter((l) => lineKey(l.slug, l.options) !== key)),
    []
  );

  const changeQty = useCallback(
    (key: string, delta: number) =>
      setLines((prev) =>
        prev.flatMap((l) =>
          lineKey(l.slug, l.options) === key
            ? l.qty + delta <= 0
              ? []
              : [{ ...l, qty: l.qty + delta }]
            : [l]
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
