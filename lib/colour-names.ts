import { t } from "@/lib/i18n-text";

/* A product variant's colour, in the page's language. The variant NAME
   ("Black", "Purple") is a stable key written into cart lines and orders, so
   it is never translated in place — only its label is, here, for every place
   that shows or announces one (the product page, the grid swatches, the setup
   builder). Unknown names fall back to themselves. */
const NAMES: Record<string, { uk: string; en: string; ja: string; ar: string }> = {
  Black: { uk: "Чорний", en: "Black", ja: "ブラック", ar: "أسود" },
  Purple: { uk: "Фіолетовий", en: "Purple", ja: "パープル", ar: "بنفسجي" },
};

export function colourName(name: string, locale: string): string {
  return NAMES[name] ? t(locale, NAMES[name]) : name;
}
