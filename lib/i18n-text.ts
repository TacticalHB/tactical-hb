/* ---------------------------------------------------------------------------
   Inline copy, in three languages.

   THE SECOND TRANSLATION SYSTEM, AND THE HONEST NAME FOR IT. messages/*.json
   is the first: page copy, marketing, anything a translator would want to see
   in one place. This is for the strings that live next to the component that
   shows them — a button label, a validation message, the word above a field —
   where the round trip through a message file costs more than it returns.

   IT USED TO BE A TERNARY. `uk ? "Кошик" : "Bag"` reads fine and scales to
   exactly two languages; at three it becomes a nested conditional in nine
   hundred places, and the third language is the one that gets forgotten in the
   nesting. This is the same idea with a name and a shape.

   JA IS OPTIONAL, DELIBERATELY. A record without it falls back to English, so
   this file can be adopted a component at a time without any point at which
   the site is half-broken — an untranslated label reads in English rather than
   printing a key or, worse, appearing in Ukrainian on a Japanese page.

   ENGLISH IS THE FLOOR EVERYWHERE, matching i18n/request.ts, which merges
   ja over en for the message files. One fallback rule for both systems.
--------------------------------------------------------------------------- */

/** One string in every language it has been written in. */
export type Text = {
  en: string;
  uk: string;
  /** Absent until translated — falls back to English, never to Ukrainian. */
  ja?: string;
};

/** The string for this storefront. */
export function t(locale: string, text: Text): string {
  if (locale === "uk") return text.uk;
  if (locale === "ja") return text.ja ?? text.en;
  return text.en;
}

/**
 * Resolve a whole record of strings at once.
 *
 * Components here build one `L` object of labels near the top and read from it
 * throughout, which is a good pattern and the reason this exists: without it
 * every line of that object would repeat `t(locale, …)`.
 *
 *   const L = pick(locale, {
 *     bag:  { en: "Bag", uk: "Кошик", ja: "バッグ" },
 *     total:{ en: "Total", uk: "Разом", ja: "合計" },
 *   });
 *   // L.bag, L.total
 */
export function pick<K extends string>(
  locale: string,
  record: Record<K, Text>
): Record<K, string> {
  const out = {} as Record<K, string>;
  for (const key of Object.keys(record) as K[]) {
    out[key] = t(locale, record[key]);
  }
  return out;
}
