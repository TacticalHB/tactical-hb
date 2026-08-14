import "server-only";
import type { Dims } from "@/lib/parcel";

/* ---------------------------------------------------------------------------
   Nova Post — international rates, Ukraine to the world.

   A SECOND, DIFFERENT API from lib/nova-poshta.ts. That one talks to the classic
   api.novaposhta.ua/v2.0 and handles everything domestic: quotes, waybills,
   tracking. This one talks to api.novapost.com/v.1.0, which is the only place
   cross-border rates live — the old endpoint cannot price them, and this one
   returns nothing at all for a domestic UA→UA route. They are not
   interchangeable and neither replaces the other.

   ONE KEY, THOUGH. Both authenticate with the same NOVA_POSHTA_API_KEY from the
   business cabinet; this API simply wants it exchanged for a short-lived JWT
   first. There is no second key to obtain, which is worth knowing before anyone
   goes looking for one.

   Verified against production on 29 July 2026: Kharkiv → Poland 540 ₴,
   USA 660 ₴, Germany 760 ₴, UK 1410 ₴, Japan 2255 ₴ for a 500 g parcel. Those
   line up with Nova Poshta's published tariffs (Europe "від 385 ₴", the far
   zone "від 2 145 ₴", and their own worked example of 1 050 ₴ for 5 kg to
   Germany against our 1 150), which is what settles the currency question the
   API itself leaves open: costs come back as bare numbers with a null
   currencyCode, and they are HRYVNIA.
--------------------------------------------------------------------------- */

const BASE = "https://api.novapost.com/v.1.0";

/** Where parcels leave from. Only the country and a city name are needed. */
const SENDER_CITY = process.env.NOVA_POSHTA_SENDER_CITY_NAME || "Kharkiv";

export class NovaPostError extends Error {}

export type IntlQuote =
  | { ok: true; costUah: number }
  /** The country is real but Nova Post will not carry to it — the caller should
      fall back rather than treat this as a failure. */
  | { ok: false; reason: "unsupported_country" };

/* ---- JWT ------------------------------------------------------------------
   Valid about an hour. Cached in module scope and refreshed a minute early, so
   a burst of checkout quotes costs one authorisation rather than one each. A
   serverless instance that is recycled simply fetches a fresh one. */

let cachedJwt: { token: string; expiresAt: number } | null = null;

/** Refresh this long before the hour is up, so a quote can't race the expiry. */
const JWT_TTL_MS = 55 * 60 * 1000;

function apiKey(): string {
  const key = process.env.NOVA_POSHTA_API_KEY;
  if (!key) throw new NovaPostError("NOVA_POSHTA_API_KEY is not set");
  return key;
}

async function jwt(): Promise<string> {
  if (cachedJwt && cachedJwt.expiresAt > Date.now()) return cachedJwt.token;

  const res = await fetch(`${BASE}/clients/authorization?apiKey=${encodeURIComponent(apiKey())}`, {
    method: "GET",
    cache: "no-store",
  });
  if (!res.ok) throw new NovaPostError(`authorization HTTP ${res.status}`);

  const body = (await res.json()) as { jwt?: string };
  if (!body.jwt) throw new NovaPostError("authorization returned no jwt");

  cachedJwt = { token: body.jwt, expiresAt: Date.now() + JWT_TTL_MS };
  return body.jwt;
}

/* ---- Quote --------------------------------------------------------------- */

type CalcResponse = {
  services?: { cost?: number | null; price?: number | null }[];
};

type CalcErrors = {
  errors?: Record<string, string> & { errorMessage?: string };
};

/**
 * What Nova Post would charge to carry this parcel from Ukraine to `countryCode`.
 *
 * Returns hryvnia. The recipient city is NOT validated for international routes —
 * a nonsense city still prices correctly, because only the country decides the
 * zone — so it is sent for completeness and nothing depends on it being real.
 */
export async function quoteInternational(opts: {
  countryCode: string;
  weightKg: number;
  dims: Dims;
  declaredValueUah: number;
  city?: string;
}): Promise<IntlQuote> {
  /* ONE RETRY ON 401, AND IT IS NOT DEFENSIVE PROGRAMMING — it was observed.
     On a cold instance the very first international quote returns 401 from
     /shipments/calculations even though the authorisation call just succeeded
     and the SAME cached token prices fine a second later: the token needs a
     moment to propagate on their side. Serverless means cold starts are
     routine, and the checkout reads a throw here as "we cannot ship there",
     so the visible symptom was a customer in a served country being offered
     "we will confirm the total by email" — a lost sale, at random, for no
     reason. Retrying once with a freshly minted token costs one round trip on
     a path that has already failed. */
  const call = async (token: string) =>
    fetch(`${BASE}/shipments/calculations`, {
      method: "POST",
      headers: { Authorization: token, "Content-Type": "application/json" },
      cache: "no-store",
      body: payload,
    });

  const payload = JSON.stringify({
      payerType: "Sender",
      parcels: [
        {
          // Required, and undocumented on the method page — the API only says so
          // by rejecting the request without it.
          rowNumber: 1,
          actualWeight: Math.max(1, Math.round(opts.weightKg * 1000)), // grams
          length: Math.round(opts.dims.l), // millimetres
          width: Math.round(opts.dims.w),
          height: Math.round(opts.dims.h),
          cargoCategory: "parcel",
          /* Must be greater than zero — the API rejects 0 outright. It does not
             move the price (identical quotes from 1 ₴ to 50 000 ₴), so the floor
             is only there to keep a free-shipping voucher order from being
             refused for declaring nothing. */
          insuranceCost: Math.max(1, Math.round(opts.declaredValueUah)),
        },
      ],
      sender: { countryCode: "UA", addressParts: { city: SENDER_CITY } },
      recipient: {
        countryCode: opts.countryCode.toUpperCase(),
        addressParts: { city: opts.city?.slice(0, 60) || "-" },
      },
    });

  let res = await call(await jwt());

  if (res.status === 401) {
    // Discard the token that was just refused and mint a new one.
    cachedJwt = null;
    res = await call(await jwt());
  }

  if (res.status === 422) {
    /* Two different 422s, and they must not be conflated. A bare errorMessage
       means the country cannot be served or is not a real country — a routine
       outcome the checkout handles by falling back. Field-level errors mean this
       function built a bad request, which is a bug and must surface. */
    const body = (await res.json().catch(() => ({}))) as CalcErrors;
    const message = body.errors?.errorMessage;
    if (message) return { ok: false, reason: "unsupported_country" };
    throw new NovaPostError(`calculations rejected: ${JSON.stringify(body.errors ?? {}).slice(0, 300)}`);
  }

  if (!res.ok) throw new NovaPostError(`calculations HTTP ${res.status}`);

  const body = (await res.json()) as CalcResponse;
  const cost = body.services?.[0]?.cost ?? body.services?.[0]?.price;

  /* No services and no error is the domestic case — this API declines to price
     UA→UA. Treated as unsupported so a misrouted call degrades instead of
     charging zero. */
  if (typeof cost !== "number" || !Number.isFinite(cost) || cost <= 0) {
    return { ok: false, reason: "unsupported_country" };
  }

  return { ok: true, costUah: Math.round(cost) };
}
