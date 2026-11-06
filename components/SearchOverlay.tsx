"use client";

import ProductThumb from "@/components/ProductThumb";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { products } from "@/lib/products";
import { searchAddons } from "@/lib/addons";
import Price from "./Price";
import { money } from "@/lib/currency";
import { t } from "@/lib/i18n-text";

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
  const a11y = useTranslations("a11y");

  /* Opening the overlay starts a fresh search. The reset is a render-phase
     adjustment so the box is already empty on the frame it appears — an effect
     would show the previous query for one paint. Focus stays in an effect,
     which is where a DOM side effect belongs. */
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) setQ("");
  }

  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(id);
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

  /* What is left here is the timer alone, which is still an option with no page
     of its own, so its row lands on the wind cover where it is chosen.

     FEAR 9E418 and LID 9E418 are NOT in this list any more. They are catalogue
     products, so the product search above finds them and sends them to their
     own pages — and the terms someone would actually type ("rubber", "гумка",
     "ring", "9e418") are carried in their `tags`, which is what that search
     reads. A row here would send them to an HMD instead, which is exactly the
     behaviour these products exist to end. */
  const addonResults = useMemo(() => searchAddons(q), [q]);

  const go = (slug: string) => {
    onClose();
    router.push(`/${locale}/products/${slug}`);
  };

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-[120] transition-opacity duration-[var(--motion-base)]"
        style={{ background: "rgba(0,0,0,0.35)", opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none" }}
        aria-hidden="true"
      />
      <div
        className="fixed top-0 left-0 right-0 z-[121] transition-transform duration-[var(--motion-base)]"
        style={{ background: "#ffffff", transform: open ? "translateY(0)" : "translateY(-100%)" }}
        aria-hidden={!open}
      >
        <div className="max-w-3xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3 border-b pb-3" style={{ borderColor: "var(--border)" }}>
            <svg width="22" height="22" fill="none" stroke="var(--text-muted)" strokeWidth="1.6">
              <circle cx="10" cy="10" r="7" />
              <path d="M15 15l5 5" />
            </svg>
            {/* h-11 so the field itself is a 44px target — it was 28px, which
                on a phone is a thin band to land a thumb in, and this is the
                first thing anyone touches after opening search. */}
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t(locale, { uk: "Пошук продуктів…", en: "Search products…", ja: "製品を検索…", ar: "ابحث في المنتجات…" })}
              className="flex-1 min-w-0 h-11 bg-transparent outline-none text-lg"
              style={{ color: "var(--text)" }}
            />
            {/* The ✕ was a 20×20 glyph. -me-2.5 keeps it visually in the
                corner while the box grows around it, the same trick the navbar
                icons and the cookie modal's close button already use. */}
            <button
              onClick={onClose}
              aria-label={a11y("search_close")}
              className="flex items-center justify-center w-11 h-11 -me-2.5 shrink-0"
              style={{ color: "var(--text-muted)" }}
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M5 5l10 10M15 5L5 15" />
              </svg>
            </button>
          </div>

          {q.trim() && (
            <div className="py-3">
              {results.length === 0 && addonResults.length === 0 ? (
                <p className="text-sm py-4" style={{ color: "var(--text-muted)" }}>
                  {t(locale, { uk: "Нічого не знайдено", en: "No results", ja: "該当なし", ar: "لا نتائج" })}
                </p>
              ) : (
                <ul className="flex flex-col">
                  {addonResults.map((a) => (
                    <li key={a.key}>
                      <button
                        onClick={() => go(a.parentSlug)}
                        className="w-full flex items-center gap-4 py-3 text-left hover:opacity-70 transition-opacity"
                      >
                        <div
                          className="relative w-12 h-12 shrink-0 grid place-items-center"
                          style={{ background: "var(--bg-soft)", borderRadius: 6 }}
                        >
                          <span className="text-[9px] tracking-widest uppercase" style={{ color: "var(--text-faint)" }}>
                            {t(locale, { uk: "Опція", en: "Add-on", ja: "オプション", ar: "إضافة" })}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>
                            {locale === "uk" ? a.nameUk : a.nameEn}
                          </div>
                          <div className="text-xs tracking-widest uppercase" style={{ color: "var(--text-faint)" }}>
                            {locale === "uk" ? a.parentUk : a.parentEn}
                          </div>
                        </div>
                        <span className="font-display text-lg" style={{ color: "var(--accent-ink)" }}>
                          +<Price money={a.price} locale={locale} />
                        </span>
                      </button>
                    </li>
                  ))}
                  {results.map((p) => {
                    const name = p.tileTitle || (locale === "uk" ? p.nameUk : p.nameEn);
                    const thumb = p.tileImage || p.image;
                    return (
                      <li key={p.slug}>
                        <button onClick={() => go(p.slug)} className="w-full flex items-center gap-4 py-3 text-left hover:opacity-70 transition-opacity">
                          <div className="relative w-12 h-12 shrink-0" style={{ background: "var(--bg-soft)", borderRadius: 6 }}>
                            <ProductThumb src={thumb} name={name} sizes="48px" className="object-contain p-1" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{name}</div>
                            <div className="text-xs tracking-widest uppercase" style={{ color: "var(--text-faint)" }}>{p.category}</div>
                          </div>
                          <span className="font-display text-lg" style={{ color: "var(--accent-ink)" }}><Price money={money(p.price, p.priceUah)} locale={locale} /></span>
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
