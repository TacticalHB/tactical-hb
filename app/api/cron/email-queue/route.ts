import { NextRequest, NextResponse } from "next/server";
import { runDueJobs } from "@/lib/email/flows";
import { runWholesaleDormant } from "@/lib/wholesale-dormant";

/* ---------------------------------------------------------------------------
   Cron: send whatever the email flows have become due.

   The queue's only mover. Everything else in the system writes rows with a
   future `send_after`; this route is what turns them into mail.

   HOW OFTEN IT NEEDS TO RUN, AND WHY IT DOES NOT. C1 is specified at one hour
   after the bag was last touched, so the sweep has to be at least hourly for
   that number to mean anything. It is not: vercel.json asks for 07:00 daily.

   THAT IS NOT A PREFERENCE, IT IS THE PLAN. Hobby allows 100 cron jobs but a
   minimum interval of once per day, and an expression that would run more
   often does not get quietly downgraded — it FAILS THE DEPLOYMENT with
   "Hobby accounts are limited to daily cron jobs". An every-fifteen-minutes
   expression here took the whole site's deploy down once; do not put a
   sub-daily one back without checking the plan first. (Hobby precision is
   also ±59 minutes, so even the hour is a suggestion.)

   SO ON HOBBY A CART MAIL ARRIVES ON THE NEXT MORNING'S RUN, not at +1h.
   Nothing is lost — the jobs are durable, and the +1h/+24h/+72h offsets still
   decide the ORDER and the eligibility, only the delivery moment slips. Two
   ways to get the real timing: Pro (once-per-minute) or any external pinger
   with the bearer token, which costs nothing. See docs/email-flows.md.

   THE BATCH IS THE OTHER SIDE OF THAT COIN: 25 sends per run is 25 mails a
   day on Hobby. Ample now, and the number to raise first if the list grows —
   the ceiling is maxDuration, not the queue.

   SAFE TO CALL AS OFTEN AS YOU LIKE, AND SAFE TO OVERLAP. Claiming happens
   inside the database with FOR UPDATE SKIP LOCKED, so a second invocation
   arriving while the first is still working steps over the rows it holds
   instead of sending them twice.

   FAILS CLOSED, like the other cron route: with CRON_SECRET unset nobody can
   run it, and an unauthorised caller gets a bare 404 rather than a 401 so a
   stranger probing the path cannot confirm it exists. This one can send mail
   to customers, which makes that mandatory rather than tidy.
--------------------------------------------------------------------------- */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Twenty-five sends against a third-party API needs more than the default 10s. */
export const maxDuration = 60;

function authorised(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // unset → nobody, never everybody

  const header = request.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

async function run(request: NextRequest) {
  if (!authorised(request)) {
    console.warn("[cron/email-queue] refused an unauthorised request");
    return new NextResponse("Not found", { status: 404 });
  }

  const result = await runDueJobs(25);

  /* The wholesale dormant scan rides the same sweep. It is a SCAN rather than
     a queued flow — nothing triggers it, a pass simply asks who has gone quiet
     — so it has no rows in email_jobs and runs beside them instead.

     SECOND, and awaited separately: the customer queue is the one with time
     pressure, and a partner letter must never be the reason a welcome mail
     misses its window. Neither throws, so one failing still lets the other
     through. */
  const dormant = await runWholesaleDormant();

  console.log("[cron/email-queue]", JSON.stringify({ ...result, dormant }));
  return NextResponse.json({ ok: true, ...result, dormant });
}

export async function GET(request: NextRequest) {
  return run(request);
}

/** So an external scheduler that prefers POST works without a second route. */
export async function POST(request: NextRequest) {
  return run(request);
}
