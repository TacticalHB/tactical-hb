import { NextRequest, NextResponse } from "next/server";
import { runTracking } from "@/lib/order-tracking";
import { runStockAlert } from "@/lib/stock-alert";
import { runWeeklyBrief } from "@/lib/weekly-brief";
import { runMarginGuard } from "@/lib/margin-admin";

/* ---------------------------------------------------------------------------
   Cron: the daily operations run — Nova Poshta statuses, shipping
   notifications, the low-stock warning, and (Mondays) the margin check and
   the weekly brief.

   FOUR JOBS, ONE SCHEDULE, and the path still says track-orders. The Hobby
   plan allows a single cron run a day and this route owns it; a second entry
   in vercel.json would never fire, which is worse than not adding one, because
   it would look configured. Tracking runs first — a parcel the customer is
   waiting on outranks a shelf the customer cannot see — the stock scan
   follows, and on Kyiv Mondays the Cost & Margin Guard and then the Commander
   Brief run on the same authorised request (the 21:00 Kyiv hour makes it a
   Monday-evening brief). Renaming the path is left to Phase E of the OS plan,
   when the admin routes are reorganised anyway.

   NOTHING SCHEDULED HERE WRITES TO A CUSTOMER OR A PARTNER. The shipping
   notification answers a parcel that moved; the stock alert and the brief go
   to the shop's own address. The follow-up send gate is deliberately absent
   and must stay absent — §6.3 allows a partner letter only behind an explicit
   human approval, and a cron job is the exact opposite of one.

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

  // None of these throws — each reports what it managed to do. Awaited in
  // sequence rather than in parallel so a slow Nova Poshta batch cannot push
  // the others past maxDuration together, and so the logs read in order.
  const tracking = await runTracking();
  const stock = await runStockAlert();

  const kyivWeekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Kyiv",
    weekday: "short",
  }).format(new Date());
  const isMonday = kyivWeekday === "Mon";

  // The Commander Brief writes itself on Kyiv Mondays (plan §6.5). Internal
  // mail to the shop's own address — the founder's briefing, nobody else's.
  const brief = isMonday
    ? await runWeeklyBrief({ trigger: "cron", createdBy: "system", sendEmail: true })
    : null;

  // The Cost & Margin Guard checks the last full month (plan §6.2). It writes
  // one agent_runs row and sends nothing — the report is read on /admin/margin.
  //
  // AFTER the brief, and the order is the whole decision. maxDuration is 60s
  // and the Hobby plan will not allow more, so on a slow Nova Poshta Monday
  // something could be cut off; whatever runs last is what gets cut. A missed
  // brief is a missed EMAIL — the one artefact here that actually reaches the
  // founder, and it will not retry until next Monday. A missed margin row is
  // recoverable in two clicks on /admin/margin, and re-runs by itself next
  // week. So the email is protected and the report takes the risk.
  //
  // If the brief ever grows a margin line it will read whatever row exists,
  // which under this order is LAST Monday's. That is the moment to flip these
  // two back — not before, because today there is no data dependency, only a
  // hypothetical one.
  //
  // Re-reporting the same month every Monday is the point rather than a flaw:
  // unit costs and supplier invoices arrive late, so each rerun is a truer
  // picture than the last, and the page timestamps every run so a figure that
  // moved is visible as having moved.
  const margin = isMonday
    ? await runMarginGuard({ trigger: "cron", createdBy: "system" })
    : null;

  return NextResponse.json({ ok: true, ...tracking, stock, margin, brief });
}
