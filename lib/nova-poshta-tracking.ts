import "server-only";
import { npCall } from "@/lib/nova-poshta";

/* ---------------------------------------------------------------------------
   Nova Poshta parcel tracking.

   One call carries up to 100 waybills, so a batch of orders costs a single
   request rather than one each — that, plus only ever asking about parcels
   still in flight, is what keeps this well inside any sane rate limit.

   Passing the recipient's phone alongside each number is optional but returns
   the full record; without it Nova Poshta withholds some fields.
--------------------------------------------------------------------------- */

/** Nova Poshta's own cap per getStatusDocuments call. */
export const TRACK_BATCH_MAX = 100;

/** What a tracked parcel means for the order, in our own terms. */
export type ParcelStage =
  /** Waybill exists, not yet handed to Nova Poshta. */
  | "created"
  /** Accepted and moving, or waiting at the destination branch. */
  | "in_transit"
  /** The customer has it. */
  | "delivered"
  /** Deleted, unknown number, or a code we don't recognise — change nothing. */
  | "unknown";

export type TrackedParcel = {
  number: string;
  statusCode: string;
  status: string;
  stage: ParcelStage;
};

/* ---------------------------------------------------------------------------
   Status codes, mapped EXPLICITLY.

   Nova Poshta publishes ~30 codes and adds to them. An unlisted code therefore
   maps to "unknown" and moves nothing, because guessing from a code we have
   never seen is how an order silently tells a customer the wrong thing. A
   status that lags by one cron run is recoverable; a wrong one emails somebody
   that a parcel shipped when it didn't.
--------------------------------------------------------------------------- */

/** Handed over, in transit, or waiting to be collected — the parcel has left us. */
const IN_TRANSIT = new Set([
  "4", // in the sender's city
  "5", // heading to the destination city
  "6", // in the destination city
  "7", // arrived at the branch
  "8", // arrived at a poshtomat
  "101", // on its way to the recipient (courier)
  "102", // sender refused / recalled — it still left us
  "103", // recipient refused
  "104", // address changed
  "105", // storage ended
  "111", // failed delivery attempt
  "112", // failed delivery attempt (courier)
]);

/** In the customer's hands. */
const DELIVERED = new Set([
  "9", // received
  "10", // received, cash-on-delivery paid out
  "11", // received, not yet paid out
  "106", // received, return waybill created
]);

/** Waybill created but not yet given to Nova Poshta. */
const CREATED = new Set(["1"]);

function stageFor(code: string): ParcelStage {
  if (DELIVERED.has(code)) return "delivered";
  if (IN_TRANSIT.has(code)) return "in_transit";
  if (CREATED.has(code)) return "created";
  // 2 = deleted, 3 = number not found, plus anything new.
  return "unknown";
}

type RawTracked = {
  Number?: string;
  StatusCode?: string | number;
  Status?: string;
};

export type TrackRequest = { number: string; phone?: string | null };

/**
 * Track a batch of waybills.
 *
 * Throws only if the whole call fails — the caller treats that as "try again
 * next run" rather than as information about any particular parcel.
 */
export async function trackParcels(docs: TrackRequest[]): Promise<TrackedParcel[]> {
  const wanted = docs.filter((d) => d.number).slice(0, TRACK_BATCH_MAX);
  if (wanted.length === 0) return [];

  const rows = await npCall<RawTracked>("TrackingDocument", "getStatusDocuments", {
    Documents: wanted.map((d) => ({
      DocumentNumber: d.number,
      Phone: (d.phone ?? "").replace(/\D/g, ""),
    })),
  });

  return rows.map((r) => {
    const statusCode = String(r.StatusCode ?? "");
    return {
      number: String(r.Number ?? ""),
      statusCode,
      status: String(r.Status ?? ""),
      stage: stageFor(statusCode),
    };
  });
}

/** Public tracking page for a waybill — safe to put in an email. */
export function trackingUrl(ttn: string): string {
  return `https://novaposhta.ua/tracking/?cargo_number=${encodeURIComponent(ttn)}`;
}
