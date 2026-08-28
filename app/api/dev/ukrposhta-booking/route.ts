import { NextResponse } from "next/server";
import { createShipment } from "@/lib/ukrposhta-shipment";
import { ukrposhtaMode, ukrposhtaBaseUrl, counterpartyToken, ecomBearerForShipments } from "@/lib/ukrposhta";

export const runtime = "nodejs";

/* ---------------------------------------------------------------------------
   Book one parcel, read it back, then delete it.

   WHY THIS CAN BE DONE AT ALL. Ukrposhta lets a shipment be removed while it
   has never been lodged: «Відправлення можливо видалити тільки, якщо його
   status – CREATED». So a booking made and deleted in the same request is a
   draft that briefly existed, not a parcel — provided nothing is ever handed
   over at a counter. That is the entire safety margin here, and it is why this
   deletes in a `finally` rather than at the end of the happy path.

   WHAT IT STILL LEAVES. Deleting the shipment does not delete the recipient
   address or the recipient client created to carry it; the API has no cascade.
   Those are directory rows, and the response says so rather than pretending
   the account is untouched.

   THE RECIPIENT IS OBVIOUSLY FAKE, ON PURPOSE. A real address on a customs
   declaration — even a deleted one — is somebody's home. The name is TEST TEST
   and the street says what it is.

   Dev-only, 404 in production builds, and production mode needs the same
   spelled-out confirmation the sender probe needs.
--------------------------------------------------------------------------- */

/** Delete by uuid. Only works while status is CREATED, which is the point. */
async function deleteShipment(uuid: string): Promise<string> {
  const url = `${ukrposhtaBaseUrl()}/shipments/${uuid}?token=${encodeURIComponent(counterpartyToken())}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${ecomBearerForShipments()}` },
    cache: "no-store",
  });
  return res.ok ? `deleted (${res.status})` : `NOT DELETED — ${res.status} ${(await res.text()).slice(0, 160)}`;
}

export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not found", { status: 404 });
  }

  const mode = ukrposhtaMode();
  const confirmed =
    new URL(req.url).searchParams.get("confirm") === "book-and-delete-one-real-parcel";
  if (!confirmed) {
    return NextResponse.json(
      {
        ok: false,
        refused: "This books a real shipment. Say so explicitly.",
        toProceed: "?confirm=book-and-delete-one-real-parcel",
        note: "It is deleted immediately; the recipient address and client it creates are not.",
        mode,
      },
      { status: 409 }
    );
  }

  const started = Date.now();
  let booked: { uuid: string; barcode: string } | null = null;
  let bookError: string | null = null;

  try {
    booked = await createShipment({
      recipient: {
        firstName: "TEST",
        lastName: "TEST",
        phone: "+491700000000",
        email: "test@example.invalid",
        countryIso2: "DE",
        city: "Berlin",
        postcode: "10115",
        street: "TEST PARCEL DO NOT DELIVER 1",
      },
      weightKg: 0.5,
      dims: { l: 200, w: 150, h: 100 },
      declaredValueUah: 500,
      deliveryPriceUah: 0,
      /* NOT "TEST". Ukrposhta rejects a vague attachment description outright —
         «Please describe the attachment in more detail. For example, 'wooden
         toy'» — because this line goes on the customs declaration. It has to
         read like the thing actually in the box even on a parcel that will be
         deleted a second later. */
      description: "Clay hookah bowl",
    });
  } catch (err) {
    bookError = err instanceof Error ? err.message : String(err);
  }

  /* DELETE BEFORE REPORTING, AND REPORT THE RESULT. A probe that says "booked!"
     and leaves the caller wondering whether the parcel is still there has done
     half a job. This runs whether the booking threw afterwards or not — if a
     uuid came back, something exists and it has to go. */
  let cleanup: string | null = null;
  if (booked?.uuid) {
    try {
      cleanup = await deleteShipment(booked.uuid);
    } catch (e) {
      cleanup = `DELETE THREW — ${e instanceof Error ? e.message : String(e)}`;
    }
    console.info(`[ukrposhta] test parcel ${booked.barcode} (${booked.uuid}): ${cleanup}`);
  }

  return NextResponse.json(
    {
      ok: !bookError,
      mode,
      host: ukrposhtaBaseUrl(),
      shipment: booked,
      cleanup,
      error: bookError,
      /* Deleting the shipment does not remove these — the API has no cascade.
         Said plainly so nobody reads "deleted" as "the account is as it was". */
      alsoLeftBehind: booked
        ? "the recipient address and recipient client created for it"
        : null,
      ms: Date.now() - started,
    },
    { status: bookError ? 502 : 200 }
  );
}
