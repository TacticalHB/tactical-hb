import "server-only";
import {
  npCall,
  getSenderCityRef,
  getWarehouses,
  NovaPoshtaError,
  DEFAULT_WEIGHT_KG,
  type NpServiceType,
} from "@/lib/nova-poshta";
import { hasLatin, toCyrillic } from "@/lib/transliterate";

/* ---------------------------------------------------------------------------
   Creating a Nova Poshta waybill (ТТН).

   Runs only from the payment webhook, server-side, after money has moved.

   WHO PAYS. PayerType Sender + PaymentMethod NonCash: the customer already paid
   us for delivery at checkout, so the shipment is billed to our business
   account and appears in the cabinet awaiting payment rather than asking the
   recipient for cash at the counter. Both are env-overridable for the day that
   changes, without touching this file.

   The waybill is created but NOT paid here — that is deliberate. Payment is a
   money movement that belongs in the cabinet under a human's eye, and requirement
   is only that the shipment is ready and easy to find there.
--------------------------------------------------------------------------- */

const PAYER_TYPE = process.env.NOVA_POSHTA_PAYER_TYPE || "Sender";
const PAYMENT_METHOD = process.env.NOVA_POSHTA_PAYMENT_METHOD || "NonCash";
/** Must match what getDocumentPrice quoted, or the charge won't reconcile. */
const CARGO_TYPE = "Cargo";

/**
 * Fallback parcel dimensions in cm, for orders that reach here without real
 * ones (placed before product weights existed). Nova Poshta requires an
 * OptionsSeat per seat for Cargo and rejects the document without one.
 */
const DEFAULT_SEAT = { l: 20, w: 20, h: 10 };

/**
 * Seat dimensions in whole centimetres, floored from the packed carton in mm.
 *
 * Flooring is deliberate: the chargeable weight already folds in the parcel's
 * volumetric weight, so the seat only has to be small enough that Nova Poshta's
 * own volumetric calc can't exceed it and inflate the charge above what we
 * quoted. Rounding up could do exactly that.
 */
function seatCm(dimsMm?: { l: number; w: number; h: number }) {
  if (!dimsMm) return DEFAULT_SEAT;
  const cm = (mm: number) => Math.max(1, Math.floor(mm / 10));
  return { l: cm(dimsMm.l), w: cm(dimsMm.w), h: cm(dimsMm.h) };
}

export type TtnRecipient = {
  firstName: string;
  lastName: string;
  phone: string;
};

export type TtnDestination =
  | { kind: "warehouse"; cityRef: string; warehouseRef: string }
  | { kind: "courier"; cityRef: string; street: string; building: string; flat?: string | null };

export type CreateTtnInput = {
  recipient: TtnRecipient;
  destination: TtnDestination;
  /** Declared value in UAH — what Nova Poshta insures the parcel for. */
  declaredValueUah: number;
  /** Goes on the waybill so a parcel can be identified without a lookup. */
  description: string;
  /** Chargeable weight in kg (real weight, or volumetric where that's higher). */
  weightKg?: number;
  /** Packed carton in mm, for the seat's declared dimensions. */
  dimsMm?: { l: number; w: number; h: number };
};

export type CreatedTtn = {
  /** The printable 14-digit number a human quotes. */
  number: string;
  /** InternetDocument Ref — needed to print, track or cancel later. */
  ref: string;
  /** What Nova Poshta will charge us, when it tells us. */
  costUah: number | null;
};

/* ------------------------------- helpers -------------------------------- */

/**
 * Ukrainian mobile in the form Nova Poshta accepts.
 *
 * We store what the customer typed ("+380 67 707 33 07"), which the API
 * rejects. Reduce to digits and normalise the country code rather than
 * refusing an otherwise good order over spacing.
 */
export function normalisePhone(raw: string): string {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("380")) return digits;
  if (digits.length === 10 && digits.startsWith("0")) return `38${digits}`;
  if (digits.length === 9) return `380${digits}`;
  return digits;
}

/** A Nova Poshta dispatch date (DD.MM.YYYY), `offsetDays` from today. */
function npDate(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/**
 * A cargo description Nova Poshta will accept.
 *
 * The API rejects "Description is not valid" for stray punctuation — an em dash
 * is enough to fail the whole waybill. Normalise dashes to a hyphen and drop
 * anything that isn't a letter (any script), digit, space or plain punctuation,
 * so a product name with an odd character can't sink the dispatch.
 */
export function cleanDescription(s: string): string {
  const cleaned = (s ?? "")
    .replace(/[—–]/g, "-")
    .replace(/[^\p{L}\p{N}\s\-.,/№()]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 250);
  return cleaned || "Order";
}

/* -------------------------------- sender -------------------------------- */

type RawCounterparty = { Ref: string; Description?: string };
type RawContact = { Ref: string; Phones?: string; Description?: string };

export type Sender = {
  cityRef: string;
  counterpartyRef: string;
  contactRef: string;
  phone: string;
  addressRef: string;
  /* The contact person's name, which the lookup below already returns and
     nothing used until Ukrposhta needed a sender to print. Surfacing the
     field we already have beats a second round trip, and beats a hand-typed
     copy in the environment that goes stale the first time the Nova Poshta
     cabinet is edited. Empty string when the contact has no description. */
  contactName: string;
};

let senderCache: Sender | null = null;

/**
 * Our own dispatch details.
 *
 * Read from the API rather than hardcoded so they cannot drift from the
 * account, and cached for the life of the instance because they never change
 * mid-run. Every part is env-overridable for accounts with more than one
 * sender, contact or dispatch branch, where "the first one" is a coin toss.
 */
export async function resolveSender(): Promise<Sender> {
  if (senderCache) return senderCache;

  const cityRef = process.env.NOVA_POSHTA_SENDER_CITY_REF || (await getSenderCityRef());

  const counterparties = await npCall<RawCounterparty>("Counterparty", "getCounterparties", {
    CounterpartyProperty: "Sender",
    Page: "1",
  });
  const counterpartyRef = process.env.NOVA_POSHTA_SENDER_REF || counterparties[0]?.Ref;
  if (!counterpartyRef) {
    throw new NovaPoshtaError("No sender counterparty on this Nova Poshta account");
  }

  const contacts = await npCall<RawContact>("Counterparty", "getCounterpartyContactPersons", {
    Ref: counterpartyRef,
    Page: "1",
  });
  const contact = contacts[0];
  const contactRef = process.env.NOVA_POSHTA_SENDER_CONTACT_REF || contact?.Ref;
  if (!contactRef) {
    throw new NovaPoshtaError("Sender counterparty has no contact person");
  }

  const phone = normalisePhone(process.env.NOVA_POSHTA_SENDER_PHONE || contact?.Phones || "");
  if (!phone) throw new NovaPoshtaError("No sender phone available");

  // The branch we hand parcels over at. Explicit env wins; otherwise take the
  // first branch in the dispatch city, which is right for a single-branch
  // sender and overridable for anyone else.
  let addressRef = process.env.NOVA_POSHTA_SENDER_WAREHOUSE_REF || "";
  if (!addressRef) {
    const branches = await getWarehouses(cityRef);
    addressRef = branches[0]?.ref ?? "";
  }
  if (!addressRef) {
    throw new NovaPoshtaError("Could not resolve a sender warehouse — set NOVA_POSHTA_SENDER_WAREHOUSE_REF");
  }

  senderCache = { cityRef, counterpartyRef, contactRef, phone, addressRef, contactName: (contact?.Description || "").trim() };
  return senderCache;
}

/* ------------------------------- recipient ------------------------------- */

type RawSavedCounterparty = {
  Ref: string;
  ContactPerson?: { data?: { Ref: string }[] };
};

/**
 * Register the recipient as a private person and return the refs the waybill
 * needs. Nova Poshta de-duplicates on phone, so repeat customers reuse their
 * existing record rather than accumulating duplicates.
 */
async function createRecipient(r: TtnRecipient): Promise<{ counterpartyRef: string; contactRef: string }> {
  const phone = normalisePhone(r.phone);
  if (phone.length !== 12) {
    throw new NovaPoshtaError(`Recipient phone is not a Ukrainian number: "${r.phone}"`);
  }

  const save = (firstName: string, lastName: string) =>
    npCall<RawSavedCounterparty>("Counterparty", "save", {
      FirstName: firstName,
      LastName: lastName,
      Phone: phone,
      CounterpartyType: "PrivatePerson",
      CounterpartyProperty: "Recipient",
    });

  // Send what the customer actually typed first. Nova Poshta refuses Latin
  // characters, so a name from the English site is retried transliterated
  // rather than losing the waybill to a manual queue over an alphabet. A
  // Cyrillic name never reaches the fallback and is never rewritten.
  let rows: RawSavedCounterparty[];
  try {
    rows = await save(r.firstName, r.lastName);
  } catch (e) {
    const latin = hasLatin(r.firstName) || hasLatin(r.lastName);
    if (e instanceof NovaPoshtaError && latin && /invalid characters/i.test(e.message)) {
      const first = toCyrillic(r.firstName);
      const last = toCyrillic(r.lastName);
      console.warn(`[ttn] Nova Poshta refused a Latin name — retrying as "${first} ${last}"`);
      rows = await save(first, last);
    } else {
      throw e;
    }
  }

  const saved = rows[0];
  const contactRef = saved?.ContactPerson?.data?.[0]?.Ref;
  if (!saved?.Ref || !contactRef) {
    throw new NovaPoshtaError("Counterparty.save returned no recipient refs");
  }
  return { counterpartyRef: saved.Ref, contactRef };
}

/* ------------------------------ destination ------------------------------ */

type RawStreet = { Ref: string; Description: string };
type RawAddress = { Ref: string };

/**
 * A courier address ref.
 *
 * The street has to be matched against Nova Poshta's own directory — a free
 * text street is not accepted. An unmatched street throws rather than guessing:
 * delivering to a street we picked ourselves is worse than falling back to a
 * waybill made by hand.
 */
async function createCourierAddress(
  counterpartyRef: string,
  cityRef: string,
  street: string,
  building: string,
  flat?: string | null
): Promise<string> {
  const streets = await npCall<RawStreet>("Address", "getStreet", {
    CityRef: cityRef,
    FindByString: street.trim(),
    Limit: "50",
  });

  const wanted = street.trim().toLowerCase();
  const match =
    streets.find((s) => s.Description.toLowerCase() === wanted) ??
    streets.find((s) => s.Description.toLowerCase().includes(wanted)) ??
    streets[0];

  if (!match) throw new NovaPoshtaError(`Street "${street}" not found in Nova Poshta's directory`);

  const rows = await npCall<RawAddress>("Address", "save", {
    CounterpartyRef: counterpartyRef,
    StreetRef: match.Ref,
    BuildingNumber: building,
    Flat: flat ?? "",
  });

  const ref = rows[0]?.Ref;
  if (!ref) throw new NovaPoshtaError("Address.save returned no address ref");
  return ref;
}

/* -------------------------------- waybill -------------------------------- */

type RawDocument = { Ref: string; IntDocNumber?: string; CostOnSite?: number | string };

/** Create the waybill. Throws on any failure — the caller decides what that means. */
export async function createTtn(input: CreateTtnInput): Promise<CreatedTtn> {
  const sender = await resolveSender();
  const recipient = await createRecipient(input.recipient);

  const serviceType: NpServiceType =
    input.destination.kind === "courier" ? "WarehouseDoors" : "WarehouseWarehouse";

  const recipientAddressRef =
    input.destination.kind === "warehouse"
      ? input.destination.warehouseRef
      : await createCourierAddress(
          recipient.counterpartyRef,
          input.destination.cityRef,
          input.destination.street,
          input.destination.building,
          input.destination.flat
        );

  const weight = String(input.weightKg ?? DEFAULT_WEIGHT_KG);
  const seat = seatCm(input.dimsMm);

  const body = (dispatchDate: string) => ({
    PayerType: PAYER_TYPE,
    PaymentMethod: PAYMENT_METHOD,
    DateTime: dispatchDate,
    CargoType: CARGO_TYPE,
    Weight: weight,
    ServiceType: serviceType,
    SeatsAmount: "1",
    // Required for Cargo — the parcel's single seat, weight matching the top
    // level and dimensions from the packed carton.
    OptionsSeat: [
      {
        volumetricWidth: String(seat.w),
        volumetricLength: String(seat.l),
        volumetricHeight: String(seat.h),
        weight,
      },
    ],
    Description: cleanDescription(input.description),
    Cost: String(Math.max(1, Math.round(input.declaredValueUah))),

    CitySender: sender.cityRef,
    Sender: sender.counterpartyRef,
    SenderAddress: sender.addressRef,
    ContactSender: sender.contactRef,
    SendersPhone: sender.phone,

    CityRecipient: input.destination.cityRef,
    Recipient: recipient.counterpartyRef,
    RecipientAddress: recipientAddressRef,
    ContactRecipient: recipient.contactRef,
    RecipientsPhone: normalisePhone(input.recipient.phone),
  });

  // Nova Poshta enforces a same-day dispatch cut-off: past it, a waybill dated
  // today is refused with "DateTime cannot be less then now". An evening order
  // ships the next working day anyway, so retry once dated tomorrow rather than
  // dropping it to manual creation over a clock.
  let rows: RawDocument[];
  try {
    rows = await npCall<RawDocument>("InternetDocument", "save", body(npDate(0)));
  } catch (e) {
    if (e instanceof NovaPoshtaError && /DateTime cannot be less/i.test(e.message)) {
      console.warn("[ttn] past Nova Poshta's same-day cut-off — dispatching", npDate(1));
      rows = await npCall<RawDocument>("InternetDocument", "save", body(npDate(1)));
    } else {
      throw e;
    }
  }

  const doc = rows[0];
  if (!doc?.IntDocNumber || !doc?.Ref) {
    throw new NovaPoshtaError("InternetDocument.save returned no waybill number");
  }

  const cost = Number(doc.CostOnSite);
  return {
    number: doc.IntDocNumber,
    ref: doc.Ref,
    costUah: Number.isFinite(cost) ? cost : null,
  };
}
