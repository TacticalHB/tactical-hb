import "server-only";
import { resolveSender as resolveNovaPoshtaSender } from "@/lib/nova-poshta-ttn";

/* ---------------------------------------------------------------------------
   Who the parcel is FROM — one answer, whichever carrier is carrying it.

   Mario's instruction, 11 August 2026: use the same sender information for
   Ukrposhta as Nova Poshta already uses. That turns out to be a better idea
   than a second set of variables, because Nova Poshta does not keep its sender
   in the environment at all — lib/nova-poshta-ttn resolves it live from the
   business cabinet (counterparty, then contact person, then phone). Typing the
   same name and number into UKRPOSHTA_SENDER_* would create a second copy that
   is correct on the day it is written and silently wrong the first time the
   cabinet is edited.

   So the cabinet is the source of truth and this module is the one place that
   asks it.

   ── THE POSTCODE IS THE EXCEPTION, AND IT CANNOT BE INHERITED ─────────────
   Nova Poshta addresses a sender by warehouse REF — an opaque uuid for a
   branch. There is no postal code anywhere in that record, because Nova Poshta
   never needs one. Ukrposhta does: a shipment is lodged from a post office
   identified by its index.

   So it could not be derived, and for a while there was nothing to derive it
   from. Mario supplied it on 24 August 2026: 61204, Kharkiv. It now lives in
   code for the same reasons the customs code does — a post office index is not
   a secret, it is the same in sandbox and production, and a value that decides
   where parcels are lodged from is better reviewed than typed once into a
   dashboard. The environment variable still overrides it, so moving to another
   office does not need a deploy.
--------------------------------------------------------------------------- */

/** The post office parcels are lodged from — Kharkiv 61204. */
const SENDER_POSTCODE = "61204";

export type Sender = {
  /** The contact person's name as the carrier will print it. */
  name: string;
  /** E.164-ish, as Nova Poshta normalises it. */
  phone: string;
  /** Ukrposhta's post office index — the office parcels are lodged from. */
  postcode: string;
};

/**
 * The sender, resolved once per process.
 *
 * The Nova Poshta lookup is three sequential API calls, so it is not something
 * to repeat per shipment; nova-poshta-ttn already caches it internally and this
 * simply reads through.
 *
 * Explicit UKRPOSHTA_SENDER_* values win where they are set — a business that
 * lodges Ukrposhta parcels under a different name from its Nova Poshta account
 * can say so — but nothing has to be set for the common case.
 */
export async function resolveSender(): Promise<Sender> {
  const postcode = process.env.UKRPOSHTA_SENDER_POSTCODE?.trim() || SENDER_POSTCODE;

  const overrideName = process.env.UKRPOSHTA_SENDER_NAME?.trim();
  const overridePhone = process.env.UKRPOSHTA_SENDER_PHONE?.trim();
  if (overrideName && overridePhone) {
    return { name: overrideName, phone: overridePhone, postcode };
  }

  /* Falling through to Nova Poshta's cabinet. If that account is unreachable
     the error is allowed to propagate: a shipment created under the wrong
     sender is worse than one that is not created yet, and the caller records
     the failure against the order for a human to pick up. */
  const np = await resolveNovaPoshtaSender();

  return {
    name: overrideName || np.contactName,
    phone: overridePhone || np.phone,
    postcode,
  };
}

/**
 * The sender postcode, or a refusal that names what is missing.
 *
 * Separate from resolveSender because the two have different urgency: a
 * quote needs neither, a shipment needs both, and only this one can be
 * missing while everything else is correctly configured.
 */
export function senderPostcode(): string {
  const value = process.env.UKRPOSHTA_SENDER_POSTCODE?.trim() || SENDER_POSTCODE;

  /* Five digits. Ukrainian indexes are exactly that, and an override with a
     space or a typo would otherwise reach Ukrposhta as a bad sender address —
     which fails late, on a parcel someone has already paid for. */
  if (!/^\d{5}$/.test(value)) {
    throw new Error(
      `UKRPOSHTA_SENDER_POSTCODE is "${value}", which is not a 5-digit Ukrainian ` +
        `post office index. Unset it to fall back to ${SENDER_POSTCODE}.`
    );
  }
  return value;
}
