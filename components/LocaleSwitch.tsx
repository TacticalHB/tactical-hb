"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import {
  LOCALE_ENDONYM,
  LOCALE_LABEL,
  LOCALE_ORDER,
  localePath,
} from "@/lib/locale-label";
import type { AppLocale } from "@/i18n/routing";

/* ---------------------------------------------------------------------------
   The language control.

   WHY IT IS NO LONGER FOUR BADGES IN A ROW. With two locales an inline pair is
   the tidiest thing possible. With four, `UA · EN · JA · AR` is eight glyphs
   and three separators competing with search, account and bag in a 375px bar —
   dense to read and easy to mis-tap. So the header now shows ONE thing (the
   language you are in) and opens the rest on demand.

   THE TRIGGER NAMES THE CURRENT LANGUAGE, which is the question a lost visitor
   actually has. It is not a generic globe: someone who landed on Japanese by
   accident needs to see "JA" to understand what happened, and a globe would
   tell them nothing.

   TWO SHAPES, ONE SOURCE OF TRUTH:

     "popover" — the header. A compact trigger and a panel of four rows.
     "list"    — inside the mobile menu sheet, where a popover would be a
                 layer on top of a layer. Full-width 44px rows instead, which
                 is both easier to hit and easier to read than a popover
                 opening inside an already-open sheet.

   THE PATH IS PRESERVED — /ja/products goes to /en/products, not to the front
   door. Landing somebody on the home page because they changed language is how
   you lose the thing they were looking at.
--------------------------------------------------------------------------- */

function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" className="shrink-0">
      <path d="M2.5 7.5l3 3 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      aria-hidden="true"
      className="shrink-0 transition-transform duration-200"
      style={{ transform: open ? "rotate(180deg)" : "none" }}
    >
      <path d="M2 3.5L5 6.5l3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function LocaleSwitch({
  locale,
  className = "",
  onNavigate,
  variant = "popover",
}: {
  locale: string;
  className?: string;
  /** Lets the mobile menu close itself when a language is chosen. */
  onNavigate?: () => void;
  variant?: "popover" | "list";
}) {
  const pathname = usePathname() || `/${locale}`;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  /* Dismissal, not a focus trap. This is four links, and a trap would make a
     keyboard user press Escape to get out of a control they only glanced at.
     Escape closes and returns focus to the trigger; a click or a focus move
     outside just closes. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onOutside = (e: Event) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onOutside);
    document.addEventListener("focusin", onOutside);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onOutside);
      document.removeEventListener("focusin", onOutside);
    };
  }, [open]);

  const current = (LOCALE_LABEL[locale as AppLocale] ?? locale.toUpperCase()) as string;

  const rows = LOCALE_ORDER.map((code) => ({
    code,
    href: localePath(pathname, code),
    active: code === locale,
    label: LOCALE_LABEL[code],
    endonym: LOCALE_ENDONYM[code],
  }));

  /* ---- The mobile menu's shape: plain rows, no second layer ---------------- */
  if (variant === "list") {
    return (
      <ul className={`flex flex-col ${className}`} aria-label="Language">
        {rows.map((r) => (
          <li key={r.code}>
            <Link
              href={r.href}
              onClick={onNavigate}
              lang={r.code}
              hrefLang={r.code}
              aria-current={r.active ? "true" : undefined}
              className="flex items-center gap-3 h-11 w-full text-sm transition-opacity hover:opacity-70"
              style={{ color: r.active ? "#f4f3f0" : "#9a978f", fontWeight: r.active ? 600 : 400 }}
            >
              {/* The tick sits in a fixed-width well so the four endonyms line
                  up whether or not they carry one. */}
              <span className="w-4 shrink-0" style={{ color: "var(--accent)" }}>
                {r.active && <Check />}
              </span>
              {/* Each name in its own script, tagged so a screen reader
                  pronounces it in that language rather than in English. */}
              <span lang={r.code}>{r.endonym}</span>
              <span className="ms-auto text-[11px] tracking-[0.18em]" style={{ color: "#5c5a55" }}>
                {r.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    );
  }

  /* ---- The header's shape: one trigger, four rows on demand ---------------- */
  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={open ? panelId : undefined}
        /* The accessible name says what the control DOES; the visible text
           says where you are. Both matter — "EN" alone would be announced as
           two letters with no hint that it opens anything. */
        aria-label={`Language — ${LOCALE_ENDONYM[locale as AppLocale] ?? current}`}
        className="nav-link inline-flex items-center gap-1.5 h-11 px-2 text-xs tracking-[0.2em] uppercase"
        style={{ color: open ? "#f4f3f0" : undefined }}
      >
        {current}
        <Chevron open={open} />
      </button>

      {open && (
        <div
          id={panelId}
          role="group"
          aria-label="Language"
          /* Anchored to the INLINE END, so it opens leftward on the English
             header and rightward on the Arabic one — and either way it stays
             inside the viewport instead of pushing the page wide. */
          className="absolute end-0 top-full mt-1 min-w-[190px] rounded-[6px] overflow-hidden z-[60]"
          style={{
            background: "#1c1f24",
            border: "1px solid var(--border-dark)",
            boxShadow: "0 12px 34px rgba(0,0,0,0.45)",
          }}
        >
          {rows.map((r, i) => (
            <Link
              key={r.code}
              href={r.href}
              onClick={() => {
                setOpen(false);
                onNavigate?.();
              }}
              lang={r.code}
              hrefLang={r.code}
              aria-current={r.active ? "true" : undefined}
              className="flex items-center gap-3 h-11 px-3.5 text-sm transition-colors"
              style={{
                color: r.active ? "#f4f3f0" : "#9a978f",
                fontWeight: r.active ? 600 : 400,
                borderTop: i > 0 ? "1px solid rgba(255,255,255,0.06)" : "none",
              }}
            >
              <span className="w-4 shrink-0" style={{ color: "var(--accent)" }}>
                {r.active && <Check />}
              </span>
              <span lang={r.code}>{r.endonym}</span>
              <span className="ms-auto text-[11px] tracking-[0.18em]" style={{ color: "#5c5a55" }}>
                {r.label}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
