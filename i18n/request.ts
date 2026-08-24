import { getRequestConfig } from "next-intl/server";
import { isAppLocale, routing } from "./routing";

type Messages = Record<string, unknown>;

/**
 * Deep merge, with `over` winning wherever it has a value.
 *
 * ENGLISH IS THE FLOOR, NOT UKRAINIAN. A key missing from a translation has to
 * resolve to something a visitor can read, and next-intl's own fallback is the
 * key path — "checkout.delivery.method" printed on the page. Ukrainian would be
 * worse than either: a Japanese visitor who meets a gap should meet English,
 * which is the language the whole catalogue is authored in and the one a
 * non-Ukrainian speaker has some chance with.
 *
 * This also makes a partial translation SAFE TO SHIP. A key that has not been
 * written yet simply falls through, so ja.json can grow without ever leaving a
 * raw path on the page.
 */
function mergeMessages(base: Messages, over: Messages): Messages {
  const out: Messages = { ...base };
  for (const [k, v] of Object.entries(over)) {
    const b = out[k];
    if (v && b && typeof v === "object" && typeof b === "object" && !Array.isArray(v) && !Array.isArray(b)) {
      out[k] = mergeMessages(b as Messages, v as Messages);
    } else if (v !== undefined && v !== null && v !== "") {
      out[k] = v;
    }
  }
  return out;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = isAppLocale(requested) ? requested : routing.defaultLocale;

  const english = (await import("../messages/en.json")).default as Messages;
  if (locale === "en") return { locale, messages: english };

  const own = (await import(`../messages/${locale}.json`)).default as Messages;
  return { locale, messages: mergeMessages(english, own) };
});
