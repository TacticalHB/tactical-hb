import { NextResponse } from "next/server";
import { createShipment } from "@/lib/ukrposhta-shipment";
import { fetchShipmentForm, PARCEL_FORMS } from "@/lib/ukrposhta-forms";
import { trackUkrposhtaParcels } from "@/lib/ukrposhta-tracking";
import {
  ukrposhtaMode,
  ukrposhtaBaseUrl,
  counterpartyToken,
  ecomBearerForShipments,
} from "@/lib/ukrposhta";

export const runtime = "nodejs";

/* ---------------------------------------------------------------------------
   Book a parcel, pull its customs paperwork, ask where it is, delete it.

   THE WHOLE POINT IS THE ORDER. A label can only be rendered for a shipment
   that exists, and tracking can only be asked about a barcode — so proving
   either one needs a real parcel, briefly. It is created, used, and removed in
   one request, and Ukrposhta allows that while the status is CREATED.

   TRACKING IS EXPECTED TO SAY "NOT FOUND", AND THAT IS THE PASS CONDITION.
   «Відправлення потрапляє до системи відстеження лише після реєстрації у
   відділенні» — a parcel that has never crossed a counter is not in the
   tracking system. A notFound answer proves the bearer, the host and the
   parsing all work; a delivered answer would mean something is very wrong.

   Dev-only, 404 in production builds, and the confirmation has to be spelled.
--------------------------------------------------------------------------- */

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
  if (new URL(req.url).searchParams.get("confirm") !== "book-and-delete-one-real-parcel") {
    return NextResponse.json(
      {
        ok: false,
        refused: "This books a real shipment to fetch its forms. Say so explicitly.",
        toProceed: "?confirm=book-and-delete-one-real-parcel",
        mode: ukrposhtaMode(),
      },
      { status: 409 }
    );
  }

  const started = Date.now();
  let booked: { uuid: string; barcode: string } | null = null;
  let error: string | null = null;
  const forms: Record<string, string> = {};
  let tracking: unknown = null;

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
      description: "Clay hookah bowl",
    });

    /* By barcode rather than uuid — that is what an order carries, so it is
       what the real caller will pass. */
    const saveTo = new URL(req.url).searchParams.get("saveTo");
    for (const form of PARCEL_FORMS) {
      try {
        const { bytes, contentType } = await fetchShipmentForm(booked.barcode, form);
        forms[form] = `${bytes.length} bytes, ${contentType}, starts %PDF`;
        /* `saveTo` exists so the PDF can be LOOKED AT. "308KB starting %PDF" says
           a document came back; it does not say the barcode on it is this
           parcel's, or that the addresses are the right way round. Dev-only,
           and the parcel is deleted seconds later either way. */
        if (saveTo) {
          const { writeFile } = await import("node:fs/promises");
          const path = `${saveTo.replace(/\/$/, "")}/${booked.barcode}-${form}.pdf`;
          await writeFile(path, bytes);
          forms[form] += ` → ${path}`;
        }
      } catch (e) {
        forms[form] = `FAILED — ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    try {
      tracking = await trackUkrposhtaParcels([booked.barcode]);
    } catch (e) {
      tracking = { error: e instanceof Error ? e.message : String(e) };
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  let cleanup: string | null = null;
  if (booked?.uuid) {
    try {
      cleanup = await deleteShipment(booked.uuid);
    } catch (e) {
      cleanup = `DELETE THREW — ${e instanceof Error ? e.message : String(e)}`;
    }
    console.info(`[ukrposhta] forms probe ${booked.barcode}: ${cleanup}`);
  }

  return NextResponse.json(
    {
      ok: !error,
      mode: ukrposhtaMode(),
      shipment: booked,
      forms,
      tracking,
      trackingNote:
        "notFound is the PASS here — a parcel that has never been lodged is not in the tracking system.",
      cleanup,
      error,
      ms: Date.now() - started,
    },
    { status: error ? 502 : 200 }
  );
}
