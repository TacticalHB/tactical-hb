import "server-only";

/* ---------------------------------------------------------------------------
   Site SKU → Checkbox product code.

   Read out of Mario's live Checkbox cabinet on 2 August 2026 and matched to the
   catalogue BY PRICE, not by name — the two naming schemes disagree ("Tactical
   Killer" against "KILLER BOWL", "Tactical 0.66 F.CK THE PHUNNEL" against
   "FTP BOWL") while every price agrees exactly at ×100, which is the stronger
   signal and also re-confirms that Checkbox money is kopiyky.

   VARIANTS ARE SEPARATE PRODUCTS THERE. The site sells one hmd-tct-op with a
   colour choice; Checkbox holds two goods at two prices (Black ₴1150, Purple
   ₴1200), so the mapping is keyed by variant where one exists.

   ONE GAP, AND IT IS DELIBERATE: TCT Windcover «Bomb Cap» (₴850) has no product
   in Checkbox. Rather than invent a code or quietly fold it into another line,
   an order containing it is not auto-fiscalised — it is left for a human with
   the reason recorded. Add the product in the Checkbox cabinet and put its code
   here to close that hole.
--------------------------------------------------------------------------- */

/** Checkbox codes, verified against the cabinet. Keyed `slug` or `slug:variant`. */
const CODES: Record<string, string> = {
  "hmd-tct-classic": "1785671257433", // HMD Classic        108000 kop = ₴1080
  "hmd-a-craft": "1785679930517", // HMD A.Craft         90000 kop = ₴900
  "hmd-tct-op:Black": "1785680156699", // HMD TCT OP Black   115000 kop = ₴1150
  "hmd-tct-op:Purple": "1785680464177", // HMD TCT OP Purple  120000 kop = ₴1200
  "bowl-killer": "1785681730534", // KILLER BOWL         42000 kop = ₴420
  "bowl-livanka": "1785681777131", // Tactical Livanka    37000 kop = ₴370
  "bowl-phunnel": "1785681837923", // FTP BOWL            50000 kop = ₴500
  // "windcover-bomb-cap": MISSING IN CHECKBOX — see the note above.
};

/** The Checkbox code for a sold line, or null when the product is not in the till. */
export function checkboxCode(slug: string, variant?: string | null): string | null {
  if (variant && CODES[`${slug}:${variant}`]) return CODES[`${slug}:${variant}`];
  return CODES[slug] ?? null;
}

/** Slugs with no Checkbox product — used to explain a skipped fiscalisation. */
export function unmappedSlugs(lines: { slug: string; variant?: string | null }[]): string[] {
  return [...new Set(lines.filter((l) => !checkboxCode(l.slug, l.variant)).map((l) => l.slug))];
}
