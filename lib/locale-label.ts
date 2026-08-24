import { locales, type AppLocale } from "@/i18n/routing";

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

   JA AND AR KEEP THEIR ISO FORM, and that is not an inconsistency with the
   above. UA was chosen over UK because UK actively means something else; JA
   and AR mean nothing else to anybody, so there is nothing to correct. JP and
   SA were the alternatives and both are COUNTRIES — the exact mistake UK made,
   and worse for Arabic, which is spoken across two dozen of them.

   THREE BADGES, ALL VISIBLE — see LocaleSwitch. The old control showed one
   link to "the other locale", which works for two languages and silently
   becomes a guessing game at three: a visitor who lands on Japanese by
   accident should not have to discover that the badge cycles.
--------------------------------------------------------------------------- */

export type Locale = AppLocale;

/** The badge shown on toggles and locale pairs. */
export const LOCALE_LABEL: Record<AppLocale, string> = {
  uk: "UA",
  en: "EN",
  ja: "JA",
  ar: "AR",
};

/** What each locale calls itself — for the `lang`-tagged title on the control. */
export const LOCALE_ENDONYM: Record<AppLocale, string> = {
  uk: "Українська",
  en: "English",
  ja: "日本語",
  ar: "العربية",
};

export function localeLabel(locale: string): string {
  return LOCALE_LABEL[locale as AppLocale] ?? locale.toUpperCase();
}

/** Every locale, in switcher order. */
export const LOCALE_ORDER: readonly AppLocale[] = locales;

/**
 * The next locale in the ring.
 *
 * Kept because the Mr HB file shows a compact pair rather than the full
 * switcher, and cycling is the honest behaviour there. Not used by the header,
 * which shows all four at once.
 */
export function otherLocale(locale: string): AppLocale {
  const i = LOCALE_ORDER.indexOf(locale as AppLocale);
  return LOCALE_ORDER[(i < 0 ? 0 : i + 1) % LOCALE_ORDER.length];
}

/**
 * The same page in another language.
 *
 * REPLACES THE OLD pathname.replace(`/${locale}`, `/${next}`), which was a
 * substring replacement on a URL and would rewrite the FIRST match anywhere in
 * it — /uk/products/hmd-uk-edition would have had its slug edited. This only
 * ever touches the first path segment, which is the only place a locale lives.
 */
export function localePath(pathname: string, next: AppLocale): string {
  const rest = pathname.replace(/^\/[^/]*/, "");
  return `/${next}${rest}`;
}
