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

function ecomBearer(): string {
  const key = process.env.UKRPOSHTA_BEARER_ECOM;
  if (!key) throw new UkrposhtaNotConfigured("UKRPOSHTA_BEARER_ECOM is not set");
  return key;
}

/**
 * The counterparty token, for the endpoints that take `?token=`.
 *
 * Not needed by delivery-price. Exported for shipment creation, which is the
 * next phase and does need it.
 */
export function counterpartyToken(): string {
  const t = process.env.UKRPOSHTA_COUNTERPARTY_TOKEN;
  if (!t) throw new UkrposhtaNotConfigured("UKRPOSHTA_COUNTERPARTY_TOKEN is not set");
  return t;
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
  deliveryPrice?: number | null;
  deliveryPriceUa?: number | null;
  deliveryPriceUaWithVat?: number | null;
  deliveryPriceCurr?: number | null;
  currencyCode?: string | null;
};

/**
 * Which number we are actually going to charge the customer.
 *
 * The response carries up to four price fields and the spec documents none of
 * them. The order below is deliberate and conservative:
 *
 *   deliveryPriceUaWithVat  hryvnia, VAT included — what leaves the account
 *   deliveryPriceUa         hryvnia, before VAT
 *   deliveryPrice           the base figure
 *
 * Preferring the VAT-inclusive hryvnia figure means the worst case is quoting
 * the customer slightly MORE than the postage costs, never less. The opposite
 * ordering would have the shop absorbing VAT on every international parcel.
 *
 * Returns null when nothing usable came back, which the caller reads as
 * "cannot price" rather than as free shipping — a zero here would be a silent
 * free-shipping bug on exactly the orders that cost the most to send.
 */
function chargeableUah(body: PriceResponse): number | null {
  const candidates = [body.deliveryPriceUaWithVat, body.deliveryPriceUa, body.deliveryPrice];
  for (const value of candidates) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return Math.round(value * 100) / 100;
    }
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

  /* 400 is the documented "unable to calculate delivery price", which for a
     well-formed request means the destination is not served. Treated as a
     routine fallback rather than an error, exactly as the Nova Post client
     treats its own bare-message 422. */
  if (res.status === 400 || res.status === 404) {
    return { ok: false, reason: "unsupported_country" };
  }

  if (!res.ok) {
    /* NOTHING FROM THE REQUEST IS LOGGED. The Authorization header carries a
       live bearer, and an error path is exactly where a careless log line ends
       up in a shared drain. Status and the destination country are enough to
       diagnose, and neither is a secret. */
    throw new UkrposhtaError(`delivery-price HTTP ${res.status} for ${country}`);
  }

  const json = (await res.json().catch(() => null)) as PriceResponse | null;
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
