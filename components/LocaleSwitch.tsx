"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LOCALE_ENDONYM,
  LOCALE_LABEL,
  LOCALE_ORDER,
  localePath,
} from "@/lib/locale-label";

/* ---------------------------------------------------------------------------
   The language control: all four, always visible.

   WHY NOT A TOGGLE. With two languages, one link reading "EN" is unambiguous —
   you are on the other one. With four it becomes a guessing game, and the
   person who most needs the control is the one who landed on a language they
   cannot read: they cannot follow a hint, only a signpost. So every locale is
   on screen and one tap goes straight to it.

   THE CURRENT ONE IS MARKED TWICE OVER. Full-strength colour AND an underline,
   because colour alone fails for anyone who cannot separate the two greys —
   and `aria-current="true"` says the same thing to a screen reader, which sees
   neither.

   EACH LINK CARRIES ITS OWN `lang`. Without it a screen reader reads "JA" with
   an English voice; with it the badge is announced in the language it offers,
   and `title` gives the endonym for anyone hovering.

   THE PATH IS PRESERVED — /ja/products goes to /en/products, not to the home
   page. Landing somebody on the front door because they changed language is
   how you lose the thing they were looking at.
--------------------------------------------------------------------------- */

export default function LocaleSwitch({
  locale,
  className = "",
  onNavigate,
}: {
  locale: string;
  className?: string;
  /** Lets the mobile menu close itself when a language is chosen. */
  onNavigate?: () => void;
}) {
  const pathname = usePathname() || `/${locale}`;

  return (
    <div
      className={`flex items-center ${className}`}
      /* A group label rather than a nav landmark: this is four links, not a
         section of the site. */
      role="group"
      aria-label="Language"
    >
      {LOCALE_ORDER.map((code, i) => {
        const active = code === locale;
        return (
          <span key={code} className="flex items-center">
            {i > 0 && (
              <span aria-hidden="true" className="px-1.5 text-[10px] select-none" style={{ color: "#5c5a55" }}>
                ·
              </span>
            )}
            <Link
              href={localePath(pathname, code)}
              onClick={onNavigate}
              lang={code}
              hrefLang={code}
              title={LOCALE_ENDONYM[code]}
              aria-current={active ? "true" : undefined}
              /* 44px tall so it is a real target on a phone, but only as wide
                 as the badge needs — four of these sit in a header, and the
                 measured 29×44 still clears WCAG 2.5.8's 24×24. */
              /* .nav-link carries the header's resting grey and its accent
                 hover; the active one is overridden to the bright text this
                 dark bar uses everywhere else. Literal values rather than
                 tokens because the tokens in scope here are the LIGHT theme's
                 — this control only ever sits on the dark header. */
              className="nav-link inline-flex items-center justify-center h-11 px-1 text-xs tracking-[0.2em] uppercase"
              style={{
                color: active ? "#f4f3f0" : undefined,
                fontWeight: active ? 600 : 400,
                textDecoration: active ? "underline" : "none",
                textUnderlineOffset: "5px",
              }}
            >
              {LOCALE_LABEL[code]}
            </Link>
          </span>
        );
      })}
    </div>
  );
}
