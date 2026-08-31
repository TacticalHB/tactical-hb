import { isPurchasable, type Product } from "./products";
import { t, type Text } from "@/lib/i18n-text";
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
  /* THE LOCALE, not a `uk` boolean. A boolean can only answer "Ukrainian or
     not", which was true of this shop for exactly as long as it had two
     languages. */
  locale: string;
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
  locale: string,
  material?: HmdMaterial,
  windcover?: WindcoverOptions
): string[] {
  const out: string[] = [];
  if (product.category === "hmd") {
    if (material?.lid) out.push(t(locale, { uk: "з Lid 9E418", en: "with Lid 9E418", ja: "Lid 9E418 付き", ar: "مع Lid 9E418" }));
    if (material?.rubber) out.push(t(locale, { uk: "з FEAR 9E418", en: "with FEAR 9E418", ja: "FEAR 9E418 付き", ar: "مع FEAR 9E418" }));
  }
  if (product.category === "windcover" && windcover?.timer) {
    out.push(t(locale, { uk: "з таймером", en: "with timer", ja: "タイマー付き", ar: "مع المؤقّت" }));
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
  /* Nothing is claimed to pair with it. What it fits is part of the withheld
     file, and a compatibility note would be the first invented fact. */
  hookah: [],
};

const CATEGORY_NAME: Record<Product["category"], Text> = {
  bowl: { en: "bowls", uk: "чаші", ja: "ボウル", ar: "الرؤوس" },
  hmd: { en: "heat devices", uk: "пристрої нагріву", ja: "ヒートデバイス", ar: "أجهزة الحرارة" },
  windcover: { en: "wind covers", uk: "ковпаки", ja: "ウインドカバー", ar: "أغطية الرياح" },
  accessory: { en: "accessories", uk: "аксесуари", ja: "アクセサリー", ar: "الإكسسوارات" },
  hookah: { en: "hookahs", uk: "кальяни", ja: "シーシャ", ar: "الشيشة" },
};

export function buildFieldCard({ product, locale, material, windcover }: FieldCardInput): FieldRow[] {
  /* A WITHHELD LISTING HAS NO CARD. Its weight and carton are zero because
     nobody has measured them, and this table would print "0 g" and
     "0 x 0 x 0 mm" — two invented facts, stated with the authority of a spec
     sheet, on the one page whose whole job is to say the file is closed.
     Nothing is the honest row count here. */
  if (!isPurchasable(product)) return [];

  const rows: FieldRow[] = [];
  const g = t(locale, { uk: "г", en: "g", ja: "g", ar: "غ" });

  rows.push({
    key: "weight",
    label: t(locale, { uk: "Вага", en: "Weight", ja: "重量", ar: "الوزن" }),
    value: `${selectedWeightG(product, material, windcover)} ${g}`,
  });

  rows.push({
    key: "dimensions",
    label: t(locale, { uk: "Розміри", en: "Dimensions", ja: "サイズ", ar: "الأبعاد" }),
    value: `${product.dims.l} × ${product.dims.w} × ${product.dims.h} ${t(locale, { uk: "мм", en: "mm", ja: "mm", ar: "مم" })}`,
  });

  /* Material and finish are lifted from the product's own spec table rather
     than restated, so correcting one corrects both — which is exactly what the
     laser-to-UV change on the camo cover needed. */
  for (const wanted of ["Material", "Finish"]) {
    const spec = product.pdp?.specs?.find((s) => s.labelEn === wanted);
    if (spec) {
      rows.push({
        key: wanted.toLowerCase(),
        label: t(locale, { uk: spec.labelUk, en: spec.labelEn, ja: spec.labelJa, ar: spec.labelAr }),
        value: t(locale, { uk: spec.valueUk, en: spec.valueEn, ja: spec.valueJa, ar: spec.valueAr }),
      });
    }
  }

  if (product.pdp?.styleCode) {
    rows.push({
      key: "style",
      label: t(locale, { uk: "Артикул", en: "Style", ja: "品番", ar: "الطراز" }),
      value: product.pdp.styleCode,
    });
  }

  const config = selectedConfig(product, locale, material, windcover);
  if (config.length > 0) {
    rows.push({
      key: "configuration",
      label: t(locale, { uk: "Конфігурація", en: "Configuration", ja: "構成", ar: "التكوين" }),
      value: config.join(", "),
    });
  }

  const pairs = PAIRS[product.category];
  if (pairs.length > 0) {
    rows.push({
      key: "compatible",
      label: t(locale, { uk: "Сумісність", en: "Compatible with", ja: "組み合わせ", ar: "متوافق مع" }),
      value: pairs.map((c) => t(locale, CATEGORY_NAME[c])).join(" · "),
    });
  }

  return rows;
}
