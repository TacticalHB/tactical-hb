import { NextResponse } from "next/server";
import { ensureSender } from "@/lib/ukrposhta-shipment";
import { ukrposhtaMode, ukrposhtaBaseUrl } from "@/lib/ukrposhta";

export const runtime = "nodejs";

/* ---------------------------------------------------------------------------
   Does the sender actually register? — the one question, asked on its own.

   WHY THIS EXISTS. Creating the sender client is a step inside booking, and
   for weeks it was the step that failed. The only way to exercise it was to
   attempt a real parcel, which is a bad way to test a thing that has already
   been wrong three times. This calls that step and nothing after it: no
   shipment is created, nothing is paid for, nothing is posted.

   IT REFUSES TO RUN AGAINST PRODUCTION. Not because the call is dangerous —
   it writes a directory entry, not a parcel — but because a client's type
   cannot be changed once created, so a probe run against the live account
   would leave a permanent record behind. Sandbox is where a mistake can be
   thrown away.

   404 in production for the same reason every other dev route is.

   READING A 401 FROM THIS. It is not the sender, and it is not this code —
   it is the credential. Checked on 27 August 2026, the sandbox gateway
   answers our bearer, an all-zeros fake bearer, no Authorization header at
   all, and a path that cannot exist with the SAME
   `{"error":"unauthorized","error_description":"Unauthorized - invalid or
   missing token"}`. It rejects at the door, before routing, so a 401 here
   says nothing whatsoever about the request body. When the sandbox eCom
   bearer is renewed, run this again; until then nothing downstream of auth
   can be exercised.
--------------------------------------------------------------------------- */

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not found", { status: 404 });
  }

  const mode = ukrposhtaMode();
  if (mode !== "sandbox") {
    return NextResponse.json(
      {
        ok: false,
        refused: "This probe only runs in sandbox.",
        why: "A client's type cannot be changed after creation, so a run against production leaves a permanent record. Set UKRPOSHTA_API_MODE=sandbox.",
        mode,
      },
      { status: 409 }
    );
  }

  const started = Date.now();
  try {
    const { clientUuid } = await ensureSender();
    return NextResponse.json({
      ok: true,
      mode,
      host: ukrposhtaBaseUrl(),
      clientUuid,
      ms: Date.now() - started,
    });
  } catch (err) {
    /* The message only. Ukrposhta's errors name the field they rejected, which
       is the whole value here; the payload behind them carries the sender's
       name and phone and is never echoed. */
    return NextResponse.json(
      {
        ok: false,
        mode,
        host: ukrposhtaBaseUrl(),
        error: err instanceof Error ? err.message : String(err),
        ms: Date.now() - started,
      },
      { status: 502 }
    );
  }
}
