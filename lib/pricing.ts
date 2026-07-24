import { products } from "@/lib/products";
import { materialUpcharge, materialWeightG } from "@/lib/hmd-options";
import { addMoney, money, scaleMoney, type Money } from "@/lib/currency";
import type { Dims } from "@/lib/parcel";

/* ---------------------------------------------------------------------------
   Authoritative cart pricing, computed on the server from the catalogue.

   The browser says WHAT is being bought — slug, quantity, options. It never
   says how much that costs. Every amount that matters (a voucher's minimum
   order, and shortly the sum sent to Monobank) is derived here, so a caller
   editing the price in devtools changes nothing.

   Mirrors linePrice() in CartContext, which exists for instant display. This
   one is the source of truth; that one is a preview.
--------------------------------------------------------------------------- */

export type PricedLineInput = {
  slug: string;
  qty: number;
  options?: { variant?: string; lid?: boolean; rubber?: boolean };
};

export type PricedLine = {
  slug: string;
  qty: number;
  name: string;
  unit: Money;
  total: Money;
  /** Per-unit packed weight in grams, add-ons included — drives shipping. */
  weightG: number;
  dims: Dims;
};

export type PricedCart = { lines: PricedLine[]; subtotal: Money };

/** Quantities a real order can contain. Anything else is a mistake or an attack. */
const MAX_QTY = 99;
const MAX_LINES = 50;

export function priceCart(input: unknown, locale = "en"): PricedCart {
  const uk = locale === "uk";
  const raw: PricedLineInput[] = Array.isArray(input) ? (input as PricedLineInput[]).slice(0, MAX_LINES) : [];

  const lines: PricedLine[] = [];
  for (const l of raw) {
    const product = products.find((p) => p.slug === l?.slug);
    // Unknown slug: drop the line rather than price it at zero.
    if (!product) continue;

    const qty = Math.floor(Number(l.qty));
    if (!Number.isFinite(qty) || qty < 1) continue;
    const safeQty = Math.min(qty, MAX_QTY);

    const variant = l.options?.variant
      ? product.variants?.find((v) => v.name === l.options!.variant)
      : undefined;

    let unit = money(variant?.price ?? product.price, variant?.priceUah ?? product.priceUah);
    let weightG = product.weightG;
    // Add-ons exist only on heat devices; ignore stray flags on anything else.
    if (product.category === "hmd") {
      const material = { lid: !!l.options?.lid, rubber: !!l.options?.rubber };
      unit = addMoney(unit, materialUpcharge(material));
      weightG += materialWeightG(material);
    }

    lines.push({
      slug: product.slug,
      qty: safeQty,
      name: uk ? product.nameUk : product.nameEn,
      unit,
      total: scaleMoney(unit, safeQty),
      weightG,
      dims: product.dims,
    });
  }

  const subtotal = lines.reduce<Money>((s, l) => addMoney(s, l.total), money(0, 0));
  return { lines, subtotal };
}
