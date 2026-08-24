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
});

/** Narrow an unknown string to a locale we actually serve. */
export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}
