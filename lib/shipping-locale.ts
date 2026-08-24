/* ---------------------------------------------------------------------------
   Which storefront ships where.

     /uk        →  inside Ukraine only    (Nova Poshta branch or courier)
     /en, /ja   →  outside Ukraine only   (Nova Poshta or Ukrposhta cross-border)

   THE LOCALE DECIDES, AND NOTHING ELSE DOES. Not the browser's language, not a
   guess from the address, not a radio button the customer can change. Each
   storefront is a shop with one delivery model: the Ukrainian one quotes in
   hryvnia against a branch network, the export ones quote in euro against a
   customs declaration. Letting either offer the other's options produced
   checkouts that could not be priced and totals that could not be explained.

   THE TEST IS "IS THIS UKRAINIAN", NOT "IS THIS ENGLISH", and that is why
   adding Japanese needed no change here: everything below asks whether the
   locale is uk and treats every other storefront as an export one. A rule
   written the other way round — listing the export locales — would have
   silently put /ja on the domestic path the day it was added.

   THIS FILE IS THE ONLY PLACE THAT KNOWS THE RULE, and it has no imports on
   purpose — the checkout imports it in the browser, and the quote route, the
   invoice route and the payment webhook import it on the server. A rule that
   the UI enforces and the server re-derives from a copy is a rule with two
   versions, and the version that matters is whichever one an attacker skips.

   HIDING IS NOT ENFORCING. Everything here is used twice: once to decide what
   the customer is shown, and once to decide what the server will accept. The
   second is the one that counts.
--------------------------------------------------------------------------- */

export type Destination = "ukraine" | "international";
export type ShippingMethod = "nova_poshta" | "international";

/** Ukraine's ISO 3166-1 alpha-2 code — the hinge the whole rule turns on. */
export const UA = "UA";

/** Where this storefront delivers. */
export function destinationForLocale(locale: string): Destination {
  return locale === "uk" ? "ukraine" : "international";
}

/**
 * The one shipping method this storefront may use.
 *
 * Singular deliberately. There is no list to choose from any more, which is
 * why the checkout's destination radio group is gone: a control offering one
 * option is a control that decides nothing.
 */
export function shippingMethodForLocale(locale: string): ShippingMethod {
  return destinationForLocale(locale) === "ukraine" ? "nova_poshta" : "international";
}

/** Whether a submitted shipping method belongs on this storefront. */
export function methodAllowedOn(locale: string, method: string | null | undefined): boolean {
  return method === shippingMethodForLocale(locale);
}

/**
 * Whether a destination country may be shipped to from this storefront.
 *
 * An empty code is allowed: it means nothing has been chosen yet, which is a
 * state the checkout passes through rather than an attempt to break the rule.
 * A real code is checked in both directions — Ukraine is the only country the
 * Ukrainian shop will send to, and the only one the English shop will not.
 */
export function countryAllowedOn(locale: string, iso2: string | null | undefined): boolean {
  const code = (iso2 ?? "").trim().toUpperCase();
  if (!code) return true;
  return destinationForLocale(locale) === "ukraine" ? code === UA : code !== UA;
}

/**
 * What to tell someone standing in the wrong shop.
 *
 * Points at the other storefront rather than simply refusing: the thing they
 * are trying to do is possible, just not here, and a customer who is told only
 * "no" leaves. Kept short — it appears next to the delivery step, not as a
 * banner on every page.
 */
export function wrongStorefrontMessage(locale: string): string {
  if (locale === "uk") {
    return "Доставка лише по Україні. Для міжнародної доставки відкрийте англійську версію сайту.";
  }
  if (locale === "ja") {
    return "このストアは海外配送のみです。ウクライナ国内へのお届けはウクライナ語版サイトをご利用ください。";
  }
  return "International delivery only on this storefront. For shipping within Ukraine, use the Ukrainian site.";
}

/** Where that message should send them. */
export function otherStorefrontPath(locale: string, path = "/checkout"): string {
  /* Whichever storefront can actually serve what this one cannot: the
     Ukrainian shop sends people abroad to English, and both export shops send
     people shipping inside Ukraine to Ukrainian. */
  return `/${locale === "uk" ? "en" : "uk"}${path}`;
}

/**
 * The single error code every server gate returns on a mismatch.
 *
 * One code rather than one per route, so the checkout can recognise it
 * wherever it comes from and answer with wrongStorefrontMessage() instead of a
 * generic failure the customer cannot act on.
 */
export const LOCALE_SHIPPING_MISMATCH = "locale_shipping_mismatch";
