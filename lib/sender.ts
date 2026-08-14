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

   So UKRPOSHTA_SENDER_POSTCODE has no fallback and is not guessable. It is
   only needed to CREATE a shipment — quoting never asks — so its absence is
   not an error until the first parcel is booked, and senderPostcode() says so
   plainly rather than inventing one.
--------------------------------------------------------------------------- */

export type Sender = {
  /** The contact person's name as the carrier will print it. */
  name: string;
  /** E.164-ish, as Nova Poshta normalises it. */
  phone: string;
  /** Ukrposhta's post office index. Null until it is configured. */
  postcode: string | null;
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
  const postcode = process.env.UKRPOSHTA_SENDER_POSTCODE?.trim() || null;

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
  const value = process.env.UKRPOSHTA_SENDER_POSTCODE?.trim();
  if (!value) {
    throw new Error(
      "UKRPOSHTA_SENDER_POSTCODE is not set. Ukrposhta lodges a shipment from a " +
        "post office index, and Nova Poshta's sender record has no postcode to " +
        "borrow — it addresses branches by uuid. This one has to be supplied."
    );
  }
  return value;
}
