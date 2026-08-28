import "server-only";
import {
  UkrposhtaError,
  counterpartyToken,
  ecomBearerForShipments,
  ukrposhtaBaseUrl,
} from "@/lib/ukrposhta";

/* ---------------------------------------------------------------------------
   The paperwork that has to travel with an international parcel.

   THE FORMS LIVE ON A DIFFERENT HOST PATH FROM THE API, and that is the first
   thing to get wrong. The getting-started document names them separately:

     API    https://www.ukrposhta.ua/ecom/0.0.1/
     forms  https://www.ukrposhta.ua/forms/ecom/0.0.1/

   So this derives the form host from the API host rather than keeping a second
   copy of "which environment am I in" — the same reasoning ukrposhtaBaseUrl()
   is exported for. Sandbox forms come from the sandbox host automatically.

   WHICH FORM DEPENDS ON WHAT IS IN THE BOX, and the documentation is explicit:

     лист (letter)             DL
     дрібний пакет (small)     CN22
     посилка (parcel)          CN23 + C6

   Everything this shop sends is booked as PARCEL, so CN23 is the customs
   declaration and C6 the address envelope. CN22 and DL are here because the
   package type is a constant in one place and could change; they are not
   guesses about a future, they are the other two rows of a published table.

   THESE RETURN PDF BYTES, NOT A URL TO HAND OUT. The token is in the query
   string — that is how Ukrposhta authenticates these — so a form URL IS a
   credential. It must never reach a browser, an email, or an admin page as a
   link. Callers get the bytes and decide what to do with them.
--------------------------------------------------------------------------- */

/** Forms Ukrposhta will render for an international shipment. */
export type ShipmentForm = "cn23" | "cn22" | "c6" | "dl";

/**
 * The two forms a PARCEL needs: the customs declaration and the address sheet.
 *
 * Named rather than inlined at the call site because "which forms does a parcel
 * need" is a postal rule, not a preference, and the one place it is decided
 * should be the place the rule is written down.
 */
export const PARCEL_FORMS: ShipmentForm[] = ["cn23", "c6"];

/** Page sizes Ukrposhta accepts. Only some forms honour them — see below. */
export type FormSize = "SIZE_A4" | "SIZE_A5" | "SIZE_A6" | "SIZE_10X10";

function formsBaseUrl(): string {
  /* https://host/ecom/0.0.1 → https://host/forms/ecom/0.0.1. Derived, so the
     environment can only be decided once. */
  return ukrposhtaBaseUrl().replace("/ecom/", "/forms/ecom/");
}

/**
 * Fetch one form as PDF bytes.
 *
 * `ref` is the shipment's uuid OR its barcode — Ukrposhta accepts either, and
 * the barcode is the one written on the order, so callers usually have that.
 *
 * SIZE IS ONLY SENT WHEN ASKED FOR. The parameter is documented for DL and C6
 * (and the combined small-packet form); appending it to a CN23 that does not
 * expect it is the kind of thing that returns a 200 and a wrong page.
 */
export async function fetchShipmentForm(
  ref: string,
  form: ShipmentForm,
  size?: FormSize
): Promise<{ bytes: Uint8Array; contentType: string }> {
  const id = encodeURIComponent(ref.trim());
  if (!id) throw new UkrposhtaError("fetchShipmentForm: empty shipment reference");

  const url =
    `${formsBaseUrl()}/international/shipments/${id}/${form}` +
    `?token=${encodeURIComponent(counterpartyToken())}` +
    (size ? `&${size}` : "");

  /* BOTH CREDENTIALS, AND THE DOCUMENTATION ONLY MENTIONS ONE. Every published
     example of these URLs shows `?token=` and nothing else, and a request with
     just that is refused by nginx with a bare 403 — no API error, no hint.
     Adding the eCom bearer makes it a PDF. Measured against production on 28
     August 2026 across four header combinations: token alone 403, token +
     bearer 200, token + browser User-Agent 403, token + bearer + User-Agent
     200. So it is the bearer that is missing, not a bot check — which was the
     first guess, because lib/checkbox.ts documents exactly that trap on a
     different Ukrainian API. Worth writing down: the same symptom, a different
     cause. */
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${ecomBearerForShipments()}` },
    cache: "no-store",
  });
  const buf = new Uint8Array(await res.arrayBuffer());

  if (!res.ok) {
    /* The body is the API's error, not ours, and it is short. The URL is NEVER
       logged: it carries the counterparty token. */
    const text = new TextDecoder().decode(buf.slice(0, 300));
    throw new UkrposhtaError(`form ${form}: HTTP ${res.status} ${text}`);
  }

  /* A PDF STARTS "%PDF". Ukrposhta answers an unregistered or unknown shipment
     with a 200 and an HTML page rather than an error status, and a "label" that
     is really a login page prints as a blank sheet at the counter. Checking the
     magic bytes is the only way to tell those apart. */
  const magic = new TextDecoder().decode(buf.slice(0, 4));
  if (magic !== "%PDF") {
    throw new UkrposhtaError(
      `form ${form}: expected a PDF, got ${buf.length} bytes starting ${JSON.stringify(magic)}`
    );
  }

  return { bytes: buf, contentType: res.headers.get("content-type") || "application/pdf" };
}

/** Both parcel forms, fetched together. Fails on the first one that is wrong. */
export async function fetchParcelForms(
  ref: string
): Promise<{ form: ShipmentForm; bytes: Uint8Array }[]> {
  const out: { form: ShipmentForm; bytes: Uint8Array }[] = [];
  for (const form of PARCEL_FORMS) {
    const { bytes } = await fetchShipmentForm(ref, form);
    out.push({ form, bytes });
  }
  return out;
}
