import { defineRouting } from "next-intl/routing";

/* ---------------------------------------------------------------------------
   The storefronts, as routes.

   THREE OF THEM, AND THEY ARE NOT INTERCHANGEABLE. Each carries its own
   currency and its own delivery model, decided elsewhere and derived from this
   code alone — see lib/currency (uk → UAH, everything else → EUR) and
   lib/shipping-locale (uk → inside Ukraine, everything else → outside it).
   Japanese is therefore a euro, export storefront: the same commercial model
   as English, in a different language.

   THE ORDER HERE IS THE ORDER IN THE SWITCHER. defaultLocale stays uk, which
   is where the shop actually sells most; nothing about adding a language
   changes who a first-time visitor is.

   ARABIC READS RIGHT TO LEFT, and that is the one thing a locale list cannot
   express on its own — see RTL_LOCALES below. Everything else about it matches
   English: euro, and shipped outside Ukraine.
--------------------------------------------------------------------------- */
export const locales = ["uk", "en", "ja", "ar"] as const;
export type AppLocale = (typeof locales)[number];

/**
 * Locales written right to left.
 *
 * A SET RATHER THAN A FLAG ON EACH LOCALE, because direction is a property of
 * the script and not of the shop: any locale added later is left-to-right
 * unless it is named here, which is the safe default to get wrong.
 */
const RTL_LOCALES = new Set<string>(["ar"]);

/** What belongs in <html dir="…"> for this locale. */
export function localeDir(locale: string): "rtl" | "ltr" {
  return RTL_LOCALES.has(locale) ? "rtl" : "ltr";
}

export const routing = defineRouting({
  locales,
  defaultLocale: "uk",
  /* HREFLANG IS DECLARED ONCE, IN THE HTML, AND THIS TURNS OFF THE SECOND COPY.

     next-intl sets a `Link:` response header carrying the same alternates by
     default, and on 22 September 2026 Bing's URL inspection showed the two
     disagreeing: the header gave x-default as https://tactical-hb.com/ while
     the <link> tag from lib/seo gave https://tactical-hb.com/uk. The four
     locale entries matched, which made the single disagreement read as a bug
     rather than a choice, and a crawler handed two answers picks one.

     THE HTML IS THE ONE THAT STAYS, because it is the one that was decided:
     alternatesFor() points x-default at Ukrainian on purpose — a Ukrainian
     brand selling domestically first — and the same helper builds the sitemap,
     so the file and the pages cannot drift apart. The header was a library
     default nobody chose, generated from the route rather than from that rule.

     This changes no redirect and no locale detection. It removes a header. */
  alternateLinks: false,
});

/** Narrow an unknown string to a locale we actually serve. */
export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}
