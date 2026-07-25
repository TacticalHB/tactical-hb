/* ---------------------------------------------------------------------------
   Latin → Cyrillic for Nova Poshta recipient names.

   WHY THIS EXISTS. Nova Poshta rejects a recipient whose name contains Latin
   characters ("FirstName has invalid characters"), so an order placed on the
   English site — where a customer naturally types "Andrii Shevchenko" — could
   not have a waybill created for it at all and fell back to being made by hand.

   WHY IT IS A FALLBACK, NOT A FILTER. A name already in Cyrillic is passed
   through untouched and never round-tripped through this table; only a name the
   API has actually refused is converted. Transliteration is a guess at spelling
   (Ukrainian has several conventions, and "x" could be «кс» or «х»), so it is
   used where the alternative is no waybill — not in place of what the customer
   wrote.

   The parcel's real identifier is the phone number: Nova Poshta sends the
   pickup code by SMS, and for a poshtomat the code is the only thing needed. The
   name is a label on the box, which is why an approximate spelling is an
   acceptable trade for the order shipping automatically.

   Direction is Latin → Cyrillic only. Mapping the other way is not needed and
   would be lossy in a way that matters more (ID documents).
--------------------------------------------------------------------------- */

/**
 * Word-ENDINGS, applied before anything else.
 *
 * These carry most of the risk in Ukrainian given names: "Andrii" ends in «ій»,
 * not «іі», and "Yulia"/"Maria" end in «ія», not «я». Treating a trailing "ia"
 * as the single letter «я» turns Yulia into Юля — a different name — so the
 * ending is matched first and the rest of the word processed normally.
 */
const ENDINGS: [RegExp, string][] = [
  [/ii$/, "ій"],
  [/iy$/, "ій"],
  [/yi$/, "ій"],
  [/ia$/, "ія"],
  [/iia$/, "ія"],
  [/ie$/, "іє"],
];

/** Multi-character sequences — order matters, longest match wins. */
const DIGRAPHS: [string, string][] = [
  ["shch", "щ"],
  ["sch", "щ"],
  ["zh", "ж"],
  ["kh", "х"],
  ["ch", "ч"],
  ["sh", "ш"],
  ["ts", "ц"],
  ["yi", "ї"],
  ["ye", "є"],
  ["yu", "ю"],
  ["ya", "я"],
];

const SINGLES: Record<string, string> = {
  a: "а", b: "б", c: "к", d: "д", e: "е", f: "ф", g: "г", h: "г",
  i: "і", j: "й", k: "к", l: "л", m: "м", n: "н", o: "о", p: "п",
  q: "к", r: "р", s: "с", t: "т", u: "у", v: "в", w: "в", x: "кс",
  y: "и", z: "з",
};

/** True when the text contains a Latin letter Nova Poshta would refuse. */
export function hasLatin(s: string): boolean {
  return /[A-Za-z]/.test(s ?? "");
}

/** True when the text is already Cyrillic (nothing to do). */
export function isCyrillic(s: string): boolean {
  return /[Ѐ-ӿ]/.test(s ?? "") && !hasLatin(s ?? "");
}

/**
 * Transliterate one word, preserving whether it was capitalised.
 * Apostrophes and hyphens inside names (O'Brien, Anna-Maria) are kept.
 */
function word(w: string): string {
  let lower = w.toLowerCase();
  let suffix = "";

  // Peel off a known ending first, longest match wins.
  for (const [re, to] of [...ENDINGS].sort((a, b) => b[0].source.length - a[0].source.length)) {
    if (re.test(lower)) {
      suffix = to;
      lower = lower.replace(re, "");
      break;
    }
  }

  let out = "";
  let i = 0;
  while (i < lower.length) {
    const rest = lower.slice(i);
    const digraph = DIGRAPHS.find(([from]) => rest.startsWith(from));
    if (digraph) {
      out += digraph[1];
      i += digraph[0].length;
      continue;
    }
    const ch = lower[i];
    out += SINGLES[ch] ?? ch;
    i += 1;
  }
  out += suffix;

  // Restore a leading capital when the source had one.
  if (/^[A-ZА-ЯЇІЄҐ]/.test(w)) {
    out = out.charAt(0).toUpperCase() + out.slice(1);
  }
  return out;
}

/**
 * Latin → Cyrillic, leaving anything already Cyrillic alone.
 * Word boundaries (spaces, hyphens, apostrophes) are preserved.
 */
export function toCyrillic(s: string): string {
  if (!s) return "";
  if (!hasLatin(s)) return s;
  return s.split(/(\s+|-|')/).map((part) => (hasLatin(part) ? word(part) : part)).join("");
}
