"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { products } from "@/lib/products";
import { getFavs, removeFav, FAVS_EVENT } from "@/lib/favourites";
import { useCart } from "./CartContext";

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill={filled ? "var(--gold-bright)" : "none"}
      stroke={filled ? "var(--gold-bright)" : "currentColor"}
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <path d="M12 20s-7-4.5-9-9c-1.2-2.8.4-6 3.5-6C8.5 5 10 6.5 12 9c2-2.5 3.5-4 5.5-4 3.1 0 4.7 3.2 3.5 6-2 4.5-9 9-9 9Z" />
    </svg>
  );
}

export default function FavouritesMenu({ locale }: { locale: string }) {
  const uk = locale === "uk";
  const { addToCart } = useCart();
  const [slugs, setSlugs] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  /* keep in sync with the store (PDP heart, other tabs) */
  useEffect(() => {
    const sync = () => setSlugs(getFavs());
    sync();
    window.addEventListener(FAVS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(FAVS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  /* close on outside click / escape */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const items = slugs
    .map((s) => products.find((p) => p.slug === s))
    .filter((p): p is (typeof products)[number] => Boolean(p));

  const L = {
    title: uk ? "Обране" : "Favourites",
    empty: uk ? "Ви ще нічого не зберегли" : "You haven't saved anything yet",
    emptyHint: uk ? "Натисніть ♡ на товарі, щоб додати сюди" : "Tap the heart on a product to save it here",
    add: uk ? "Додати в кошик" : "Add to bag",
    remove: uk ? "Прибрати" : "Remove",
  };

  return (
    <div className="relative flex items-center" ref={wrapRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="nav-link relative flex items-center justify-center"
        aria-label={L.title}
        aria-expanded={open}
      >
        <HeartIcon filled={items.length > 0} />
        {items.length > 0 && (
          <span
            className="cart-badge absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 flex items-center justify-center rounded-full text-[10px] font-semibold tabular-nums"
            style={{ background: "var(--gold-bright)", color: "var(--ink)" }}
          >
            {items.length}
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed top-[64px] right-3 md:absolute md:top-full md:right-0 md:mt-4 w-[320px] max-w-[calc(100vw-24px)] rounded-xl overflow-hidden z-50"
          style={{ background: "#ffffff", boxShadow: "0 12px 40px rgba(0,0,0,0.28)", border: "1px solid var(--border)" }}
        >
          <div className="px-4 py-3 flex items-center justify-between border-b" style={{ borderColor: "var(--border)" }}>
            <span className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
              {L.title}
            </span>
            <span className="text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>
              {items.length}
            </span>
          </div>

          {items.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <div className="mx-auto mb-3 opacity-40" style={{ color: "var(--text-muted)" }}>
                <HeartIcon filled={false} />
              </div>
              <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>{L.empty}</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-faint)" }}>{L.emptyHint}</p>
            </div>
          ) : (
            <ul className="max-h-[360px] overflow-y-auto">
              {items.map((p) => (
                <li
                  key={p.slug}
                  data-fav-row
                  className="flex items-center gap-3 px-4 py-3 border-b last:border-0"
                  style={{ borderColor: "var(--border)" }}
                >
                  <Link
                    href={`/${locale}/products/${p.slug}`}
                    onClick={() => setOpen(false)}
                    className="relative w-14 h-14 shrink-0 rounded-md overflow-hidden"
                    style={{ background: "#f5f5f5" }}
                  >
                    <Image src={p.gridImage || p.image} alt="" fill sizes="56px" className="object-contain" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/${locale}/products/${p.slug}`}
                      onClick={() => setOpen(false)}
                      className="block text-[13px] font-medium truncate hover:opacity-70"
                      style={{ color: "var(--ink)" }}
                    >
                      {uk ? p.nameUk : p.nameEn}
                    </Link>
                    <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      €{p.price.toFixed(2)}
                    </div>
                    <button
                      onClick={(e) => {
                        const img = (e.currentTarget.closest("[data-fav-row]") as HTMLElement)?.querySelector("img");
                        addToCart(p, (img as HTMLElement) ?? null);
                      }}
                      className="mt-1 text-[11px] font-medium underline underline-offset-2 hover:opacity-70"
                      style={{ color: "var(--ink)" }}
                    >
                      {L.add}
                    </button>
                  </div>
                  <button
                    onClick={() => removeFav(p.slug)}
                    className="shrink-0 p-1 hover:opacity-60"
                    aria-label={L.remove}
                    style={{ color: "var(--text-faint)" }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M4 4l8 8M12 4l-8 8" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
