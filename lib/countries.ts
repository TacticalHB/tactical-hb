/* ---------------------------------------------------------------------------
   Country list for international checkout.

   Names come from Intl.DisplayNames in the current locale, so this file holds
   only ISO 3166-1 alpha-2 codes — no hand-maintained bilingual name list to
   drift.

   TO CHANGE WHAT SHIPS: edit the EXCLUDED_* sets below. Removing a code from a
   set re-lists that country; adding one hides it. Nothing else needs touching.
--------------------------------------------------------------------------- */

/** Sentinel appended to the bottom of the dropdown — "type it yourself". */
export const OTHER = "OTHER";

/** Not shipped to (sanctions / policy). */
const EXCLUDED_SANCTIONS = new Set<string>([
  "RU", // Russia
  "BY", // Belarus
  "KP", // North Korea
]);

/**
 * Most of Africa. Delete a code to re-list that country; add one to hide it.
 * Egypt (EG), South Africa (ZA) and Morocco (MA) are deliberately kept OUT of
 * this set, so they appear in the dropdown. Israel (IL) is not African and
 * stays listed regardless.
 */
const EXCLUDED_AFRICA = new Set<string>([
  "DZ", "AO", "BJ", "BW", "BF", "BI", "CV", "CM", "CF", "TD", "KM", "CG", "CD",
  "CI", "DJ", "GQ", "ER", "SZ", "ET", "GA", "GM", "GH", "GN", "GW", "KE",
  "LS", "LR", "LY", "MG", "MW", "ML", "MR", "MU", "MZ", "NA", "NE", "NG",
  "RW", "ST", "SN", "SC", "SL", "SO", "SS", "SD", "TZ", "TG", "TN", "UG",
  "EH", "ZM", "ZW",
]);

function isExcluded(code: string): boolean {
  return EXCLUDED_SANCTIONS.has(code) || EXCLUDED_AFRICA.has(code);
}

/** Every country code we consider — the standard ISO 3166-1 alpha-2 set. */
const ALL_CODES: string[] = [
  "AF", "AL", "DZ", "AD", "AO", "AG", "AR", "AM", "AU", "AT", "AZ", "BS", "BH",
  "BD", "BB", "BY", "BE", "BZ", "BJ", "BT", "BO", "BA", "BW", "BR", "BN", "BG",
  "BF", "BI", "KH", "CM", "CA", "CV", "CF", "TD", "CL", "CN", "CO", "KM", "CG",
  "CD", "CR", "CI", "HR", "CU", "CY", "CZ", "DK", "DJ", "DM", "DO", "EC", "EG",
  "SV", "GQ", "ER", "EE", "SZ", "ET", "FJ", "FI", "FR", "GA", "GM", "GE", "DE",
  "GH", "GR", "GD", "GT", "GN", "GW", "GY", "HT", "HN", "HU", "IS", "IN", "ID",
  "IR", "IQ", "IE", "IL", "IT", "JM", "JP", "JO", "KZ", "KE", "KI", "KP", "KR",
  "KW", "KG", "LA", "LV", "LB", "LS", "LR", "LY", "LI", "LT", "LU", "MG", "MW",
  "MY", "MV", "ML", "MT", "MH", "MR", "MU", "MX", "FM", "MD", "MC", "MN", "ME",
  "MA", "MZ", "MM", "NA", "NR", "NP", "NL", "NZ", "NI", "NE", "NG", "MK", "NO",
  "OM", "PK", "PW", "PA", "PG", "PY", "PE", "PH", "PL", "PT", "QA", "RO", "RU",
  "RW", "KN", "LC", "VC", "WS", "SM", "ST", "SA", "SN", "RS", "SC", "SL", "SG",
  "SK", "SI", "SB", "SO", "ZA", "SS", "ES", "LK", "SD", "SR", "SE", "CH", "SY",
  "TW", "TJ", "TZ", "TH", "TL", "TG", "TO", "TT", "TN", "TR", "TM", "TV", "UG",
  "UA", "AE", "GB", "US", "UY", "UZ", "VU", "VA", "VE", "VN", "YE", "ZM", "ZW",
];

export type CountryOption = { code: string; name: string };

/**
 * Listed countries for `locale`, alphabetical by localised name, excluded
 * codes removed. The "Other" sentinel is NOT included here — the UI appends it
 * as the final option so it always sits at the very bottom.
 */
export function countryOptions(locale: string): CountryOption[] {
  let name = (code: string) => code;
  try {
    const dn = new Intl.DisplayNames([locale], { type: "region" });
    name = (code: string) => dn.of(code) ?? code;
  } catch {
    // Very old runtimes: fall back to the raw code rather than break checkout.
  }

  return ALL_CODES.filter((c) => !isExcluded(c))
    .map((c) => ({ code: c, name: name(c) }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
}

/* ---------------------------------------------------------------------------
   "Other" free-text guard.

   The Other field lets a customer type any country, so it bypasses the dropdown
   exclusions by design. Only NORTH KOREA is blocked here — shipping there is
   not possible — while everything else (including Russia and Belarus) is left
   to be handled manually. Matches the common English and Ukrainian names and a
   few aliases, normalised so punctuation and spacing don't matter.
--------------------------------------------------------------------------- */

const BLOCKED_MANUAL = [
  "north korea", "northkorea", "korea north", "dprk",
  "democratic peoples republic of korea",
  "pivnichna koreya", "північна корея", "кндр", "korea pivnichna",
];

function normalise(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[^a-zа-яїієґ0-9\s]/gi, "").replace(/\s+/g, " ").trim();
}

/** True when a manually typed country name is one we refuse to ship to. */
export function isBlockedManualCountry(name: string): boolean {
  const n = normalise(name);
  if (!n) return false;
  return BLOCKED_MANUAL.some((b) => n === b || n.includes(b));
}

/** Localised country name for a code, e.g. "DE" → "Germany". */
export function countryName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}
