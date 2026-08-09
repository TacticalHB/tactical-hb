import type { Product } from "./products";
import { LID_WEIGHT_G, type HmdMaterial } from "./hmd-options";
import { TIMER_WEIGHT_G, type WindcoverOptions } from "./windcover-options";

/* ---------------------------------------------------------------------------
   The field card — what a product actually IS, as rows.

   DERIVED, NOT AUTHORED. Every value here comes from the catalogue entry the
   shop already prices and ships from: the weight is the one the courier is
   quoted on, the dimensions are the carton Nova Poshta measures, the material
   is the spec row the tech table shows. Nothing is written for the card alone,
   so a card cannot drift away from the thing it describes.

   THE WEIGHT IS LIVE. An HMD with a lid weighs 30 g more and a wind cover with
   the timer 70 g more, and those are the figures the basket ships on — so the
   card follows the selector rather than quoting the bare product and leaving
   the customer to do the arithmetic.

   ROWS THAT HAVE NO DATA DO NOT APPEAR. Only one product carries a style code;
   inventing codes for the rest to square up the table would be inventing SKUs,
   and the empty row is the honest answer.
--------------------------------------------------------------------------- */

export type FieldRow = { key: string; label: string; value: string };

export type FieldCardInput = {
  product: Product;
  uk: boolean;
  material?: HmdMaterial;
  windcover?: WindcoverOptions;
};

/** Packed weight in grams for the CURRENT selection, add-ons included. */
export function selectedWeightG(
  product: Product,
  material?: HmdMaterial,
  windcover?: WindcoverOptions
): number {
  let g = product.weightG;
  if (product.category === "hmd" && material?.lid) g += LID_WEIGHT_G;
  if (product.category === "windcover" && windcover?.timer) g += TIMER_WEIGHT_G;
  return g;
}

/** The add-ons currently chosen, named. Empty when the product takes none. */
export function selectedConfig(
  product: Product,
  uk: boolean,
  material?: HmdMaterial,
  windcover?: WindcoverOptions
): string[] {
  const out: string[] = [];
  if (product.category === "hmd") {
    if (material?.lid) out.push(uk ? "з кришкою" : "with lid");
    if (material?.rubber) out.push(uk ? "з гумкою" : "with rubber");
  }
  if (product.category === "windcover" && windcover?.timer) {
    out.push(uk ? "з таймером" : "with timer");
  }
  return out;
}

/* What pairs with what. Stated as categories rather than named products
   because the true statement is "any bowl fits any device" — listing three
   slugs would go stale the moment a fourth is added, and would read as a
   restriction rather than a compatibility note. */
const PAIRS: Record<Product["category"], Product["category"][]> = {
  bowl: ["hmd", "windcover"],
  hmd: ["bowl", "windcover"],
  windcover: ["hmd", "bowl"],
  accessory: [],
};

const CATEGORY_NAME: Record<Product["category"], { en: string; uk: string }> = {
  bowl: { en: "bowls", uk: "чаші" },
  hmd: { en: "heat devices", uk: "пристрої нагріву" },
  windcover: { en: "wind covers", uk: "ковпаки" },
  accessory: { en: "accessories", uk: "аксесуари" },
};

export function buildFieldCard({ product, uk, material, windcover }: FieldCardInput): FieldRow[] {
  const rows: FieldRow[] = [];
  const g = uk ? "г" : "g";

  rows.push({
    key: "weight",
    label: uk ? "Вага" : "Weight",
    value: `${selectedWeightG(product, material, windcover)} ${g}`,
  });

  rows.push({
    key: "dimensions",
    label: uk ? "Розміри" : "Dimensions",
    value: `${product.dims.l} × ${product.dims.w} × ${product.dims.h} ${uk ? "мм" : "mm"}`,
  });

  /* Material and finish are lifted from the product's own spec table rather
     than restated, so correcting one corrects both — which is exactly what the
     laser-to-UV change on the camo cover needed. */
  for (const wanted of ["Material", "Finish"]) {
    const spec = product.pdp?.specs?.find((s) => s.labelEn === wanted);
    if (spec) {
      rows.push({
        key: wanted.toLowerCase(),
        label: uk ? spec.labelUk : spec.labelEn,
        value: uk ? spec.valueUk : spec.valueEn,
      });
    }
  }

  if (product.pdp?.styleCode) {
    rows.push({
      key: "style",
      label: uk ? "Артикул" : "Style",
      value: product.pdp.styleCode,
    });
  }

  const config = selectedConfig(product, uk, material, windcover);
  if (config.length > 0) {
    rows.push({
      key: "configuration",
      label: uk ? "Конфігурація" : "Configuration",
      value: config.join(uk ? ", " : ", "),
    });
  }

  const pairs = PAIRS[product.category];
  if (pairs.length > 0) {
    rows.push({
      key: "compatible",
      label: uk ? "Сумісність" : "Compatible with",
      value: pairs.map((c) => (uk ? CATEGORY_NAME[c].uk : CATEGORY_NAME[c].en)).join(uk ? " · " : " · "),
    });
  }

  return rows;
}
