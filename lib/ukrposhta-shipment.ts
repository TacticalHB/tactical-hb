import "server-only";
import {
  UkrposhtaError,
  UkrposhtaNotConfigured,
  counterpartyToken,
  counterpartyUuid,
  ecomBearerForShipments,
  ukrposhtaBaseUrl,
  ukrposhtaEnabled,
  ukrposhtaMode,
} from "@/lib/ukrposhta";
import { resolveSender, senderPostcode } from "@/lib/sender";
import { latinName } from "@/lib/translit";
import type { Dims } from "@/lib/parcel";

/* ---------------------------------------------------------------------------
   Booking an international parcel with Ukrposhta.

   THREE CHAINED CALLS, NOT ONE. The API has no "create a shipment from these
   details" endpoint. A shipment references two CLIENTS, a client references an
   ADDRESS, and each is created separately:

       POST /addresses   -> id            (requires a postcode)
       POST /clients     -> uuid          (requires addressId + phoneNumber)
       POST /shipments   -> uuid, barcode (requires sender + recipient)

   So one order costs up to five round trips. The sender's address and client
   are the same every time, so they are made once and cached for the life of
   the process; only the recipient's pair is per-order.

   ── THIS IS THE FIRST THING HERE THAT CHANGES THE PHYSICAL WORLD ──────────
   Quoting is a calculation: it can be run against production all day and
   nothing happens. This creates a real parcel with a real label and a real
   charge against the account. So it is gated three times over, and all three
   must pass:

     1. ukrposhtaEnabled()      — the carrier is switched on at all
     2. UKRPOSHTA_BOOKING=on    — booking specifically, separate from quoting
     3. senderPostcode()        — throws unless a real postcode is configured

   Gate 2 exists because gate 1 is already open in production for pricing. If
   booking rode on the same switch, deploying this file would have started
   creating real parcels on the next paid order, with no separate decision
   taken. Turning on quoting and turning on booking are different decisions and
   they get different switches.
--------------------------------------------------------------------------- */

/**
 * The customs classification for what is in the box — Ukraine's УКТЗЕД code.
 *
 * NO DEFAULT, AND THERE MUST NEVER BE ONE. Sandbox proved this is required on
 * EVERY international booking, not only the United States: without it the API
 * answers "fields [hsCode] in object parcelItems should be filled", and with a
 * plausible-looking invention it answers "you have entered a non-existent HS
 * code". A well-formed guess is not the same as a correct one, and this number
 * goes on a customs declaration attached to a real parcel — the wrong one
 * risks a hold, a penalty or a seizure, none of which are ours to gamble with.
 *
 * It comes from Mario's Ukrposhta manager or accountant, and until it does,
 * booking fails closed with this explanation rather than shipping a guess.
 */
/**
 * The УКТЗЕД classification for everything this shop sends.
 *
 * 9614 00 90 00 — smoking pipes and parts thereof, other. Supplied by Mario on
 * 24 August 2026, and it covers the whole catalogue: the devices, the bowls and
 * the covers are all parts of a smoking pipe, so no line needs its own code.
 *
 * IN CODE RATHER THAN ONLY IN THE ENVIRONMENT, and that is a deliberate change
 * from how this started. It is not a secret — it is a public tariff heading —
 * and it is the same in sandbox and in production, so an environment variable
 * bought nothing but a way for one deployment to differ from another on a value
 * that goes on a customs declaration. Version control is the better home for
 * that: it can be reviewed, and this comment records where it came from.
 *
 * The override remains for the day the classification is corrected, so that can
 * be done without a deploy.
 */
const UKTZED_CODE = "9614009000";

function hsCode(): string {
  const value = process.env.UKRPOSHTA_HS_CODE?.trim() || UKTZED_CODE;

  /* Ten digits, no separators — Ukrposhta checks it against their tariff table
     and rejects anything else. Validated even though the default is known
     good, because the override is hand-typed and a malformed code must fail
     here, with an explanation, rather than as an opaque 400 on a real parcel. */
  if (!/^\d{10}$/.test(value)) {
    throw new UkrposhtaNotConfigured(
      `UKRPOSHTA_HS_CODE is "${value}", which is not a 10-digit УКТЗЕД code. ` +
        "Ukrposhta verifies it against their tariff table, so a malformed one is " +
        `rejected on the parcel. Unset it to fall back to ${UKTZED_CODE}.`
    );
  }
  return value;
}

/** Booking is off unless explicitly turned on. Quoting's switch is separate. */
export function ukrposhtaBookingEnabled(): boolean {
  const raw = process.env.UKRPOSHTA_BOOKING?.trim().toLowerCase();
  return ukrposhtaEnabled() && (raw === "on" || raw === "true");
}

export type ShipmentResult = { uuid: string; barcode: string };

/** Everything the recipient half of a shipment needs, from the order. */
export type RecipientDetails = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  countryIso2: string;
  city: string;
  postcode: string;
  street: string;
  apartment?: string;
};

async function call<T>(path: string, body: unknown, label: string): Promise<T> {
  const url = `${ukrposhtaBaseUrl()}${path}?token=${encodeURIComponent(counterpartyToken())}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ecomBearerForShipments()}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify(body),
  });

  const raw = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(raw);
  } catch {
    /* Non-JSON means a gateway page rather than an answer — the same
       rate-limit nginx 404 the quote path learned about. Never mistaken for a
       business rule. */
    throw new UkrposhtaError(`${label}: HTTP ${res.status}, non-JSON body (gateway or rate limit)`);
  }

  if (!res.ok) {
    const j = json as { code?: string; message?: string };
    /* The API's own message names the offending field. Our payload is NEVER
       echoed — it carries the customer's name, address and phone, and an error
       log is exactly where that should not end up. */
    throw new UkrposhtaError(`${label}: ${j.code ?? res.status} ${String(j.message ?? "").slice(0, 200)}`);
  }
  return json as T;
}

/* ---- The sender, made once ------------------------------------------------
   Cached in module scope. A serverless instance that is recycled simply makes
   it again, which is idempotent enough: Ukrposhta returns a fresh uuid and the
   old one is harmless, being just a directory entry rather than a shipment. */
let senderCache: { clientUuid: string } | null = null;

async function ensureSender(): Promise<{ clientUuid: string }> {
  if (senderCache) return senderCache;

  const sender = await resolveSender();
  const postcode = senderPostcode();

  /* ---- The sender address, made TWICE, and it has to be ------------------

     Post a bare postcode and Ukrposhta fills in the region and city from its
     own index — in Ukrainian, because that is what its index holds. That is
     correct for a domestic parcel and fatal for a foreign one: the shipment
     call refuses with "Shipment's data to Germany should include only latin
     characters at fields: Sender address, Return address".

     So the first call is a LOOKUP. It is the only way to learn what 61204 is
     called without shipping a hardcoded "Kharkiv" that goes wrong the day the
     dispatch office moves. The second call writes the same address back with
     the names transliterated, and that is the one the parcel uses.

     The stranded first record is harmless — an address is a directory entry,
     not a shipment — and this runs once per serverless instance thanks to the
     cache above. */
  const resolved = await call<{ region?: string | null; city?: string | null; district?: string | null }>(
    "/addresses",
    { postcode, country: "UA" },
    "resolve sender address"
  );

  const address = await call<{ id: number }>(
    "/addresses",
    {
      postcode,
      country: "UA",
      /* Transliterated, not translated: Харківська becomes Kharkivska. A
         foreign sorting office needs to be able to read it, and a returned
         parcel needs Ukrposhta to still recognise it. */
      ...(resolved.region ? { region: latinName(resolved.region) } : {}),
      ...(resolved.city ? { city: latinName(resolved.city) } : {}),
      ...(resolved.district ? { district: latinName(resolved.district) } : {}),
      ...(process.env.UKRPOSHTA_SENDER_STREET
        ? { street: latinName(process.env.UKRPOSHTA_SENDER_STREET) }
        : {}),
      ...(process.env.UKRPOSHTA_SENDER_HOUSE ? { houseNumber: process.env.UKRPOSHTA_SENDER_HOUSE } : {}),
    },
    "create sender address"
  );

  /* ---- EDRPOU, which the sender cannot be booked without -----------------

     "Client's field 'EDRPOU' should be filled for sender with type 'COMPANY'".
     The account is a company to Ukrposhta, so the registration code is
     mandatory on the sender — but there is no endpoint that will simply tell
     us what it is: GET /counterparties 404s.

     It comes back on a CREATED CLIENT though, as counterpartyRegcode, so the
     first call here is again a lookup and the second is the real record. That
     is better than putting the number in this file: it is a tax registration
     code, it identifies a person, and source control is not where personal
     identifiers belong. The env override exists for the case where the account
     is ever restructured and the two stop agreeing.

     Both calls are directory writes, not shipments, and the cache above means
     they happen once per serverless instance. */
  const regcode =
    process.env.UKRPOSHTA_SENDER_EDRPOU?.trim() ||
    (
      await call<{ counterpartyRegcode?: string | null }>(
        "/clients",
        {
          counterpartyUuid: counterpartyUuid(),
          addressId: address.id,
          phoneNumber: sender.phone,
          name: sender.name,
          contactPersonName: sender.name,
          latinName: latinName(sender.name),
        },
        "resolve counterparty registration code"
      )
    ).counterpartyRegcode ||
    "";

  const client = await call<{ uuid: string }>(
    "/clients",
    {
      counterpartyUuid: counterpartyUuid(),
      addressId: address.id,
      /* ONLY WHEN IT IS ACTUALLY AN EDRPOU. The account's registration code
         came back as ten digits, which is an РНОКПП — an individual
         entrepreneur's tax number — and Ukrposhta rejects it here with "EDRPOU
         should contain 8-9 digits". Sending it anyway fails the sender
         outright, so it is sent only when it is the right shape and the
         account question is left to be answered by a human. */
      ...(/^\d{8,9}$/.test(regcode) ? { edrpou: regcode } : {}),
      /* COMPANY by default, which is what the counterparty is registered as.
         INDIVIDUAL is the other possibility for a ФОП and needs first/last/
         middle name fields instead of `name` — see the note at the top. */
      type: process.env.UKRPOSHTA_SENDER_CLIENT_TYPE || undefined,
      phoneNumber: sender.phone,
      name: sender.name,
      contactPersonName: sender.name,
      /* Required the moment the destination is in the EU — sandbox refused a
         German parcel with "Sender's 'latinName' should not be empty". Sent
         always rather than kept behind a country list somebody maintains.

         TRANSLITERATED, because the name above is Cyrillic and this field is
         not allowed to be. The sender comes from the Nova Poshta cabinet,
         which holds it in Ukrainian, and sandbox refused the first parcel
         outright: "Client's latinName should contain only latin symbols". The
         Cyrillic stays in `name` and `contactPersonName`, where it belongs —
         it is the real name, and a Ukrainian sorting office should see it. */
      latinName: latinName(sender.name),
    },
    "create sender client"
  );

  senderCache = { clientUuid: client.uuid };
  return senderCache;
}

/* ---- WHAT STILL BLOCKS A REAL INTERNATIONAL PARCEL ------------------------

   Sandbox, 24 August 2026. Booking gets as far as creating the sender and is
   refused there. Two answers are needed and neither is a code change:

   1. THE DISPATCH STREET ADDRESS. A bare postcode is enough for a domestic
      parcel and not for a foreign one — with only an index, the shipment call
      refuses with "Shipment's data to Germany should include only latin
      characters at fields: Sender address, Return address", and supplying a
      Latin street and house number cleared it. UKRPOSHTA_SENDER_STREET and
      UKRPOSHTA_SENDER_HOUSE feed it; both are unset, because inventing a
      return address for real parcels is not something to guess at.

   2. WHAT KIND OF CLIENT THE SENDER IS. The counterparty is registered as a
      COMPANY, so Ukrposhta demands EDRPOU on the sender — but the registration
      code on the account is ten digits (an РНОКПП, i.e. a ФОП's tax number)
      and the same API rejects it: "EDRPOU should contain 8-9 digits". Sending
      the sender as INDIVIDUAL instead gets a third answer, "Cannot save client
      ONLY with latinName if country is Ukraine", which reads as an individual
      needing first/last/middle name fields rather than the single `name` the
      cabinet holds.

      So the account says company, the code says sole trader, and the API will
      not accept the pair. That is a question for the Ukrposhta account
      manager, not something to work around here — a sender misdeclared on a
      customs document is worse than a sender who cannot yet post.

   Everything upstream of this is verified against sandbox: the customs code is
   accepted, the postcode resolves to Kharkiv, and the transliteration
   satisfies the Latin-only check.
--------------------------------------------------------------------------- */

/**
 * Book the parcel. Returns Ukrposhta's uuid and the tracking barcode.
 *
 * NOT IDEMPOTENT ON ITS OWN — the API has no natural key to deduplicate on, so
 * calling this twice creates two parcels. The caller is responsible for not
 * doing that, and does it by writing the uuid onto the order and refusing to
 * book again when one is already there. That check belongs next to the
 * database row, not here.
 */
export async function createShipment(opts: {
  recipient: RecipientDetails;
  weightKg: number;
  dims: Dims;
  declaredValueUah: number;
  deliveryPriceUah: number;
  description: string;
}): Promise<ShipmentResult> {
  if (!ukrposhtaBookingEnabled()) {
    throw new UkrposhtaNotConfigured(
      "Ukrposhta booking is off. Set UKRPOSHTA_BOOKING=on to create real shipments " +
        `(current mode: ${ukrposhtaMode()}).`
    );
  }

  const sender = await ensureSender();
  const r = opts.recipient;

  const recipientAddress = await call<{ id: number }>(
    "/addresses",
    {
      postcode: r.postcode,
      country: r.countryIso2.toUpperCase(),
      city: r.city,
      /* Foreign addresses go in one line by design — the API has a field for
         exactly that, and splitting a German or Japanese address into
         street/house/apartment guesses at a structure it may not have. */
      foreignStreetHouseApartment: [r.street, r.apartment].filter(Boolean).join(", ").slice(0, 200),
    },
    "create recipient address"
  );

  const recipient = await call<{ uuid: string }>(
    "/clients",
    {
      addressId: recipientAddress.id,
      phoneNumber: r.phone,
      firstName: r.firstName,
      lastName: r.lastName,
      /* Latin, because this is what a foreign postal service prints and reads.
         middleName is documented "mandatory for individuals" and is NOT sent:
         a patronymic is a Ukrainian convention and inventing one for a
         customer in Hamburg would put a made-up name on a customs document.
         If the API insists, the error says so and it becomes a real decision
         rather than a silent fabrication. */
      /* Usually already Latin — the recipient is abroad — so this is a no-op
         for most orders. It runs anyway: nothing stops a customer typing their
         name in Cyrillic, and an umlaut or an accent would fail the same
         check. Better folded here than refused on a paid parcel. */
      latinName: latinName(`${r.firstName} ${r.lastName}`),
      email: r.email,
    },
    "create recipient client"
  );

  const shipment = await call<{ uuid: string; barcode: string }>(
    "/shipments",
    {
      sender: { uuid: sender.clientUuid },
      recipient: { uuid: recipient.uuid },
      type: "INTERNATIONAL",
      international: true,
      packageType: "PARCEL",
      transportType: process.env.UKRPOSHTA_TRANSPORT_TYPE === "GROUND" ? "GROUND" : "AVIA",
      categoryType: "SALE_OF_GOODS",
      deliveryType: "W2W",
      /* The shop has been paid already — the parcel must never arrive asking
         the customer for money. postPay stays absent for the same reason. */
      paidByRecipient: false,
      onFailReceiveType: "RETURN",
      weight: Math.max(1, Math.round(opts.weightKg * 1000)),
      length: Math.max(1, Math.ceil(opts.dims.l / 10)),
      width: Math.max(1, Math.ceil(opts.dims.w / 10)),
      height: Math.max(1, Math.ceil(opts.dims.h / 10)),
      declaredPrice: Math.max(1, Math.round(opts.declaredValueUah)),
      deliveryPrice: Math.round(opts.deliveryPriceUah),
      description: opts.description.slice(0, 200),
      /* THE THREE THINGS THE SCHEMA MARKS OPTIONAL AND THE API REFUSES
         WITHOUT, each discovered by being told one at a time:

           parcels[]      "Property 'parcels' can't be null!"
           parcelItems[]  "For package type Parcel parcel items should be filled!"
           internationalData  "International shipment should have internationalData!"

         One parcel per order: this shop's baskets are small and multi-parcel
         splitting is a different problem with its own tracking consequences,
         so it is deliberately not attempted. */
      parcels: [
        {
          weight: Math.max(1, Math.round(opts.weightKg * 1000)),
          length: Math.max(1, Math.ceil(opts.dims.l / 10)),
          width: Math.max(1, Math.ceil(opts.dims.w / 10)),
          height: Math.max(1, Math.ceil(opts.dims.h / 10)),
          declaredPrice: Math.max(1, Math.round(opts.declaredValueUah)),
          parcelItems: [
            {
              name: opts.description.slice(0, 100),
              latinName: latinName(opts.description).slice(0, 100),
              description: opts.description.slice(0, 200),
              countryOfOrigin: "UA",
              quantity: 1,
              weight: Math.max(1, Math.round(opts.weightKg * 1000)),
              value: Math.max(1, Math.round(opts.declaredValueUah)),
              currencyCode: "UAH",
              hsCode: hsCode(),
              parcelItemNumber: 1,
            },
          ],
        },
      ],
      internationalData: {
        avia: process.env.UKRPOSHTA_TRANSPORT_TYPE !== "GROUND",
        transportType: process.env.UKRPOSHTA_TRANSPORT_TYPE === "GROUND" ? "GROUND" : "AVIA",
        categoryType: "SALE_OF_GOODS",
        parcelQuantity: 1,
      },
    },
    "create shipment"
  );

  if (!shipment.uuid) throw new UkrposhtaError("create shipment: no uuid returned");
  return { uuid: shipment.uuid, barcode: shipment.barcode ?? "" };
}
