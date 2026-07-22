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

/** A price expressed in both currencies. */
export type Money = { eur: number; uah: number };

/** UAH is quoted in whole hryvnia; round so add-ons stay tidy (€2.50 → ₴129). */
export const eurToUah = (eur: number): number => Math.round(eur * UAH_PER_EUR);

/** Build a Money. Pass an explicit `uah` for catalogue prices; omit it to convert. */
export function money(eur: number, uah?: number): Money {
  return { eur, uah: uah ?? eurToUah(eur) };
}

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
    : `€${m.eur.toFixed(2)}`;
}
