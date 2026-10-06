/* ---------------------------------------------------------------------------
   The checks a public form's fields must pass — the SAME functions in the
   browser (to tell a person what to fix before they send) and on the server
   (where the answer actually counts, since the endpoint is public).

   Pre-launch audit, BUG-10: a name of spaces, a phone of "abc" and an email of
   "a@b" all used to get as far as the API. Plain module, no "server-only":
   both sides import it, and nothing here touches a secret.
--------------------------------------------------------------------------- */

/** Trimmed, with inner runs of whitespace collapsed — "  Ivan   P " → "Ivan P". */
export function cleanLine(v: unknown): string {
  return String(v ?? "").replace(/\s+/g, " ").trim();
}

/** Trimmed only — a message keeps its line breaks. */
export function cleanBlock(v: unknown): string {
  return String(v ?? "").trim();
}

/** local@domain.tld, with a letters-only top-level domain of two or more. */
export function isEmail(v: string): boolean {
  return v.length <= 200 && /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[A-Za-z]{2,}$/.test(v);
}

/** Digits with the usual separators (+ space ( ) - .), 7 to 15 digits in all
    — the international (E.164) range. "abc" and a bare "+380" both fail. */
export function isPhone(v: string): boolean {
  if (!/^[+\d\s().-]+$/.test(v)) return false;
  const digits = v.replace(/\D/g, "").length;
  return digits >= 7 && digits <= 15;
}

/** A name, company, city…: at least two real characters after cleaning. */
export function isWord(v: string, max: number): boolean {
  return v.length >= 2 && v.length <= max;
}

export const CONTACT_LIMITS = { name: 100, email: 200, subject: 200, message: 5000 } as const;
export const WHOLESALE_LIMITS = {
  name: 100,
  company: 150,
  email: 200,
  phone: 40,
  country: 80,
  city: 80,
  businessType: 60,
  message: 5000,
} as const;
