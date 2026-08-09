import "server-only";
import { products } from "@/lib/products";

/* ---------------------------------------------------------------------------
   Which picture of a product goes in an email, and at what size.

   THE FRAME IS SQUARE AND THE SOURCE MUST BE TOO. An email client that honours
   an <img> width attribute honours the height attribute with it, and there is
   no object-fit to save you: a 524×968 wind cover tile dropped into a 76×76
   frame is not cropped, it is crushed to 40% of its height. Nothing in the
   markup can prevent that. The only fix is a source that is already 1:1, which
   is what this module guarantees.

   IT DOES NOT USE tileImage. That was the bug. `describeLine` prefers the tile
   art because on the site it is the styled thumbnail, but tiles are tall bleed
   cut-outs built for the flagship grid — 588×795, 576×815, 524×968. Correct
   there, ruinous here. Email takes the variant photo when a finish is chosen
   and the catalogue square otherwise, both of which are shot 1:1 to the house
   standard.

   IT PREFERS A PREBUILT THUMBNAIL. public/email/products/*.jpg are 152×152
   (twice the 76px slot, so it stays sharp on a retina screen) flattened onto
   #F5F5F5, the background the photography is shot on. They are 2–3 KB against
   the heroes' 96–562 KB, which matters when four of them are in one message
   that someone may be opening on mobile data. Built by `npm run email:thumbs`
   — RE-RUN IT WHENEVER A PRODUCT PHOTO CHANGES.

   THE FALLBACK IS THE FULL-SIZE CATALOGUE SQUARE, used when a photo has been
   added and the thumbnails have not been rebuilt. Heavy, but square, so the
   worst case is a slow row and never a warped one.
--------------------------------------------------------------------------- */

/** The rendered slot, in CSS pixels. The source is twice this. */
export const EMAIL_THUMB_PX = 76;

/** Behind the image: the same grey the product photography sits on, so a
    transparent edge or a letterbox band is invisible rather than framed. */
export const EMAIL_THUMB_BG = "#F5F5F5";

/**
 * Every source `npm run email:thumbs` has produced a 152×152 version of.
 * Keep in step with SOURCES in scripts/email-thumbs.mjs — a name missing here
 * costs weight, never correctness.
 */
const PREBUILT = new Set([
  "/images/hmd-classic-1.jpg",
  "/images/hmd-acraft-hero.png",
  "/images/hmd-op-black.png",
  "/images/hmd-op-purple.png",
  "/images/killer-hero-v2.png",
  "/images/livanka-hero.png",
  "/images/ftp-hero-v2.png",
  "/images/windcover-detonator-1.jpg",
  "/images/windcover-kh-1.jpg",
]);

const thumbPath = (source: string) =>
  `/email/products/${source.split("/").pop()!.replace(/\.(png|jpe?g)$/i, ".jpg")}`;

/**
 * The path to use for one cart line, or null when the product is unknown.
 *
 * Relative — the caller makes it absolute, because only the caller knows
 * whether it is building a mail or a preview.
 */
export function emailProductImage(slug: string, variantName?: string | null): string | null {
  const product = products.find((p) => p.slug === slug);
  if (!product) return null;

  const variant = variantName
    ? product.variants?.find((v) => v.name === variantName)
    : undefined;

  // gridImage before image: both are the square catalogue shot, and gridImage
  // is the one the products grid already treats as the canonical thumbnail.
  const source = variant?.image || product.gridImage || product.image;
  if (!source) return null;

  return PREBUILT.has(source) ? thumbPath(source) : source;
}
