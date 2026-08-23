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

   THE WIND COVERS WERE THE ONE GAP, and it is closed. Both were created in the
   cabinet on 6 August 2026, in the "TCT Windcover" group that was already there
   waiting for them, at ₴850 with tax code 8 (Без ПДВ) like everything else.
   Every catalogue slug now has a code and no order is skipped for want of one.

   ONE PRODUCT PER COVER, NOT ONE PER CONFIGURATION. A wind cover with the timer
   sells for ₴1700, but that does not need a second good: buildGoods sends the
   price WITH each receipt line rather than reading the cabinet's, so the stored
   ₴850 is a reference figure and the line carries whatever was actually
   charged. It is the same reason HMD Classic fiscalises correctly on an order
   that added a lid.

   WHICH IS ALSO WHY A PRICE CHANGE DOES NOT INVALIDATE A CODE. The Classic was
   repriced from ₴1080 to ₴850 when the lid came out of the base product, and
   its code below is untouched and still right — it is the same good in the
   cabinet, sold for less. The kopiyka figures in the comments are the cabinet's
   reference prices as read on 2 August 2026, which is what makes them useful
   for re-verifying a mapping; they are NOT the shop's current prices and must
   not be corrected to match it.

   If a future product genuinely has no code, leave it out rather than guessing:
   the null is what stops an order being fiscalised against the wrong good, and
   a skipped receipt with a recorded reason is recoverable in a way a wrong one
   is not.
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
  "windcover-detonator": "1786029853412", // Windcover Detonator 85000 kop = ₴850
  "windcover-kh": "1786029854778", // Windcover KH        85000 kop = ₴850
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
