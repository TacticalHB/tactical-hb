/* ---------------------------------------------------------------------------
   Cyrillic → Latin, for the fields a foreign postal system has to be able to
   read.

   WHY THIS EXISTS. Ukrposhta's international API carries two names for every
   party: `name`, which is the real one and stays Cyrillic, and `latinName`,
   which goes on the CN23 customs declaration and is read by a sorting office
   in Berlin or Toronto. It rejects anything non-Latin outright — the sandbox
   refused our first parcel with "Client's latinName '<Cyrillic>' should contain
   only latin symbols" — and the shop's sender name comes from the Nova Poshta
   cabinet, which naturally holds it in Ukrainian.

   THE STANDARD IS THE OFFICIAL ONE: Cabinet of Ministers resolution No. 55 of
   27 January 2010, the table used for Ukrainian passports. That matters more
   than it looks. A name transliterated some other way is a name that does not
   match the sender's own documents, and a customs declaration that disagrees
   with a passport is a parcel with a question mark on it. Anyone checking this
   file against their passport should find the same spelling.

   THE TWO RULES THAT ARE EASY TO GET WRONG, both from the same resolution:

     • Є, Ї, Й, Ю, Я depend on POSITION. At the start of a word they are Ye,
       Yi, Y, Yu, Ya; anywhere else they are ie, i, i, iu, ia. Юрій is Yurii,
       not Yurij or Iurii.
     • ЗГ is Zgh, not Zh — otherwise Згоран and Жоран collide, which is the one
       ambiguity the resolution goes out of its way to name.

   Ь is dropped, per the same table. So is the apostrophe — but only where it
   is doing its Ukrainian job between two Cyrillic letters. Between Latin ones
   it belongs to the name, and O'Brien should not reach a customs label as
   OBrien.

   RUSSIAN LETTERS ARE HANDLED TOO (ы, э, ё, ъ). They are not in the Ukrainian
   alphabet and not in the resolution, but a name typed into a checkout form is
   whatever the customer typed, and leaving them in would fail the same API
   check this module exists to satisfy.
--------------------------------------------------------------------------- */

/** Position-dependent letters: [word-initial, elsewhere]. */
const POSITIONAL: Record<string, [string, string]> = {
  є: ["ye", "ie"],
  ї: ["yi", "i"],
  й: ["y", "i"],
  ю: ["yu", "iu"],
  я: ["ya", "ia"],
};

const SIMPLE: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "h", ґ: "g", д: "d", е: "e", ж: "zh",
  з: "z", и: "y", і: "i", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts",
  ч: "ch", ш: "sh", щ: "shch", ь: "",
  // Not Ukrainian, but a checkout form accepts whatever is typed.
  ы: "y", э: "e", ё: "e", ъ: "",
};

const APOSTROPHE = /['’ʼ]/;
const CYRILLIC = /\p{Script=Cyrillic}/u;

/**
 * True when the character at `i` starts a word.
 *
 * AN APOSTROPHE AND A SOFT SIGN DO NOT END ONE, which is the whole subtlety
 * here. Знам'янка is Znamianka in the resolution's own example, not Znamyanka
 * — the apostrophe separates sounds inside a word, so the Я after it is still
 * medial. Treating it as a boundary is the obvious implementation and it is
 * wrong for every name with an apostrophe in it. A hyphen genuinely does start
 * a new word (Кам'янець-Подільський) and is left as a boundary.
 */
function atWordStart(src: string, i: number): boolean {
  let j = i - 1;
  while (j >= 0 && (APOSTROPHE.test(src[j]) || src[j].toLowerCase() === "ь")) j--;
  if (j < 0) return true;
  return !/[\p{L}\p{N}]/u.test(src[j]);
}

/** Restore the source's capitalisation onto a multi-character replacement. */
function matchCase(replacement: string, wasUpper: boolean, nextIsUpper: boolean): string {
  if (!wasUpper || replacement === "") return replacement;
  // ЩЕРБА → SHCHERBA, but Щерба → Shcherba. The rest of the word decides.
  return nextIsUpper ? replacement.toUpperCase() : replacement[0].toUpperCase() + replacement.slice(1);
}

/**
 * Transliterate Ukrainian (and stray Russian) Cyrillic to Latin.
 *
 * Latin input passes through untouched, so this is safe to apply to a field
 * that is usually already Latin — a German recipient's name, for instance.
 */
export function transliterate(input: string): string {
  const src = input.normalize("NFC");
  let out = "";

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    const lower = ch.toLowerCase();
    const isUpper = ch !== lower && ch === ch.toUpperCase();
    // Whether the NEXT letter is also upper case, to tell ЩЕРБА from Щерба.
    const next = src[i + 1] ?? "";
    const nextIsUpper = next !== "" && next === next.toUpperCase() && next !== next.toLowerCase();

    /* The apostrophe is dropped only where it is doing its Ukrainian job —
       separating sounds between Cyrillic letters. Between Latin ones it is
       part of the name and stays, so O'Brien does not become OBrien on a
       customs label. */
    if (APOSTROPHE.test(ch)) {
      const prev = src[i - 1] ?? "";
      const nxt = src[i + 1] ?? "";
      if (CYRILLIC.test(prev) || CYRILLIC.test(nxt)) continue;
      out += "'";
      continue;
    }

    /* ЗГ before plain З, or Згоран comes out as the same word Жоран does. */
    if (lower === "з" && (src[i + 1] ?? "").toLowerCase() === "г") {
      out += matchCase("zgh", isUpper, nextIsUpper);
      i++; // the г is consumed
      continue;
    }

    const positional = POSITIONAL[lower];
    if (positional) {
      const [initial, medial] = positional;
      out += matchCase(atWordStart(src, i) ? initial : medial, isUpper, nextIsUpper);
      continue;
    }

    const simple = SIMPLE[lower];
    if (simple !== undefined) {
      out += matchCase(simple, isUpper, nextIsUpper);
      continue;
    }

    out += ch; // already Latin, a space, a hyphen, a digit
  }

  return out;
}

/**
 * A value safe to put in one of Ukrposhta's `latinName` fields.
 *
 * Transliterates, then removes anything still outside the Latin range. The
 * second step is not paranoia: a name can carry a diacritic (Müller), a
 * quotation mark or an emoji, none of which the API accepts, and all of which
 * would fail the same way the Cyrillic did — late, on a real parcel, with the
 * customer already charged.
 *
 * Diacritics are FOLDED rather than stripped, so Müller becomes Muller and not
 * Mller. NFD splits the base letter from its accent and the range filter then
 * drops the accent on its own.
 */
export function latinName(input: string): string {
  return transliterate(input)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 .,'\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
