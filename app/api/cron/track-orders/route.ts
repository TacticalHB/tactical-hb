import { NextRequest, NextResponse } from "next/server";
import { runTracking } from "@/lib/order-tracking";

/* ---------------------------------------------------------------------------
   Cron: refresh Nova Poshta statuses and send shipping notifications.

   Scheduled in vercel.json. Vercel calls it with the CRON_SECRET as a bearer
   token, which is checked here — the route can send email and write order
   status, so it must not be open to anyone who guesses the path.

   WHY 18:00 UTC (≈21:00 Kyiv). The Hobby plan allows one run a day, so the hour
   decides what the run can see. Parcels handed to Nova Poshta during the working
   day are in transit by the evening but rarely delivered yet, so an evening run
   catches the "shipped" transition — and therefore sends the shipping email —
   before the parcel can reach the customer. A morning run would more often find
   same-city parcels already delivered, skipping straight past shipped and
   leaving the customer without a notification.

   FAILS CLOSED. With CRON_SECRET unset nobody can run it, the same rule the
   admin allowlist follows: a missing env var must never hand out access. The
   refusal is a bare 404 rather than a 401, so a stranger probing the path
   cannot even confirm the endpoint exists.
--------------------------------------------------------------------------- */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Tracking a full batch plus its emails needs more than the default 10s. */
export const maxDuration = 60;

function authorised(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // unset → nobody, never everybody

  const header = request.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authorised(request)) {
    console.warn("[cron/track-orders] refused an unauthorised request");
    return new NextResponse("Not found", { status: 404 });
  }

  // runTracking never throws — it reports what it managed to do.
  const result = await runTracking();
  return NextResponse.json({ ok: true, ...result });
}
