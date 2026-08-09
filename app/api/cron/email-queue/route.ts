import { NextRequest, NextResponse } from "next/server";
import { runDueJobs } from "@/lib/email/flows";

/* ---------------------------------------------------------------------------
   Cron: send whatever the email flows have become due.

   The queue's only mover. Everything else in the system writes rows with a
   future `send_after`; this route is what turns them into mail.

   HOW OFTEN IT NEEDS TO RUN, AND WHAT THAT DEPENDS ON. C1 is specified at one
   hour after the bag was last touched, so the sweep has to be at least hourly
   for that number to mean anything — vercel.json asks for every fifteen
   minutes. Vercel's Hobby plan interprets a cron expression but only invokes
   it once a day, so on Hobby the first cart mail arrives on the next daily
   run, not at +1h. Nothing breaks and nothing is lost — jobs are durable and
   send late rather than never — but the timing in the brief is a Pro-plan
   timing. Any external pinger (GitHub Actions, cron-job.org, Supabase pg_cron)
   hitting this path with the bearer token gives the same result without the
   upgrade. See docs/email-flows.md.

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
  console.log("[cron/email-queue]", JSON.stringify(result));
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(request: NextRequest) {
  return run(request);
}

/** So an external scheduler that prefers POST works without a second route. */
export async function POST(request: NextRequest) {
  return run(request);
}
