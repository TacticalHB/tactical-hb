import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { trackParcels, TRACK_BATCH_MAX, type ParcelStage } from "@/lib/nova-poshta-tracking";
import { buildShippedEmail } from "@/lib/shipping-email";
import { sendMail } from "@/lib/email";
import { ADMIN_EMAIL } from "@/lib/contact-info";

/* ---------------------------------------------------------------------------
   Advancing order status from Nova Poshta tracking, and telling the customer
   when a parcel ships.

   Run from a cron endpoint. Two rules keep it from doing harm:

   1. STATUS ONLY MOVES FORWARD. paid < processing < shipped < delivered. Nova
      Poshta occasionally reports an earlier state (a rescan, a returned parcel
      re-entering the network), and a delivered order must never be walked back
      to "on its way" — the customer has the box in their hands.

   2. THE EMAIL IS CLAIMED, NOT JUST SENT. shipped_email_at is taken with a
      conditional update before the message goes out, so two overlapping runs
      cannot both mail the same customer. Webhooks and crons both retry; "we
      already sent it" has to be a fact in the database, not an assumption.

   Nothing here throws. A tracking outage means statuses lag by one run, which
   is the correct failure: the parcel is moving whether or not we can see it.
--------------------------------------------------------------------------- */

/** How many orders one run will look at. One API call covers 100. */
const RUN_LIMIT = TRACK_BATCH_MAX;

const RANK: Record<string, number> = { paid: 0, processing: 1, shipped: 2, delivered: 3 };

type TrackableOrder = {
  id: string;
  external_ref: string | null;
  email: string | null;
  locale: string | null;
  status: string;
  np_ttn: string;
  np_city_name: string | null;
  np_warehouse_name: string | null;
  np_address: string | null;
  np_delivery_type: string | null;
  shipped_email_at: string | null;
  delivery: Record<string, string> | null;
};

export type TrackingRunResult = {
  checked: number;
  shipped: number;
  delivered: number;
  emailed: number;
  errors: number;
};

/** Where the parcel is going, as the customer should read it. */
function addressLines(o: TrackableOrder): string[] {
  const d = o.delivery ?? {};
  const name = [d.firstName, d.surname].filter(Boolean).join(" ");
  const courier = o.np_delivery_type === "courier";
  return [name, o.np_city_name ?? "", (courier ? o.np_address : o.np_warehouse_name) ?? ""];
}

/** The status a stage implies, or null when it implies nothing. */
function targetStatus(stage: ParcelStage): "shipped" | "delivered" | null {
  if (stage === "in_transit") return "shipped";
  if (stage === "delivered") return "delivered";
  return null; // created / unknown — leave the order alone
}

/**
 * Send the shipping notification, once.
 *
 * Claims shipped_email_at first: the update only matches while the column is
 * still null, so the loser of a race sends nothing. If the mail then fails the
 * claim is released, because a claim that outlives a failed send would silence
 * the notification permanently.
 */
async function sendShippedEmail(o: TrackableOrder): Promise<boolean> {
  if (!o.email) {
    console.warn("[tracking] no email on order", o.id, "— cannot notify");
    return false;
  }

  const admin = createAdminClient();
  const { data: claimed, error: claimErr } = await admin
    .from("orders")
    .update({ shipped_email_at: new Date().toISOString() })
    .eq("id", o.id)
    .is("shipped_email_at", null) // ← the guard: only one caller can match
    .select("id")
    .maybeSingle();

  if (claimErr) {
    console.error("[tracking] could not claim the shipping email:", claimErr.code, claimErr.message);
    return false;
  }
  if (!claimed) return false; // already sent by another run

  const { subject, html, text } = buildShippedEmail({
    reference: o.external_ref ?? o.id.slice(0, 8).toUpperCase(),
    ttn: o.np_ttn,
    locale: o.locale ?? "uk",
    addressLines: addressLines(o),
  });

  const result = await sendMail({
    to: o.email,
    from: `Tactical HB <${ADMIN_EMAIL}>`,
    replyTo: ADMIN_EMAIL,
    subject,
    html,
    text,
  });

  if (!result.ok) {
    console.error("[tracking] shipping email failed for", o.external_ref, result.error);
    // Release the claim so the next run can try again.
    await admin.from("orders").update({ shipped_email_at: null }).eq("id", o.id);
    return false;
  }

  console.log("[tracking] shipping email sent for", o.external_ref, "to", o.email);
  return true;
}

/**
 * One tracking pass. Safe to call repeatedly; never throws.
 */
export async function runTracking(): Promise<TrackingRunResult> {
  const out: TrackingRunResult = { checked: 0, shipped: 0, delivered: 0, emailed: 0, errors: 0 };
  const admin = createAdminClient();

  // Only parcels still in flight. Delivered and cancelled orders are finished,
  // and asking about them again would be the bulk of the API traffic.
  const { data, error } = await admin
    .from("orders")
    .select(
      "id, external_ref, email, locale, status, np_ttn, np_city_name, np_warehouse_name, np_address, np_delivery_type, shipped_email_at, delivery"
    )
    .not("np_ttn", "is", null)
    .in("status", ["processing", "shipped"])
    .order("created_at", { ascending: true })
    .limit(RUN_LIMIT);

  if (error) {
    console.error("[tracking] could not list orders:", error.code, error.message);
    out.errors += 1;
    return out;
  }

  const orders = (data ?? []) as TrackableOrder[];
  if (orders.length === 0) return out;

  let tracked;
  try {
    tracked = await trackParcels(orders.map((o) => ({ number: o.np_ttn, phone: o.delivery?.phone })));
  } catch (e) {
    // Nova Poshta unreachable — try again next run.
    console.error("[tracking] Nova Poshta lookup failed:", e);
    out.errors += 1;
    return out;
  }

  const byNumber = new Map(tracked.map((t) => [t.number, t]));
  const now = new Date().toISOString();

  for (const o of orders) {
    const t = byNumber.get(o.np_ttn);
    if (!t) {
      console.warn("[tracking] no tracking row for", o.np_ttn);
      continue;
    }
    out.checked += 1;

    const patch: Record<string, unknown> = {
      np_status_code: t.statusCode,
      np_status_checked_at: now,
    };

    const target = targetStatus(t.stage);
    const advances = target !== null && (RANK[target] ?? 0) > (RANK[o.status] ?? 0);
    if (advances) patch.status = target;

    if (t.stage === "unknown") {
      // Deleted, unrecognised, or a number Nova Poshta doesn't know. Recorded
      // for diagnosis but never acted on.
      console.warn("[tracking]", o.external_ref, "unmapped status", t.statusCode, "—", t.status);
    }

    const { error: upErr } = await admin.from("orders").update(patch).eq("id", o.id);
    if (upErr) {
      console.error("[tracking] update failed for", o.external_ref, upErr.code, upErr.message);
      out.errors += 1;
      continue;
    }

    if (!advances) continue;

    if (target === "shipped") {
      out.shipped += 1;
      if (await sendShippedEmail(o)) out.emailed += 1;
    } else if (target === "delivered") {
      out.delivered += 1;
      // Straight from processing to delivered means the parcel was collected
      // between two runs. Sending "on its way" now would be worse than silence,
      // so the notification is skipped — and deliberately NOT marked as sent.
      if (!o.shipped_email_at) {
        console.log("[tracking]", o.external_ref, "reached delivered without a shipping email — skipped as stale");
      }
    }
  }

  console.log("[tracking] run:", JSON.stringify(out));
  return out;
}
