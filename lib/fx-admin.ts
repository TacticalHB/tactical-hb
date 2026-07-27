import "server-only";
import { nbuDateToIso, type FxRate, type FxRates } from "@/lib/fx-display";

/* ---------------------------------------------------------------------------
   Live exchange rates from the National Bank of Ukraine (plan §7, Phase F).

   WHY NBU AND NOT A MARKET FEED. It is the rate the accountant already works
   in, it is free and unauthenticated (no key to leak, no quota to exhaust),
   and it is the official reference for a Ukrainian company. A market mid-rate
   would be a more exciting number and a less useful one.

   WHY A MODULE-LEVEL CACHE INSTEAD OF fetch's revalidate. /admin/finance is
   `dynamic = "force-dynamic"`, and Next's own docs are explicit that this
   sets every fetch on the page to `{ cache: 'no-store', next: { revalidate:
   0 } }` — so a `next: { revalidate: 3600 }` here would be silently ignored
   and the bank would be called on every page load. The other lever,
   `fetchCache = 'default-cache'`, is worse: it would apply to the Supabase
   reads on the same page too, and a cached finance query is a page that lies
   about the money. So the cache is plain and explicit, right here.

   NBU publishes once a business day, so an hour is generous. On serverless
   each instance keeps its own copy; the worst case is a handful of small GETs
   an hour, which is well inside what a public reference service expects.

   NOTHING THIS RETURNS IS EVER WRITTEN ANYWHERE. There is no rates table and
   no history — the plan asked for a display, and a stored rate would be the
   first step towards something repricing itself off it.
--------------------------------------------------------------------------- */

const NBU = "https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange";
const TTL_MS = 60 * 60 * 1000;
const TIMEOUT_MS = 4000;

let cache: { at: number; rates: FxRates } | null = null;

/**
 * Bound how long the page waits WITHOUT aborting the request.
 *
 * Passing an AbortSignal to fetch opts it out of Next's memoisation (their
 * docs say so outright), and aborting would also throw away a response that
 * is merely late. Racing a timer instead means a slow first call renders
 * "unavailable" once and still warms the cache for the next load.
 */
function withDeadline<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    p,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

async function fetchOne(code: "EUR" | "USD"): Promise<FxRate | null> {
  try {
    const res = await fetch(`${NBU}?valcode=${code}&json`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      console.error("[fx] NBU responded", res.status, "for", code);
      return null;
    }

    const body: unknown = await res.json();
    if (!Array.isArray(body) || body.length === 0) return null;

    const row = body[0] as Record<string, unknown>;
    const rate = Number(row.rate);
    if (!Number.isFinite(rate) || rate <= 0) return null;

    const asOf = nbuDateToIso(String(row.exchangedate ?? ""));
    if (!asOf) return null;

    return { code, rateUah: Math.round(rate * 10000) / 10000, asOf };
  } catch (e) {
    console.error("[fx] NBU read threw for", code, e);
    return null;
  }
}

/**
 * Today's official rates, or nulls.
 *
 * Never throws and never blocks for long: the finance page must render its
 * own numbers whether or not a central bank is reachable, and an FX panel is
 * the least important thing on it.
 */
export async function fetchFxRates(): Promise<FxRates> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.rates;

  const settled = await withDeadline(
    Promise.all([fetchOne("EUR"), fetchOne("USD")]),
    TIMEOUT_MS
  );

  if (settled === null) {
    // Timed out. Serve the stale copy if there is one — an hour-old official
    // rate is far more useful than a dash, as long as the page says its age.
    return cache?.rates ?? { eur: null, usd: null };
  }

  const [eur, usd] = settled;
  const rates: FxRates = { eur, usd };

  // Only cache a useful answer; caching two nulls would hold the failure for
  // an hour and hide a bank that came back a minute later.
  if (eur !== null || usd !== null) cache = { at: now, rates };

  return rates;
}
