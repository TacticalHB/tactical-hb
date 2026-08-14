import "server-only";
import type { Dims } from "@/lib/parcel";

/* ---------------------------------------------------------------------------
   Ukrposhta eCom — international rates, Ukraine to the world.

   THE THIRD CARRIER API IN THIS CODEBASE, and the second that can price a
   cross-border parcel. lib/nova-poshta.ts is domestic (api.novaposhta.ua),
   lib/novapost.ts is Nova Post cross-border (api.novapost.com), and this is
   Ukrposhta. None of them replaces another: as of this integration the
   international checkout asks Nova Post AND Ukrposhta together and lets the
   customer choose, which is Mario's call of 11 August 2026.

   DOMESTIC IS DELIBERATELY NOT IMPLEMENTED HERE. Nova Poshta already does
   branches, lockers, courier, waybills and tracking inside Ukraine, and
   duplicating that for Ukrposhta is weeks of work for customers who already
   have a good option. The endpoint exists (POST /domestic/delivery-price) and
   is a separate schema — addressFrom/addressTo/deliveryType/type rather than a
   country code — so adding it later is additive, not a rewrite.

   ── AUTH ──────────────────────────────────────────────────────────────────
   Bearer in the header. 179 of the 180 endpoints in the spec also want the
   counterparty `?token=`, but delivery-price is one of the fourteen that do
   NOT — verified against the published OpenAPI document rather than assumed,
   because sending a token where none is expected is how a working request
   starts returning 403. The token is still read here for the shipment-creation
   endpoints that will need it.

   ── SANDBOX IS THE DEFAULT AND MUST STAY THAT WAY ─────────────────────────
   `production` has to be spelled out in UKRPOSHTA_API_MODE. Anything else,
   including the variable being absent, is sandbox. These credentials book real
   parcels and move real money; a missing env var must never be the thing that
   decides which.

   ── THE CREDENTIALS ARE NAMED BY ENVIRONMENT, AND THAT IS THE SAFETY ──────
   Not one UKRPOSHTA_BEARER_ECOM whose value you swap when you go live, but
   UKRPOSHTA_SANDBOX_BEARER_ECOM and UKRPOSHTA_PRODUCTION_BEARER_ECOM side by
   side, with the mode choosing between them.

   The single-variable version looked tidier and was a trap: it makes the
   correct value depend on somebody remembering to paste a different secret
   into the same box at the same moment they flip the mode. Get the order
   wrong, or flip the mode on a machine where the box still holds the other
   environment's secret, and you either book a real parcel from a test
   checkout or fail every quote with no clue why.

   Paired names mean BOTH sets can sit in the environment at once and sandbox
   mode still physically cannot reach a production bearer — it never reads the
   variable. Going live is then one word in one variable, which is what a
   production switch should cost. It also means the production secrets can be
   in place and dormant long before they are used, instead of arriving in a
   hurry on the day of the cutover.

   ── UNITS, WHICH THE ENDPOINT'S OWN SCHEMA DOES NOT STATE ─────────────────
   ShipmentCalculationDataInter types weight/length/width/height as bare
   integers with no description. Every sibling DTO in the same document that
   DOES document them agrees: ParcelDto, ShipmentDto and LetterDto all say
   "weight in grams", "length in centimeters", "declared price in UAH". That is
   the convention this file follows.

   IT IS ALSO NOT THE SAME AS NOVA POST, which takes millimetres — and
   lib/parcel.ts speaks millimetres because Nova Poshta was first. Handing
   millimetres to an API expecting centimetres declares a parcel ten times too
   big in every dimension, which prices as bulky freight. The conversion is
   done once, here, and rounded UP: a parcel declared slightly larger is quoted
   slightly high, and quoting high is the safe direction when the alternative
   is absorbing the difference.
--------------------------------------------------------------------------- */

const SANDBOX_BASE = "https://dev.ukrposhta.ua/ecom/0.0.1";
const PRODUCTION_BASE = "https://www.ukrposhta.ua/ecom/0.0.1";

export type UkrposhtaMode = "sandbox" | "production";

/** Sandbox unless production is named explicitly. Never inferred. */
export function ukrposhtaMode(): UkrposhtaMode {
  return process.env.UKRPOSHTA_API_MODE === "production" ? "production" : "sandbox";
}

function baseUrl(): string {
  return ukrposhtaMode() === "production" ? PRODUCTION_BASE : SANDBOX_BASE;
}

export class UkrposhtaError extends Error {}

/** Thrown when the integration is not configured — distinct from a bad request. */
export class UkrposhtaNotConfigured extends UkrposhtaError {}

/**
 * Read a credential belonging to the CURRENT mode, and only that mode.
 *
 * The variable name is derived from the mode rather than chosen by the caller,
 * so there is no code path anywhere in this file that can name a production
 * variable while running in sandbox. The error names the exact variable that
 * is missing, because "not configured" with no clue which of eight it is
 * costs more time than the check saves.
 */
function credential(suffix: string): string {
  const mode = ukrposhtaMode();
  const name = `UKRPOSHTA_${mode.toUpperCase()}_${suffix}`;
  const value = process.env[name];
  if (!value) throw new UkrposhtaNotConfigured(`${name} is not set`);
  return value;
}

function ecomBearer(): string {
  return credential("BEARER_ECOM");
}

/**
 * The counterparty token, for the endpoints that take `?token=`.
 *
 * Not needed by delivery-price. Exported for shipment creation, which is the
 * next phase and does need it.
 */
export function counterpartyToken(): string {
  return credential("COUNTERPARTY_TOKEN");
}

/** The counterparty's own UUID, needed when a shipment is created. */
export function counterpartyUuid(): string {
  return credential("COUNTERPARTY_UUID");
}

/** The StatusTracking bearer — a different credential from the eCom one. */
export function trackingBearer(): string {
  return credential("BEARER_TRACKING");
}

export type IntlQuote =
  | { ok: true; costUah: number }
  /** A real country Ukrposhta will not carry to, or cannot price. The caller
      should fall back to the other carrier rather than treat this as a fault. */
  | { ok: false; reason: "unsupported_country" };

/**
 * Package type.
 *
 * PARCEL, not DECLARED_VALUE. Both exist; DECLARED_VALUE is the insured
 * product and costs more, and nothing in the current checkout offers the
 * customer insurance or charges them for it. Declaring a product we do not
 * sell would quote a price we then could not honour.
 */
const PACKAGE_TYPE = "PARCEL";

/**
 * What is in the box, for customs.
 *
 * SALE_OF_GOODS, and this is not a tuning knob. The enum also offers GIFT and
 * COMMERCIAL_SAMPLE, both of which are cheaper to clear in some destinations —
 * and both of which would be a false customs declaration on a parcel someone
 * has just paid for. It is also not cosmetic: adding it moved the Polish quote
 * from 735.86 to 731.17, so the field reaches the tariff.
 */
const CATEGORY_TYPE = "SALE_OF_GOODS";

/**
 * The declared currency.
 *
 * Required for some destinations and ignored by the rest — the United States
 * refuses outright without it ("For shipment to 'US' currency should be USD"),
 * while Germany prices identically with and without. Sent always, because a
 * field that is free where it is optional and fatal where it is not should not
 * be conditional on a country list somebody has to maintain.
 *
 * It does NOT change what declaredPrice is denominated in: the response echoes
 * declaredPrice back unchanged in hryvnia while reporting deliveryPriceCurr in
 * USD, so this names the currency of the customs VALUE, not of the postage.
 */
const DECLARED_CURRENCY = "USD";

/**
 * AVIA rather than GROUND.
 *
 * Ground service from Ukraine reaches only a handful of neighbours and is slow
 * enough that a premium storefront quoting it would be setting up a complaint.
 * Overridable so the decision is visible rather than buried.
 */
function transportType(): "AVIA" | "GROUND" {
  return process.env.UKRPOSHTA_TRANSPORT_TYPE === "GROUND" ? "GROUND" : "AVIA";
}

/** Millimetres (what lib/parcel speaks) to whole centimetres, rounded up. */
function mmToCm(mm: number): number {
  return Math.max(1, Math.ceil(mm / 10));
}

/**
 * The response echoes the request with the price fields filled in, and the
 * 200 has no schema in the spec — so every field here is optional and the
 * shape is treated as untrusted.
 */
type PriceResponse = {
  /** The total, in hryvnia. The one field that decides what a customer pays. */
  deliveryPrice?: number | null;
  /** The Ukrainian leg only — NOT the price in UAH. See chargeableUah. */
  deliveryPriceUa?: number | null;
  deliveryPriceUaWithVat?: number | null;
  /** The same total expressed in `currencyCode` (USD in every sandbox reply). */
  deliveryPriceCurr?: number | null;
  currencyCode?: string | null;
};

/**
 * Which number we are actually going to charge the customer: `deliveryPrice`,
 * and it is hryvnia.
 *
 * THIS FUNCTION FIRST GUESSED, AND THE GUESS WOULD HAVE COST REAL MONEY. The
 * spec documents none of these fields, so "Ua" was read as "UAH" and
 * deliveryPriceUaWithVat was preferred on the reasoning that a VAT-inclusive
 * hryvnia figure was the safe over-estimate. A sandbox call settled it, and
 * the reading was wrong in the expensive direction.
 *
 * What a real response says, Germany, 125 g:
 *
 *   deliveryPrice                476.61   <- the total, in UAH
 *   deliveryPriceWithoutPriceUa  368.61      the international leg
 *   deliveryPriceUaWithVat       108         the UKRAINIAN leg, with VAT
 *   deliveryPriceUa               90         the Ukrainian leg, before VAT
 *   deliveryPriceCurr             10.66      the same total, in USD
 *   currencyExchangeRate          44.6988
 *
 * "Ua" is UKRAINE, not hryvnia — the domestic portion of an international
 * journey. It is a flat 90 to Germany, Japan and New Zealand alike, which is
 * what gives it away; a currency conversion would not be identical across
 * three zones. And 368.61 + 108 = 476.61 exactly, so the two legs sum to the
 * total. That the total is hryvnia is confirmed independently:
 * 10.66 USD × 44.6988 = 476.5, which is deliveryPrice to rounding.
 *
 * So the original ordering would have charged 108 UAH to send a parcel to
 * Germany that costs 476.61 — the shop absorbing 368 UAH on every
 * international order, growing with distance, and looking like a pricing
 * decision rather than a bug.
 *
 * rawDeliveryPrice is 18 below deliveryPrice at every destination tested, so
 * deliveryPrice is the one carrying the complete fee. It is the only field
 * read here; there is no fallback chain, because a fallback would be another
 * guess about a field nobody has verified.
 *
 * Returns null when nothing usable came back, which the caller reads as
 * "cannot price" rather than as free shipping — a zero here would be a silent
 * free-shipping bug on exactly the orders that cost the most to send.
 */
function chargeableUah(body: PriceResponse): number | null {
  const value = body.deliveryPrice;
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.round(value * 100) / 100;
  }
  return null;
}

/**
 * What Ukrposhta would charge to carry this parcel from Ukraine to
 * `countryCode`. Returns hryvnia.
 *
 * The declared value is passed for customs and is derived from the catalogue
 * by the caller — never from the browser.
 */
export async function quoteInternational(opts: {
  countryCode: string;
  weightKg: number;
  dims: Dims;
  declaredValueUah: number;
}): Promise<IntlQuote> {
  const country = opts.countryCode.trim().toUpperCase().slice(0, 2);
  if (country.length !== 2) return { ok: false, reason: "unsupported_country" };

  /* READ THE BEARER BEFORE THE try, not inside it. Called within the fetch's
     try block, a missing-credential throw was being caught and re-wrapped as
     "delivery-price unreachable", which cost it its type — so the caller could
     no longer tell "not configured yet" from "the network is down" and logged
     a stack trace on every international quote until the keys landed. */
  const bearer = ecomBearer();

  const body = {
    recipientCountryIso3166: country,
    packageType: PACKAGE_TYPE,
    transportType: transportType(),
    categoryType: CATEGORY_TYPE,
    currencyCode: DECLARED_CURRENCY,
    // Grams, whole, and never zero — the API rejects a weightless parcel.
    weight: Math.max(1, Math.round(opts.weightKg * 1000)),
    length: mmToCm(opts.dims.l),
    width: mmToCm(opts.dims.w),
    height: mmToCm(opts.dims.h),
    declaredPrice: Math.max(1, Math.round(opts.declaredValueUah)),
  };

  let res: Response;
  try {
    res = await fetch(`${baseUrl()}/international/delivery-price`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bearer}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify(body),
    });
  } catch (e) {
    /* Network-level failure. Deliberately not swallowed into
       unsupported_country: the caller distinguishes "Ukrposhta does not go
       there" from "Ukrposhta did not answer", and only the first is a normal
       outcome to show a customer. */
    throw new UkrposhtaError(`delivery-price unreachable: ${(e as Error).message}`);
  }

  /* ── READING A FAILURE, WHICH THE FIRST VERSION GOT DANGEROUSLY WRONG ─────
     It treated every 400 and 404 as "we do not go there". Sandbox showed that
     hides three completely different things behind one silent shrug:

       400 UPE01003  a genuine refusal — "United Arab Emirates with shipment
                     PackageType:PRIME PARCEL is not available for delivery".
                     This one really is unsupported.

       400 UPE01002  A FAULT IN OUR REQUEST — a missing categoryType, a missing
                     currency, an HS code of the wrong length. The destination
                     is fine. Swallowing it as "unsupported" is how the UNITED
                     STATES silently never gets a Ukrposhta quote and every
                     American order pays the other carrier's price forever,
                     with nothing in any log to say why.

       404 (HTML)    not an answer at all. The sandbox rate-limits by returning
                     an nginx error page, and Czechia and Spain both "went
                     unsupported" mid-test purely because I was hammering it.
                     Spaced out, they quote 468.79 and 851.63.

     So: only an explicit refusal is unsupported. A malformed request and a
     gateway hiccup both throw, which the caller logs and degrades from — the
     customer still sees the other carrier, but the fault is visible instead of
     being quietly priced in. */
  const raw = await res.text();
  const json = ((): (PriceResponse & { code?: string; message?: string }) | null => {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  })();

  if (!res.ok) {
    /* No JSON means it never reached the API — a gateway page, a rate limit, a
       proxy error. Never a routing answer. */
    if (!json) {
      throw new UkrposhtaError(
        `delivery-price HTTP ${res.status} for ${country} with a non-JSON body` +
          ` (gateway or rate limit)`
      );
    }
    const message = String(json.message ?? "");
    const refused =
      json.code === "UPE01003" || /not available for delivery/i.test(message);
    if (refused) return { ok: false, reason: "unsupported_country" };

    /* NOTHING FROM THE REQUEST IS ECHOED. The Authorization header carries a
       live bearer, and an error path is exactly where a careless log line ends
       up in a shared drain. The API's own message names the offending field
       without quoting our payload, which is what makes it safe to include. */
    throw new UkrposhtaError(
      `delivery-price rejected for ${country}: ${json.code ?? res.status} ${message.slice(0, 160)}`
    );
  }

  if (!json) throw new UkrposhtaError(`delivery-price returned unparseable body for ${country}`);

  const costUah = chargeableUah(json);
  if (costUah === null) {
    console.error(
      `[ukrposhta] priced ${country} but no usable amount came back` +
        ` (fields: ${Object.keys(json).join(", ").slice(0, 200)})`
    );
    return { ok: false, reason: "unsupported_country" };
  }

  return { ok: true, costUah };
}
