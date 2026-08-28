import "server-only";
import { UkrposhtaError, trackingBearer, ukrposhtaMode } from "@/lib/ukrposhta";
import type { ParcelStage } from "@/lib/nova-poshta-tracking";

/* ---------------------------------------------------------------------------
   Ukrposhta StatusTracking — where an international parcel has got to.

   A DIFFERENT SERVICE FROM THE ONE THAT BOOKS THE PARCEL. Different host,
   different bearer, different vocabulary:

     booking   {host}/ecom/0.0.1/            UKRPOSHTA_*_BEARER_ECOM
     tracking  {host}/status-tracking/0.0.1/ UKRPOSHTA_*_BEARER_TRACKING

   The tracking bearer has existed in the environment since the credentials
   landed and nothing has ever called it. This is the first caller.

   A PARCEL IS INVISIBLE HERE UNTIL IT IS LODGED. «Відправлення потрапляє до
   системи відстеження лише після реєстрації у відділенні! Якщо відправлення
   не зареєстровано, у відповідь на запит статусу отримуємо помилку, що таке
   відправлення не знайдено.» So a freshly booked parcel is NOT FOUND, and that
   is the correct answer rather than an outage — the label is printed, the box
   is still on the bench. `notFound` is reported separately for exactly this
   reason: it must not be mistaken for a failure.

   THE MAPPING IS EXPLICIT AND AN UNKNOWN CODE MOVES NOTHING, the same rule
   nova-poshta-tracking follows and for the same reason. Ukrposhta publishes
   about sixty codes across three tables (domestic, on Ukrainian territory,
   outside Ukraine) and adds to them; a code nobody has read is not a licence
   to guess what a customer should be told.
--------------------------------------------------------------------------- */

/** Up to 100 barcodes per request — the documented ceiling. */
export const UKRPOSHTA_TRACK_BATCH_MAX = 100;

export type UkrposhtaParcel = {
  barcode: string;
  /** Ukrposhta's numeric event code, as a string. */
  event: string;
  /** Their own description, in English when the API gives one. */
  eventName: string;
  stage: ParcelStage;
  /**
   * The parcel came BACK, and somebody has to deal with it.
   *
   * Kept out of `stage` deliberately: the shared vocabulary has no word for it,
   * and inventing one would mean teaching every caller a state it has no
   * handling for. `stage` stays "unknown" so nothing moves, and this flag is
   * how a return gets noticed instead of silently looking like no news.
   */
  returned: boolean;
  /**
   * Acceptance was cancelled, or the booking was deleted.
   *
   * Also kept out of `stage` for the same reason as `returned`, and worth
   * knowing for the opposite one: a returned parcel needs somebody to receive
   * it back, a cancelled one means the parcel never went at all and the order
   * still owes the customer a box.
   */
  cancelled: boolean;
};

function trackingBaseUrl(): string {
  const host = ukrposhtaMode() === "production" ? "https://www.ukrposhta.ua" : "https://dev.ukrposhta.ua";
  return `${host}/status-tracking/0.0.1`;
}

/* ---- The codes ------------------------------------------------------------

   Read off Додаток Б of the StatusTracking document (04.03.2026). Grouped by
   what they mean to an order rather than by which of the three tables they
   came from, because an order does not care whether a parcel is being sorted
   in Kyiv or in Leipzig — only whether it has left, arrived, or come back.
--------------------------------------------------------------------------- */

/** Booked online, not yet accepted over a counter. */
const CREATED = new Set(["10601"]);

/** Delivered, and delivered to the RECIPIENT — see RETURN_REASON_ID below. */
const DELIVERED = new Set([
  "41000", // Відправлення вручено
  "48000", // Міжнародне відправлення вручено у країні одержувача
  "24500", // Завершення імпорту
]);

/** The parcel is going the other way. */
const RETURNING = new Set([
  "31200", // Повернення відправлення / за зворотною адресою
  "41010", // Вручено відправнику
]);

/** Never happened, or was stopped. Nothing to tell a customer about movement. */
const CANCELLED = new Set([
  "10600", // Прийом скасовано (на вимогу відправника)
  "10602", // Прийом скасовано
  "10603", // Видалено клієнтом
  "24200", // Скасування експорту
]);

/**
 * Everything else that means "moving, or waiting somewhere on the way".
 *
 * Accepted at a counter is IN TRANSIT, not "created": from the customer's side
 * the parcel has left. Customs holds, failed delivery attempts and storage are
 * all in here too — a parcel sitting in a Leipzig customs shed has still
 * shipped, and telling somebody otherwise because it stopped moving for a week
 * would be worse than saying nothing.
 */
const IN_TRANSIT = new Set([
  // Ukraine
  "10100", "20700", "20800", "20900", "21400", "21500", "21600", "21700",
  "31100", "31300", "31400", "35300",
  // customs and exchange offices
  "60700", "70800", "71200", "80700", "80800", "82700", "82800", "87500",
  "89000", "90700", "90800", "100700", "100800",
  // outside Ukraine
  "17100", "24100", "24300", "24400", "27200", "27900", "29200", "29300",
  "29500", "29700", "35100", "35200", "35400",
]);

/**
 * 41000 with this reason is NOT a delivery to the customer.
 *
 * «У випадку повернення відправлення, кінцевий статус 41010 формується як сума
 * (при цьому саме поле event має значення 41000)»: event stays 41000 and only
 * eventReason_id tells you it went back to the sender. Read the code alone and
 * a returned parcel reports as delivered — the customer is emailed that their
 * order arrived while the box is sitting in Kharkiv.
 */
const RETURN_REASON_ID = 10;

type Verdict = { stage: ParcelStage; returned: boolean; cancelled: boolean };

function stageFor(event: string, reasonId: number | null): Verdict {
  /* Codes arrive with stray spaces in the published table ("31 200"), and there
     is no reason to assume the API is tidier than its own documentation. */
  const e = String(event ?? "").replace(/\s+/g, "");
  const plain = (stage: ParcelStage): Verdict => ({ stage, returned: false, cancelled: false });

  if (DELIVERED.has(e)) {
    if (e === "41000" && reasonId === RETURN_REASON_ID) {
      return { stage: "unknown", returned: true, cancelled: false };
    }
    return plain("delivered");
  }
  if (RETURNING.has(e)) return { stage: "unknown", returned: true, cancelled: false };
  /* Cancelled moves nothing either, but it is a KNOWN nothing — the parcel was
     never accepted — where an unlisted code is an unknown one. Same stage, and
     the difference is the whole reason both sets exist. */
  if (CANCELLED.has(e)) return { stage: "unknown", returned: false, cancelled: true };
  if (CREATED.has(e)) return plain("created");
  if (IN_TRANSIT.has(e)) return plain("in_transit");
  return plain("unknown");
}

type RawStatus = {
  barcode?: string;
  event?: string | number;
  eventName?: string;
  eventReason_id?: number | null;
};

/**
 * Last status for up to 100 barcodes.
 *
 * Uses /statuses/last/with-not-found rather than /statuses/last: the plain one
 * simply omits barcodes it does not know, so "no movement yet" and "we sent a
 * number that does not exist" arrive as the same silence. This one names them.
 *
 * Never throws for a parcel-level problem — an outage returns empty and the
 * caller lags by a run, which is the correct failure for a cron that is not
 * the reason the parcel is moving.
 */
export async function trackUkrposhtaParcels(
  barcodes: string[]
): Promise<{ found: UkrposhtaParcel[]; notFound: string[] }> {
  const wanted = barcodes.map((b) => b.trim()).filter(Boolean).slice(0, UKRPOSHTA_TRACK_BATCH_MAX);
  if (wanted.length === 0) return { found: [], notFound: [] };

  const res = await fetch(`${trackingBaseUrl()}/statuses/last/with-not-found?lang=en`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${trackingBearer()}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify(wanted),
  });

  const raw = await res.text();

  /* A 404 HERE IS AN ANSWER, NOT A FAULT. When none of the requested barcodes
     are in the tracking system the service replies 404 UPE02000 "Shipment not
     found" rather than 200 with an empty found list — so treating every
     non-200 as an outage would turn the single most ordinary case (a parcel
     booked this morning and not yet lodged) into a logged error, every run,
     for every parcel. Measured against production on 28 August 2026: a
     just-booked barcode answers exactly that.

     Everything the caller asked about is reported as notFound, which is
     precisely what it means. */
  if (res.status === 404 && raw.includes("UPE02000")) {
    return { found: [], notFound: wanted };
  }
  if (!res.ok) {
    throw new UkrposhtaError(`tracking: HTTP ${res.status} ${raw.slice(0, 200)}`);
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    throw new UkrposhtaError(`tracking: HTTP ${res.status}, non-JSON body (gateway or rate limit)`);
  }

  /* The documented shape is { found: [...], notFound: [...] }. Read defensively
     anyway: a bare array is what the plain /statuses/last returns, and being
     handed one here should degrade to "these are the found ones" rather than
     throw on a service that is answering perfectly well. */
  const b = body as { found?: RawStatus[]; notFound?: unknown[] };
  const rows: RawStatus[] = Array.isArray(body) ? (body as RawStatus[]) : (b.found ?? []);
  const notFound = (b.notFound ?? []).map(String).filter(Boolean);

  const found: UkrposhtaParcel[] = [];
  for (const r of rows) {
    if (!r?.barcode) continue;
    const event = String(r.event ?? "");
    const { stage, returned, cancelled } = stageFor(event, r.eventReason_id ?? null);
    found.push({
      barcode: r.barcode,
      event,
      eventName: String(r.eventName ?? ""),
      stage,
      returned,
      cancelled,
    });
  }

  return { found, notFound };
}
