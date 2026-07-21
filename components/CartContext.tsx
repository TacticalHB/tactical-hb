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
  /** `showPanel` opens the "Added to Shopping Bag" slide-over instead of the
      fly-to-cart animation. Off by default so existing callers are unchanged. */
  addToCart: (
    product: Product,
    sourceEl?: HTMLElement | null,
    options?: CartOptions,
    showPanel?: boolean
  ) => void;
  removeLine: (key: string) => void;
  changeQty: (key: string, delta: number) => void;
  clearCart: () => void;
  registerCartIcon: (el: HTMLElement | null) => void;
  bump: number;
  /** The line just added, for the confirmation slide-over. */
  lastAdded: CartLine | null;
  addedOpen: boolean;
  setAddedOpen: (v: boolean) => void;
  /**
   * False until the saved cart has been read back from localStorage. Callers
   * that treat an empty cart as meaningful (checkout redirects, "your bag is
   * empty") MUST wait for this — on first render `lines` is always [], which
   * is indistinguishable from a genuinely empty bag and would bounce a
   * customer out of checkout on any hard load or refresh.
   */
  hydrated: boolean;
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
  const [lastAdded, setLastAdded] = useState<CartLine | null>(null);
  const [addedOpen, setAddedOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
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
    } catch {
    } finally {
      // Must run even if the read threw, or consumers wait forever.
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    // Don't write before the restore has run — the initial [] would erase a
    // saved cart on every page load.
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE, JSON.stringify(lines));
    } catch {}
  }, [lines, hydrated]);

  const count = lines.reduce((n, l) => n + l.qty, 0);
  // Subtotal carries both currencies so the drawer can show either without
  // re-converting (and without the two ever disagreeing).
  const subtotal = lines.reduce<Money>(
    (s, l) => addMoney(s, scaleMoney(linePrice(l), l.qty)),
    money(0, 0)
  );

  const addToCart = useCallback((
    product: Product,
    sourceEl?: HTMLElement | null,
    options?: CartOptions,
    showPanel = false
  ) => {
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

    // The fly animation and the slide-over would fight each other — the parcel
    // lands behind the panel's backdrop. Only one of the two ever runs.
    if (sourceEl && target && !reduce && !showPanel) {
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
    if (showPanel) {
      setLastAdded({ slug: product.slug, qty: 1, options });
      setAddedOpen(true);
    }
  }, []);

  const clearCart = useCallback(() => setLines([]), []);

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
      value={{
        lines, count, subtotal, cartOpen, setCartOpen, addToCart, removeLine, changeQty,
        clearCart, registerCartIcon, bump, lastAdded, addedOpen, setAddedOpen, hydrated,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
