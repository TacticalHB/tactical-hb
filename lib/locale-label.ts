/* ---------------------------------------------------------------------------
   How a locale is named in the UI. One place, because there were two.

   The navbar said УКР / ENG and the Mr HB page said EN / UK, which is two
   conventions for one decision — and the Mr HB one was actively wrong: "UK"
   reads as the United Kingdom to every English speaker alive. It is the ISO
   639-1 code for the Ukrainian *language* (uk), and it is correct in the URL
   and in the `lang` attribute, but a two-letter badge in a nav bar is read as
   a country, not as a language subtag.

   SO THE BADGE IS UA AND THE ROUTE STAYS /uk. Those are different systems:
   `routing.locales` is machine-facing and must stay ISO, while this is the
   human-facing label and follows what a human will actually think it means.
   Nothing here is allowed to leak into a URL or an hreflang value.
--------------------------------------------------------------------------- */

export type Locale = "uk" | "en";

/** The badge shown on toggles and locale pairs. */
export const LOCALE_LABEL: Record<Locale, string> = {
  uk: "UA",
  en: "EN",
};

export function localeLabel(locale: string): string {
  return LOCALE_LABEL[locale as Locale] ?? locale.toUpperCase();
}

/** The other locale — the one a toggle switches to. */
export function otherLocale(locale: string): Locale {
  return locale === "uk" ? "en" : "uk";
}
