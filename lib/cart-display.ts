import { products, type Product } from "@/lib/products";
import type { CartLine } from "@/components/CartContext";

/* ---------------------------------------------------------------------------
   How a cart line is described to the shopper.

   Colour and material aren't first-class fields on Product — colour comes from
   the chosen variant (or the PDP's "colour shown"), material from the PDP spec
   table. Not every product carries either, so both are nullable and callers
   must render them conditionally rather than printing "undefined".
--------------------------------------------------------------------------- */

export type LineDisplay = {
  product: Product;
  name: string;
  image: string;
  colour: string | null;
  material: string | null;
  /** "With Lid + With Rubber", or null when the line is the base config. */
  addons: string | null;
};

const VARIANT_UK: Record<string, string> = { Black: "Чорний", Purple: "Фіолетовий" };

/**
 * How a line's chosen add-ons are named — "With Lid + With Timer", or null for
 * a base configuration.
 *
 * SPLIT OUT SO THE CROSS-SELL CARD CAN SAY THE SAME WORDS. That card offers
 * the wind cover with its timer already on, which is a €45 price against a
 * €23 catalogue product; it needs to name the configuration, and it needs to
 * name it exactly as the cart line will a moment later. Two hand-written
 * copies of "With Timer" is how the bag ends up disagreeing with the card that
 * filled it.
 */
export function describeAddons(
  options: CartLine["options"],
  locale: string
): string | null {
  const uk = locale === "uk";
  const addons: string[] = [];
  if (options?.lid) addons.push(uk ? "З кришкою" : "With Lid");
  if (options?.rubber) addons.push(uk ? "З гумкою" : "With Rubber");
  if (options?.timer) addons.push(uk ? "З таймером" : "With Timer");
  return addons.length ? addons.join(" + ") : null;
}

export function describeLine(line: CartLine, locale: string): LineDisplay | null {
  const product = products.find((p) => p.slug === line.slug);
  if (!product) return null;

  const uk = locale === "uk";
  const name = uk ? product.nameUk : product.nameEn;

  const chosen = line.options?.variant
    ? product.variants?.find((v) => v.name === line.options!.variant)
    : undefined;

  // Show the picked colour's photo, not the default one.
  const image = chosen?.image || product.tileImage || product.gridImage || product.image;

  const colourShown = uk ? product.pdp?.colourShownUk : product.pdp?.colourShownEn;
  const colour = chosen
    ? uk
      ? VARIANT_UK[chosen.name] ?? chosen.name
      : chosen.name
    : colourShown ?? null;

  const materialSpec = product.pdp?.specs?.find((s) => s.labelEn === "Material");
  const material = materialSpec ? (uk ? materialSpec.valueUk : materialSpec.valueEn) : null;

  const addons = describeAddons(line.options, locale);

  return {
    product,
    name,
    image,
    colour,
    material,
    addons,
  };
}
