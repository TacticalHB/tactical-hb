import type { Money } from "@/lib/currency";
import { products, isPurchasable } from "@/lib/products";
import { TIMER_PRICE } from "@/lib/windcover-options";

/* ---------------------------------------------------------------------------
   The retail prices a wholesale partner refers to (Mario, 14 Oct 2026: "a
   table with the retail prices on our website, so clients have something to
   refer to").

   READ FROM THE CATALOGUE THE SHOP SELLS FROM, never restated: the figure in
   this table and the figure on the product page are the same number by
   construction, so a repricing cannot leave the partner's reference behind.

   One row per thing a customer can buy at a price of its own: a colour that
   is priced apart (HMD TCT OP Purple) is its own row, and the wind-cover timer
   — an add-on, not a product — is listed as what it adds.

   `key` matches the portal's line sku where there is one, so a caller can put
   the partner's own trade price beside it.
--------------------------------------------------------------------------- */

export type RetailRow = {
  key: string;
  category: string;
  /** Product name — Latin in every language, as on the storefront. */
  name: string;
  /** The colour, when this row is one colour of a product. */
  colour: string | null;
  /** True for the timer: a price that is added to a wind cover. */
  addon?: "timer";
  price: Money;
};

/* Same sku shape as lib/wholesale-portal's lineSku — restated rather than
   imported so this file stays importable from anywhere (that one is
   server-only). The test in test/retail-reference.test.ts holds them equal. */
export function retailKey(slug: string, variant?: string | null): string {
  return variant ? `${slug}__${variant.toLowerCase()}` : slug;
}

const ORDER = ["hookah", "bowl", "hmd", "windcover", "mouthpiece", "accessory"];

export function retailRows(): RetailRow[] {
  const rows: RetailRow[] = [];
  const sorted = products
    .filter(isPurchasable)
    .slice()
    .sort((a, b) => ORDER.indexOf(a.category) - ORDER.indexOf(b.category));
  for (const p of sorted) {
    if (p.variants?.length) {
      for (const v of p.variants) {
        rows.push({
          key: retailKey(p.slug, v.name),
          category: p.category,
          name: p.nameEn,
          colour: v.name,
          price: { eur: v.price ?? p.price, uah: v.priceUah ?? p.priceUah },
        });
      }
    } else {
      rows.push({ key: p.slug, category: p.category, name: p.nameEn, colour: null, price: { eur: p.price, uah: p.priceUah } });
    }
  }
  // The timer goes straight after the last wind cover, which is what it is added to.
  const lastCover = rows.map((r) => r.category).lastIndexOf("windcover");
  if (lastCover >= 0) {
    rows.splice(lastCover + 1, 0, { key: "addon:timer", category: "windcover", name: "Timer", colour: null, addon: "timer", price: TIMER_PRICE });
  }
  return rows;
}
