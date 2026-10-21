import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { trackParcels, TRACK_BATCH_MAX, type ParcelStage } from "@/lib/nova-poshta-tracking";
import { trackUkrposhtaParcels, UKRPOSHTA_TRACK_BATCH_MAX } from "@/lib/ukrposhta-tracking";
import { ukrposhtaEnabled } from "@/lib/ukrposhta";
import { buildShippedEmail } from "@/lib/shipping-email";
import { scheduleP1 } from "@/lib/email/flows";
import { sendMail } from "@/lib/email";
import { ADMIN_EMAIL } from "@/lib/contact-info";
import { stampOrderStep } from "@/lib/order-steps";

/* ---------------------------------------------------------------------------
   Advancing order status from carrier tracking, and telling the customer when
   a parcel ships.

   Run from a cron endpoint. Two rules keep it from doing harm:

   1. STATUS ONLY MOVES FORWARD. paid < processing < shipped < delivered. A
      carrier occasionally reports an earlier state (a rescan, a returned parcel
      re-entering the network), and a delivered order must never be walked back
      to "on its way" — the customer has the box in their hands.

   2. THE EMAIL IS CLAIMED, NOT JUST SENT. shipped_email_at is taken with a
      conditional update before the message goes out, so two overlapping runs
      cannot both mail the same customer. Webhooks and crons both retry; "we
      already sent it" has to be a fact in the database, not an assumption.

   ── TWO CARRIERS, TWO PASSES ──────────────────────────────────────────────
   Nova Poshta and Ukrposhta are asked separately, in that order, and neither
   can stop the other: a Nova Poshta outage must not leave an international
   parcel untracked, and an Ukrposhta credential problem must not silence the
   domestic shipping emails. Everything after the lookup — the forward-only
   rank, the claimed email, the stale-delivery skip — is the same code for
   both, because those rules are about ORDERS and have nothing to do with who
   is carrying the box.

   WHAT IS NOT SHARED IS THE VOCABULARY. The two carriers report different
   codes into different columns (np_status_code, ukrposhta_status_code) and
   each module maps its own codes to the shared ParcelStage. This file never
   sees a raw status code it has to interpret.

   Nothing here throws. A tracking outage means statuses lag by one run, which
   is the correct failure: the parcel is moving whether or not we can see it.
--------------------------------------------------------------------------- */

const RANK: Record<string, number> = { paid: 0, processing: 1, shipped: 2, delivered: 3 };

/** Columns both passes need. One list, so the two cannot drift apart. */
const ORDER_COLUMNS =
  "id, external_ref, email, locale, status, shipping_method, shipping_carrier, " +
  "np_ttn, np_city_name, np_warehouse_name, np_address, np_delivery_type, " +
  "ukrposhta_barcode, shipped_email_at, delivery, np_status_code";

type TrackableOrder = {
  id: string;
  external_ref: string | null;
  email: string | null;
  locale: string | null;
  status: string;
  /** The DESTINATION MODE — 'nova_poshta' (a branch in Ukraine) or 'international'. */
  shipping_method: string | null;
  /** WHO IS CARRYING IT. Null on orders placed before migration 0028; those went by Nova Poshta. */
  shipping_carrier: string | null;
  np_ttn: string | null;
  np_city_name: string | null;
  np_warehouse_name: string | null;
  np_address: string | null;
  np_delivery_type: string | null;
  ukrposhta_barcode: string | null;
  shipped_email_at: string | null;
  delivery: Record<string, string> | null;
  /** The last Nova Poshta status code we saw — to alert only on a change. */
  np_status_code?: string | null;
};

export type TrackingRunResult = {
  checked: number;
  shipped: number;
  delivered: number;
  emailed: number;
  errors: number;
  /**
   * Parcels coming BACK, and somebody has to deal with them.
   *
   * Counted rather than acted on. A return is not a stage an order can be put
   * into — there is no such status — and it is far too consequential to infer
   * a status change from, so it is surfaced in the run result and in the log
   * with the order reference. Ukrposhta reports it; Nova Poshta's mapper does
   * not distinguish it, so today this only ever counts international parcels.
   */
  returned: number;
  /**
   * Plain-English lines for Admin › Orders' "Check tracking now" button
   * (21 Oct 2026): a carrier that is switched off or did not answer. Mario
   * cannot read Vercel logs, so what the logs say has to reach the screen.
   * Never carries a token — only a status and the carrier's own message.
   */
  notes: string[];
};

/**
 * Who is really carrying it. The carrier column, except for the one shape the
 * old admin could leave behind: a "Nova Poshta" order with no waybill and an
 * Ukrposhta barcode (TCT-BCWJ4J, 21 Oct 2026). That parcel went by Ukrposhta,
 * and its email must link Ukrposhta's tracking, not a blank Nova Poshta one.
 */
function effectiveCarrier(o: TrackableOrder): "ukrposhta" | "nova_poshta" {
  if (o.shipping_carrier === "ukrposhta") return "ukrposhta";
  return !o.np_ttn && o.ukrposhta_barcode ? "ukrposhta" : "nova_poshta";
}

/** Whatever number the customer would quote for this order. */
function trackingNumber(o: TrackableOrder): string {
  return (effectiveCarrier(o) === "ukrposhta" ? o.ukrposhta_barcode : o.np_ttn) ?? "";
}

/**
 * Where the parcel is going, as the customer should read it.
 *
 * THE SHAPE FOLLOWS THE DESTINATION, NOT THE CARRIER. A Nova Poshta branch is
 * a city and a branch name; a foreign address is a street, a postcode and a
 * country, and those live in the `delivery` blob because the np_* columns were
 * built for warehouses and have nothing to put in them. Keying this on
 * shipping_method rather than shipping_carrier is deliberate and is the
 * distinction migration 0028 was written to preserve: Nova Post carries
 * cross-border parcels too, and one of those needs the address form even
 * though its carrier is nova_poshta.
 *
 * BEFORE THIS, AN INTERNATIONAL ORDER GOT A BLANK ADDRESS. It read np_city_name
 * and np_warehouse_name, both null on an export order, and the email printed
 * the customer's name over two empty lines — a shipping notification whose
 * "delivery address" section says nothing.
 */
function addressLines(o: TrackableOrder): string[] {
  const d = o.delivery ?? {};
  const name = [d.firstName, d.surname].filter(Boolean).join(" ");

  /* The carrier is checked as well as the method: Ukrposhta is only ever
     offered for parcels leaving Ukraine, so an Ukrposhta order whose method
     column is missing or unexpected is still an export and still needs a
     street rather than a branch. */
  if (o.shipping_method === "international" || o.shipping_carrier === "ukrposhta") {
    return [
      name,
      [d.address, d.apartment].filter(Boolean).join(", "),
      [d.postcode, d.city].filter(Boolean).join(" "),
      d.country ?? "",
    ];
  }

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
    ttn: trackingNumber(o),
    locale: o.locale ?? "uk",
    /* The letter names the carrier and links its tracking site. Passed rather
       than assumed: an Ukrposhta barcode under a Nova Poshta link finds
       nothing, and the customer is told their parcel does not exist. */
    carrier: effectiveCarrier(o),
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

  /* The post-purchase mail hangs off THIS moment, not off payment: three days
     from here the parcel has had time to arrive, and the customer is not still
     waiting on the tracking number this mail would have competed with.
     Scheduling only, never sending — and it cannot throw, so a nurture mail
     can never cost us a shipping notification. */
  await scheduleP1({ id: o.id, email: o.email, locale: o.locale });

  return true;
}

/**
 * Write what the carrier said, move the order if it has earned it, and mail.
 *
 * The half of a pass that is identical for every carrier. `patch` arrives
 * carrying the carrier's own status columns; this adds the status change, if
 * there is one, so both land in a single update.
 */
async function applyStage(
  o: TrackableOrder,
  stage: ParcelStage,
  patch: Record<string, unknown>,
  out: TrackingRunResult
): Promise<void> {
  const admin = createAdminClient();

  const target = targetStatus(stage);
  const advances = target !== null && (RANK[target] ?? 0) > (RANK[o.status] ?? 0);
  if (advances) patch.status = target;

  const { error: upErr } = await admin.from("orders").update(patch).eq("id", o.id);
  if (upErr) {
    console.error("[tracking] update failed for", o.external_ref, upErr.code, upErr.message);
    out.errors += 1;
    return;
  }

  if (!advances) return;

  await stampOrderStep(o.id, target);

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

/* ---- Nova Poshta ---------------------------------------------------------- */

async function novaPoshtaPass(out: TrackingRunResult): Promise<void> {
  const admin = createAdminClient();

  // Only parcels still in flight. Delivered and cancelled orders are finished,
  // and asking about them again would be the bulk of the API traffic.
  const { data, error } = await admin
    .from("orders")
    .select(ORDER_COLUMNS)
    .not("np_ttn", "is", null)
    .in("status", ["processing", "shipped"])
    .order("created_at", { ascending: true })
    .limit(TRACK_BATCH_MAX);

  if (error) {
    console.error("[tracking] could not list Nova Poshta orders:", error.code, error.message);
    out.errors += 1;
    return;
  }

  const orders = (data ?? []) as unknown as TrackableOrder[];
  if (orders.length === 0) return;

  let tracked;
  try {
    tracked = await trackParcels(
      orders.map((o) => ({ number: o.np_ttn as string, phone: o.delivery?.phone }))
    );
  } catch (e) {
    // Nova Poshta unreachable — try again next run.
    console.error("[tracking] Nova Poshta lookup failed:", e);
    out.errors += 1;
    out.notes.push(`Nova Poshta did not answer: ${e instanceof Error ? e.message : "unknown error"}.`);
    return;
  }

  const byNumber = new Map(tracked.map((t) => [t.number, t]));
  const now = new Date().toISOString();

  for (const o of orders) {
    const t = byNumber.get(o.np_ttn as string);
    if (!t) {
      console.warn("[tracking] no tracking row for", o.np_ttn);
      continue;
    }
    out.checked += 1;

    if (t.stage === "unknown") {
      // Deleted, unrecognised, or a number Nova Poshta doesn't know. Never
      // moves the order — but a DELETED (2) or UNKNOWN (3) waybill means the
      // parcel was never handed over, and until 19 Oct 2026 that was silent:
      // TCT-LAS6TL sat "processing" for a week on a waybill Nova Poshta had
      // deleted. Now Mario is told once, on the change.
      console.warn("[tracking]", o.external_ref, "unmapped status", t.statusCode, "—", t.status);
      if ((t.statusCode === "2" || t.statusCode === "3") && o.np_status_code !== t.statusCode) {
        const msg =
          `Nova Poshta reports waybill ${o.np_ttn} for order ${o.external_ref} as "${t.status}". ` +
          `The parcel was never handed over under that number, so the order is stuck as Processing.`;
        const todo =
          `If you sent it with a different waybill, paste that number into the order in Admin › Orders. ` +
          `If it has not been sent, press "Create new waybill" on the order.`;
        await sendMail({
          to: ADMIN_EMAIL,
          subject: `Nova Poshta waybill ${t.statusCode === "2" ? "DELETED" : "NOT FOUND"} — ${o.external_ref}`,
          text: `${msg}\n\n${todo}`,
          html: `<p style="font-family:sans-serif;font-size:15px">${msg}</p><p style="font-family:sans-serif;font-size:14px">${todo}</p>`,
        }).catch((e) => console.error("[tracking] deleted-waybill alert failed:", e));
      }
    }

    await applyStage(o, t.stage, { np_status_code: t.statusCode, np_status_checked_at: now }, out);
  }
}

/* ---- Ukrposhta ------------------------------------------------------------ */

async function ukrposhtaPass(out: TrackingRunResult): Promise<void> {
  const admin = createAdminClient();

  /* 'paid' IS IN THE LIST, AND FOR NOVA POSHTA IT IS NOT. A Nova Poshta
     waybill is written by the same statement that moves the order to
     'processing', so 'paid' with a waybill cannot exist. An Ukrposhta booking
     writes only the barcode, and while UKRPOSHTA_BOOKING is off a parcel is
     bought by hand — so a barcode on a 'paid' row is the ordinary case here,
     not an anomaly, and excluding it would mean never tracking those parcels
     at all. */
  const { data, error } = await admin
    .from("orders")
    .select(ORDER_COLUMNS)
    .not("ukrposhta_barcode", "is", null)
    .in("status", ["paid", "processing", "shipped"])
    .order("created_at", { ascending: true })
    .limit(UKRPOSHTA_TRACK_BATCH_MAX);

  if (error) {
    console.error("[tracking] could not list Ukrposhta orders:", error.code, error.message);
    out.errors += 1;
    return;
  }

  const orders = (data ?? []) as unknown as TrackableOrder[];
  if (orders.length === 0) return;

  /* MODE `off` MUST NOT MEAN "ASK THE SANDBOX". ukrposhtaMode() answers
     "sandbox" when the integration is switched off — a deliberate choice that
     keeps every other code path away from the production host — so calling
     tracking anyway would send real production barcodes to dev.ukrposhta.ua,
     which has never heard of them and would answer notFound forever. Silence
     is the honest outcome: the parcels exist, we are simply not asking. */
  if (!ukrposhtaEnabled()) {
    console.info(
      `[tracking] Ukrposhta is switched off — ${orders.length} parcel(s) in flight are not being tracked`
    );
    out.notes.push(
      `Ukrposhta tracking is switched off, so ${orders.length} Ukrposhta parcel(s) can't be checked — use "Mark as shipped" on them.`
    );
    return;
  }

  let tracked;
  try {
    tracked = await trackUkrposhtaParcels(orders.map((o) => o.ukrposhta_barcode as string));
  } catch (e) {
    // Unreachable, or the credential is missing. Try again next run.
    console.error("[tracking] Ukrposhta lookup failed:", e instanceof Error ? e.message : e);
    out.errors += 1;
    out.notes.push(`Ukrposhta did not answer: ${e instanceof Error ? e.message : "unknown error"}.`);
    return;
  }

  const byBarcode = new Map(tracked.found.map((t) => [t.barcode, t]));
  const notFound = new Set(tracked.notFound);
  const now = new Date().toISOString();

  for (const o of orders) {
    const barcode = o.ukrposhta_barcode as string;
    const t = byBarcode.get(barcode);

    /* NOT FOUND IS THE NORMAL EARLY ANSWER, NOT A FAULT. A parcel is invisible
       to tracking until it is lodged over a counter, so a booking made this
       morning reports notFound all day. The check time is stamped anyway —
       that is what shows the cron is running — and the status code is left
       alone rather than overwritten with a null that would look like a parcel
       going backwards. */
    if (!t) {
      if (notFound.has(barcode)) {
        await admin
          .from("orders")
          .update({ ukrposhta_status_checked_at: now })
          .eq("id", o.id);
      } else {
        console.warn("[tracking] no Ukrposhta row for", barcode);
      }
      continue;
    }
    out.checked += 1;

    /* A RETURN IS NOT A STAGE, AND IT IS NOT NOTHING. Event 41000 means
       delivered — to the recipient, or back to us, and only eventReason_id
       tells them apart. The mapper has already done that; here it means the
       order must NOT advance to delivered, and a human has a box coming back
       to Kharkiv that nobody has been told about. Counted and logged with the
       reference, so it appears in the cron's own JSON result. */
    if (t.returned) {
      out.returned += 1;
      console.warn("[tracking]", o.external_ref, "RETURNING to sender —", t.event, t.eventName);
    }
    if (t.cancelled) {
      console.warn("[tracking]", o.external_ref, "acceptance cancelled —", t.event, t.eventName);
    }
    if (t.stage === "unknown" && !t.returned && !t.cancelled) {
      console.warn("[tracking]", o.external_ref, "unmapped Ukrposhta event", t.event, "—", t.eventName);
    }

    await applyStage(
      o,
      t.stage,
      { ukrposhta_status_code: t.event, ukrposhta_status_checked_at: now },
      out
    );
  }
}

/**
 * One tracking pass over both carriers. Safe to call repeatedly; never throws.
 */
export async function runTracking(): Promise<TrackingRunResult> {
  const out: TrackingRunResult = {
    checked: 0,
    shipped: 0,
    delivered: 0,
    emailed: 0,
    errors: 0,
    returned: 0,
    notes: [],
  };

  /* Sequential, and Nova Poshta first: it is the bulk of the parcels and the
     one a customer is most likely to be waiting on. Neither pass can throw,
     so the second always runs. */
  await novaPoshtaPass(out);
  await ukrposhtaPass(out);

  console.log("[tracking] run:", JSON.stringify(out));
  return out;
}

/* ---- By hand ---------------------------------------------------------------

   Mario's "Mark as shipped" / "Mark as delivered" (21 Oct 2026), for parcels
   tracking cannot see: Ukrposhta while its tracking is off, a parcel sent
   under a number the order does not have, anything abroad on Nova Post.

   THE SAME applyStage THE CARRIERS USE, so every rule above holds by hand
   too: forward only, the shipping email claimed exactly once (Mario: yes,
   send it), the post-purchase mail scheduled off it, the step's time stamped.
   Delivered sends nothing, exactly as when a carrier reports it.

   SHIPPED NEEDS A TRACKING NUMBER. The email exists to hand the customer that
   number; one that says "on its way" over a blank line is worse than none. */

export type HandAdvanceResult = { ok: true; emailed: boolean } | { ok: false; error: string };

export async function advanceOrderByHand(
  orderId: string,
  target: "shipped" | "delivered"
): Promise<HandAdvanceResult> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("orders").select(ORDER_COLUMNS).eq("id", orderId).maybeSingle();
  if (error || !data) return { ok: false, error: error?.message ?? "Order not found." };
  const o = data as unknown as TrackableOrder;

  if (o.status === "cancelled") return { ok: false, error: "This order is cancelled." };
  if ((RANK[o.status] ?? 0) >= RANK[target]) return { ok: false, error: `This order is already ${o.status}.` };
  if (target === "shipped" && !trackingNumber(o)) {
    return { ok: false, error: "Add the waybill or barcode first — the shipping email gives the customer that number." };
  }
  if (
    target === "shipped" &&
    effectiveCarrier(o) === "nova_poshta" &&
    (o.np_status_code === "2" || o.np_status_code === "3")
  ) {
    return { ok: false, error: "Nova Poshta deleted this waybill. Paste the number the parcel really went under first, so the email carries the right one." };
  }

  const out: TrackingRunResult = { checked: 0, shipped: 0, delivered: 0, emailed: 0, errors: 0, returned: 0, notes: [] };
  await applyStage(o, target === "shipped" ? "in_transit" : "delivered", {}, out);
  if (out.errors > 0) return { ok: false, error: "The order could not be updated. Try again." };
  return { ok: true, emailed: out.emailed > 0 };
}
