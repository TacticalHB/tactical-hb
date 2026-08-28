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

/**
 * What kind of client the sender is.
 *
 * PRIVATE_ENTREPRENEUR, because that is what Tactical HB is: a ФОП. Ukrposhta
 * has three types and the documentation is explicit about all three —
 * INDIVIDUAL is a private person, COMPANY a legal entity, PRIVATE_ENTREPRENEUR
 * a sole trader (Документація API 30.06.2026, §3).
 *
 * THE DEFAULT IS WHAT BROKE THIS. Sending no `type` does not mean "let the
 * account decide" — the API defaults it to COMPANY, and a COMPANY is required
 * to carry a ЄДРПОУ. That is the whole of UPE01001: not a missing number, an
 * unstated type. Nothing here was ever set, so every sender we made was a
 * company that could not prove it was one.
 *
 * AND IT IS PERMANENT. «Тип клієнта неможливо змінити» — a client created with
 * the wrong type cannot be corrected, only replaced. Which is why this is a
 * constant with an override rather than an env var that has to be remembered:
 * an unset variable used to produce a silently wrong, permanent record.
 */
function senderClientType(): string {
  return process.env.UKRPOSHTA_SENDER_CLIENT_TYPE?.trim() || "PRIVATE_ENTREPRENEUR";
}

/* ---- The sender, made once ------------------------------------------------
   Cached in module scope. A serverless instance that is recycled simply makes
   it again, which is idempotent enough: Ukrposhta returns a fresh uuid and the
   old one is harmless, being just a directory entry rather than a shipment. */
let senderCache: { clientUuid: string; addressId: number } | null = null;

/**
 * Exported ONLY so the sandbox probe in app/api/dev/ukrposhta-sender can call
 * it. Nothing in the shop should: creating the sender is a step of booking, and
 * booking owns when that happens. The probe exists because the alternative way
 * to test this is to book a real parcel.
 */
export async function ensureSender(): Promise<{ clientUuid: string; addressId: number }> {
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

  /* ---- The sender's tax number ------------------------------------------

     IT NEVER LIVES IN THIS FILE. It is a tax registration code, it identifies
     a person, and source control is not where those belong — hence the env var
     and the read-back rather than a literal.

     WHAT THIS USED TO BE, AND WHY IT WAS WRONG. This posted a throwaway client
     purely to read `counterpartyRegcode` back off the account, then posted the
     real one. Two clients per cold start, one of them stranded — and the
     stranded one was created with no `type`, which the documentation says
     defaults to COMPANY and CANNOT BE CHANGED afterwards. So the workaround
     was quietly littering the account with permanently mistyped clients.

     The lookup stays only as the fallback. UKRPOSHTA_SENDER_TIN is the way in:
     when it is set nothing is created to find out who we are. */
  const tin =
    process.env.UKRPOSHTA_SENDER_TIN?.trim() ||
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
          type: senderClientType(),
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
      /* THE NUMBER GOES IN THE FIELD THAT MATCHES THE TYPE. Ukrposhta keeps
         two, and we spent weeks pushing a sole trader's number into the
         company one:

           edrpou  ЄДРПОУ of a legal entity        digits, 5-8
           tin     ІПН of a person or a ФОП        digits, 10

         A ten-digit code is an РНОКПП, which is a ФОП's, which is `tin`. That
         is why every attempt at `edrpou` came back "should contain 8-9 digits"
         — not a malformed number, the wrong field.

         Still shape-checked before it is sent. The API validates the ІПН by
         checksum and refuses an invalid one, and a refusal that names our
         field is worth more than one that names theirs. */
      ...(/^\d{10}$/.test(tin) ? { tin } : {}),
      type: senderClientType(),
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

  /* THE ADDRESS ID TRAVELS WITH THE CLIENT, and it has to. Naming only the
     sender client on a shipment lets Ukrposhta pick that client's own main
     address — which is the one its index filled in, in Ukrainian. All the
     transliteration above then counts for nothing, and a German parcel is
     refused with "should include only latin characters at fields: Sender
     address, Return address". Carrying the Latin address's id here is what
     lets the shipment ask for it by name. */
  senderCache = { clientUuid: client.uuid, addressId: address.id };
  return senderCache;
}

/* ---- WHAT THE DOCUMENTATION SETTLED, AND WHAT IS LEFT ---------------------

   Both of the questions that blocked this were answered by Ukrposhta's own
   published documentation (dev.ukrposhta.ua/documentation), read 27 August
   2026. Neither needed the account manager; both had been guesses.

   1. THE SENDER'S TYPE AND NUMBER. Settled — see senderClientType() above and
      the `tin` field on the create call. The short version: there is a third
      client type, PRIVATE_ENTREPRENEUR, and a second tax field, `tin`. We were
      sending neither, so the API defaulted us to COMPANY and then asked for the
      ЄДРПОУ a company must have. "EDRPOU should contain 8-9 digits" was never
      about the number being malformed; it was the wrong field.

   2. THE DISPATCH STREET ADDRESS. Settled, and the answer is that it is NOT
      required. Табл. 2.1 of the international documentation marks only
      `country` and `postcode` as mandatory — `region`, `district`, `city`,
      `street` and `houseNumber` are all optional. The 61204 index is enough,
      and UKRPOSHTA_SENDER_STREET / _HOUSE stay optional refinements rather
      than the missing piece they were thought to be.

      What IS mandatory is the alphabet: «Всі поля адреси в міжнародному
      відправленні необхідно заповнювати латинськими літерами». Transliteration
      is ours to do, which is what the two-call dance above already does, and
      `senderAddressId` exists precisely so a Latin address can be chosen for an
      international parcel. The workaround turns out to be the intended design.

   THE TEN-DIGIT QUESTION IS SETTLED, AND BY THE API. The two documents disagree
   on the length of a ФОП's ІПН — the domestic one (30.06.2026), which owns the
   /clients table, says «тільки цифри, 10 символів» for people and sole traders
   alike; the international one (23.07.2026) says 10 for a person and 12 for a
   sole trader. Ten was taken, on the reasoning that a Ukrainian РНОКПП is ten
   digits and no twelve-digit personal tax number exists. Production accepted it:
   the created client reads back type PRIVATE_ENTREPRENEUR with a ten-digit tin
   and no edrpou. The international document is wrong on this point.

   PROVEN AGAINST PRODUCTION ON 27 AUGUST 2026, not merely against the spec.
   /api/dev/ukrposhta-sender created the sender on the live account and a
   read-back confirmed the type and the field. Sandbox could not be used: its
   bearer has expired and answers every call, real or fake, with the same 401.

   What is still unproven is everything AFTER the sender — the shipment call
   itself has never run. Booking stays behind UKRPOSHTA_BOOKING.
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
      /* THE RECIPIENT IS A PERSON, AND HAS TO SAY SO. Same trap the sender fell
         into: sending no `type` does not mean "unspecified", it means COMPANY,
         and a COMPANY must carry a ЄДРПОУ or an ІПН. The documentation is
         precise about when that bites — «Якщо жодне з цих полів не заповнено,
         виникне помилка при створенні відправлення» — so a defaulted recipient
         does not fail here, it fails later, on the shipment, pointing at a
         field nobody set.

         INDIVIDUAL is neither a legal entity nor a sole trader, so the tax
         number requirement does not apply — which is correct anyway: a customer
         in Hamburg has no Ukrainian tax number to give. */
      type: "INDIVIDUAL",
      phoneNumber: r.phone,
      firstName: r.firstName,
      lastName: r.lastName,
      /* Latin, because this is what a foreign postal service prints and reads.
         middleName is NOT sent, and the documentation agrees it need not be:
         Табл. 3.1 marks it optional (Ні). An earlier note here said it was
         mandatory for individuals, which was a guess. It would be wrong to send
         anyway — a patronymic is a Ukrainian convention, and inventing one for
         a customer in Hamburg would put a made-up name on a customs document. */
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
      /* PICK THE LATIN ADDRESS EXPLICITLY. The documentation says this field
         exists for exactly this: «При створенні міжнародного відправлення
         дозволяє вибрати адресу латиною». Without it the client's main address
         wins, in Cyrillic, and Germany is refused. */
      senderAddressId: sender.addressId,
      recipientAddressId: recipientAddress.id,
      /* AND THE RETURN ADDRESS, WHICH IS A SEPARATE FIELD AND A SEPARATE
         FAILURE. Left out, it falls back to «основна адреса, у якої поле main
         має значення true» — and the error names it separately from the sender
         for a reason: they are resolved separately, so fixing one leaves the
         other Cyrillic. A returned parcel comes back to the same door it left,
         so this is the same Latin address either way. */
      returnAddressId: sender.addressId,
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
