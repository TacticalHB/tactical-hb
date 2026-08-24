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
   is where the shop actually sells most; nothing about adding a third language
   changes who a first-time visitor is.
--------------------------------------------------------------------------- */
export const locales = ["uk", "en", "ja"] as const;
export type AppLocale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: "uk",
});

/** Narrow an unknown string to a locale we actually serve. */
export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}
