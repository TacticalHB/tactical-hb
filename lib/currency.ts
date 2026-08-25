/* ---------------------------------------------------------------------------
   Dual-currency pricing (UAH + EUR).

   Currency follows the site language: УКР → UAH, ENG → EUR. One currency is
   shown at a time — never both at once — and it changes only when the language
   does.

   Two kinds of amount:

   • Catalogue prices are set BY HAND in both currencies (see lib/products.ts).
     They're rounded marketing numbers, not conversions — FTP is ₴500 / €13,
     which is ~38.5 UAH/€, deliberately not the FX rate below. Never derive a
     product price; always read both values from the catalogue.

   • Derived amounts (the HMD lid/rubber add-ons, cart subtotals) are converted
     at UAH_PER_EUR, because hand-maintaining every combination would rot.

   To reprice: edit the numbers in lib/products.ts and, if the rate moves,
   UAH_PER_EUR here. Nothing else needs touching.
--------------------------------------------------------------------------- */

export type Currency = "EUR" | "UAH";

/** Display FX rate for derived amounts only — not for catalogue prices. */
export const UAH_PER_EUR = 51.5;

/**
 * The fixed commercial rate, set by Mario at 51 on 29 July 2026. Two jobs, and
 * they must use the same number or the page stops matching the invoice:
 *
 *   • showing a carrier's hryvnia shipping quote on a euro storefront, and
 *   • converting a euro-list order into the hryvnia Monobank invoice, since
 *     Monobank issues invoices in hryvnia only (ccy 980).
 *
 * DELIBERATELY ITS OWN CONSTANT rather than a change to UAH_PER_EUR above. That
 * one also prices the HMD add-ons, so moving it to 51 would quietly reprice the
 * lid on the Ukrainian storefront (₴129 → ₴128), which was never asked for. The
 * catalogue carries a third implied rate of its own (A.Craft is €24 / ₴900,
 * about 37.5), so a single true rate was never the model here.
 */
export const UAH_PER_EUR_FIXED = 51;

/** A price expressed in both currencies. */
export type Money = { eur: number; uah: number };

/** UAH is quoted in whole hryvnia; round so add-ons stay tidy (€2.50 → ₴129). */
export const eurToUah = (eur: number): number => Math.round(eur * UAH_PER_EUR);

/** EUR keeps cents. For amounts that arrive quoted in UAH (carrier rates). */
export const uahToEur = (uah: number): number => Math.round((uah / UAH_PER_EUR) * 100) / 100;

/** Build a Money. Pass an explicit `uah` for catalogue prices; omit it to convert. */
export function money(eur: number, uah?: number): Money {
  return { eur, uah: uah ?? eurToUah(eur) };
}

/**
 * Build a Money from a UAH-quoted amount — shipping, chiefly: both carriers
 * quote in hryvnia, but an EN-locale summary must still show one currency and
 * a total that includes it. Used by the summary panel and the order email
 * alike, so page and receipt cannot disagree.
 *
 * Half-up to the cent: 1190 ₴ / 51 = 23.3333… → €23.33. Math.round takes .5
 * upward for positive numbers, which is the commercial rounding asked for.
 */
export function moneyFromUah(uah: number): Money {
  return {
    eur: Math.round((uah / UAH_PER_EUR_FIXED) * 100) / 100,
    uah: Math.round(uah),
  };
}

/**
 * A euro amount as the hryvnia that will actually be charged for it.
 *
 * Only for the invoice: Monobank cannot bill euro, so a euro-storefront order
 * is converted here at the same fixed rate the customer was shown. Whole
 * hryvnia, because that is how the invoice is denominated.
 */
export const eurToUahFixed = (eur: number): number => Math.round(eur * UAH_PER_EUR_FIXED);

export const addMoney = (a: Money, b: Money): Money => ({ eur: a.eur + b.eur, uah: a.uah + b.uah });

export const scaleMoney = (m: Money, n: number): Money => ({ eur: m.eur * n, uah: m.uah * n });

/**
 * Subtract, clamped at zero — a voucher worth more than the basket discounts
 * the basket to nothing, it never becomes a negative charge.
 */
export const subtractMoney = (a: Money, b: Money): Money => ({
  eur: Math.max(0, Math.round((a.eur - b.eur) * 100) / 100),
  uah: Math.max(0, Math.round(a.uah - b.uah)),
});

/** Which currency a locale shows as its headline price. */
export const currencyForLocale = (locale: string): Currency => (locale === "uk" ? "UAH" : "EUR");

/** Format one currency. UAH has no minor unit; EUR keeps two decimals. */
export function formatMoney(m: Money, currency: Currency): string {
  return currency === "UAH"
    ? `₴${Math.round(m.uah).toLocaleString("uk-UA")}`
    /* THE LOCALE IS HARDCODED, AND THAT IS THE POINT. It is not the page's
       locale — passing that would give a reader on the Arabic storefront
       Arabic-Indic digits, and the whole storefront deliberately prints Latin
       numerals (see i18n: dates are pinned to ar-u-nu-latn for the same
       reason). "en-GB" here is a formatting recipe, not a language: comma
       thousands, dot decimal, Western digits, whoever is reading.

       The grouping was added when wholesale started quoting four figures —
       €1026.00 is a number you have to count. Retail never reaches a thousand,
       so nothing there looks any different. */
    : `€${m.eur.toLocaleString("en-GB", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
}
