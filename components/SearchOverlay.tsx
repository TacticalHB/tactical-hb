"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { products } from "@/lib/products";

export default function SearchOverlay({
  open,
  onClose,
  locale,
}: {
  open: boolean;
  onClose: () => void;
  locale: string;
}) {
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (open) {
      setQ("");
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return products.filter((p) => {
      const hay = `${p.nameEn} ${p.nameUk} ${p.tileTitle ?? ""} ${p.category} ${p.tags.join(" ")}`.toLowerCase();
      return hay.includes(term);
    });
  }, [q]);

  const go = (slug: string) => {
    onClose();
    router.push(`/${locale}/products/${slug}`);
  };

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-[120] transition-opacity duration-300"
        style={{ background: "rgba(0,0,0,0.35)", opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none" }}
        aria-hidden="true"
      />
      <div
        className="fixed top-0 left-0 right-0 z-[121] transition-transform duration-300"
        style={{ background: "#ffffff", transform: open ? "translateY(0)" : "translateY(-100%)" }}
        aria-hidden={!open}
      >
        <div className="max-w-3xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3 border-b pb-3" style={{ borderColor: "var(--border)" }}>
            <svg width="22" height="22" fill="none" stroke="var(--text-muted)" strokeWidth="1.6">
              <circle cx="10" cy="10" r="7" />
              <path d="M15 15l5 5" />
            </svg>
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={locale === "uk" ? "Пошук продуктів…" : "Search products…"}
              className="flex-1 bg-transparent outline-none text-lg"
              style={{ color: "var(--text)" }}
            />
            <button onClick={onClose} aria-label="Close search" style={{ color: "var(--text-muted)" }}>
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M5 5l10 10M15 5L5 15" />
              </svg>
            </button>
          </div>

          {q.trim() && (
            <div className="py-3">
              {results.length === 0 ? (
                <p className="text-sm py-4" style={{ color: "var(--text-muted)" }}>
                  {locale === "uk" ? "Нічого не знайдено" : "No results"}
                </p>
              ) : (
                <ul className="flex flex-col">
                  {results.map((p) => {
                    const name = p.tileTitle || (locale === "uk" ? p.nameUk : p.nameEn);
                    const thumb = p.tileImage || p.image;
                    return (
                      <li key={p.slug}>
                        <button onClick={() => go(p.slug)} className="w-full flex items-center gap-4 py-3 text-left hover:opacity-70 transition-opacity">
                          <div className="relative w-12 h-12 shrink-0" style={{ background: "var(--bg-soft)", borderRadius: 6 }}>
                            <Image src={thumb} alt={name} fill sizes="48px" className="object-contain p-1" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{name}</div>
                            <div className="text-xs tracking-widest uppercase" style={{ color: "var(--text-faint)" }}>{p.category}</div>
                          </div>
                          <span className="font-display text-lg" style={{ color: "var(--gold)" }}>€{p.price.toFixed(2)}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
