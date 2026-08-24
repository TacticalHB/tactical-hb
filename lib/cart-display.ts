import { products, type Product } from "@/lib/products";
import { t } from "@/lib/i18n-text";
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
  /** "With Lid + With FEAR 9E418", or null when the line is the base config. */
  addons: string | null;
};

const VARIANT_UK: Record<string, string> = { Black: "Чорний", Purple: "Фіолетовий" };

/**
 * How a line's chosen add-ons are named — "With Lid + With Timer", or null for
 * a base configuration.
 *
 * THE NAMES LIVE HERE AND NOWHERE ELSE for the bag, the checkout and the
 * transactional emails: all three reach this through describeLine. The account
 * order-detail page keeps its own copy because it renders from stored order
 * rows rather than cart lines — if a name changes, it changes in both.
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
  const addons: string[] = [];
  /* FEAR 9E418 is a product name and stays Latin in every language — only the
     word around it changes. */
  if (options?.lid) addons.push(t(locale, { uk: "З кришкою", en: "With Lid", ja: "リッド付き" }));
  if (options?.rubber) addons.push(t(locale, { uk: "З FEAR 9E418", en: "With FEAR 9E418", ja: "FEAR 9E418 付き" }));
  if (options?.timer) addons.push(t(locale, { uk: "З таймером", en: "With Timer", ja: "タイマー付き" }));
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

  /* No Japanese colour-shown field on the catalogue yet, so ja reads the
     English one — a colour name, and the honest fallback. */
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
