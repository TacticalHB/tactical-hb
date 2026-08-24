import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendMail } from "@/lib/email";
import { renderEmail, renderEmailText, type EmailProductRow } from "./template";
import {
  WELCOME,
  CART,
  POST_PURCHASE,
  WELCOME_LINKS,
  CART_LINKS,
  POST_PURCHASE_LINKS,
  url,
  type CartStep,
  type EmailCopy,
  type Locale,
  type WelcomeStep,
} from "./content";
import { priceCart, type PricedLineInput } from "@/lib/pricing";
import { describeLine } from "@/lib/cart-display";
import { emailProductImage } from "./product-image";
import { products } from "@/lib/products";
import { currencyForLocale, formatMoney } from "@/lib/currency";

/* ---------------------------------------------------------------------------
   The two automated flows: welcome, and cart recovery.

   THE SHAPE OF IT. Nothing here waits. A signup writes four rows with future
   `send_after` times and returns; a cron sweeps whatever is due. That is the
   whole scheduling model, and it is a table rather than a timer because a
   serverless function that tried to sleep for nine days would be killed in
   ten seconds, and because these sends must be CANCELLABLE — by a payment, an
   emptied bag, or an unsubscribe — long after the request that scheduled them
   is gone.

   EVERYTHING IS CHECKED AGAIN AT SEND TIME, not merely at schedule time.
   Consent, payment, the contents of the bag, and how recently that bag was
   touched. A job written on Monday says nothing about Thursday, so
   cancellation is the fast path and these guards are what must hold when
   cancellation has been missed.

   A CART JOB DATES ITSELF, which is why a cart edit writes nothing to the
   queue. When one wakes it compares the bag's `updated_at` against its own
   offset, and if the bag is fresher it moves its own `send_after` and goes
   back to sleep. Cancelling and rescheduling three rows on every edit would
   have done the same job with a race in it — see recordCartSnapshot.

   NEVER SEND A CART MAIL AFTER PAYMENT. There are three independent stops:
   fulfilment cancels the flow the moment an order is created, the same call
   clears the stored bag, and the send path refuses outright if any order
   exists for that address dated after the bag was last touched. Any one of
   them is sufficient; all three are here because a "your bag is waiting"
   landing after the parcel has been paid for is the worst mail this shop
   could send.

   MARKETING CONSENT GATES BOTH FLOWS — including the cart one. An abandoned-
   cart mail is a marketing send under Ukrainian and EU rules alike, so a bag
   is only ever recorded against an address that has opted in and not since
   opted out. It is also what keeps this from becoming a spam cannon: without
   the gate, anyone could post a stranger's address with a cart snapshot and
   have us mail them three times.

   PRICES ARE NEVER STORED, ONLY RECOMPUTED. Everything a mail quotes goes
   through priceCart, the same function the checkout uses, at the moment the
   mail is built. A figure written into a job on Monday could be wrong by
   Thursday, and a mail that undercuts the checkout is a mail that argues with
   the customer at the till.
--------------------------------------------------------------------------- */

const SITE = (process.env.SITE_URL || "https://tactical-hb.com").replace(/\/$/, "");

/**
 * Marketing mail can be sent from its own address without touching the
 * transactional one. Deliverability reputation is per-address: a campaign that
 * collects complaints should not be able to drag order confirmations down with
 * it. Unset today, so both share `contact@` — see docs/email-flows.md.
 */
const MARKETING_FROM = process.env.MARKETING_FROM_EMAIL || undefined;

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** W1 immediately, then +2, +5 and +9 days from signup. */
const WELCOME_OFFSETS: Record<WelcomeStep, number> = {
  W1: 0,
  W2: 2 * DAY,
  W3: 5 * DAY,
  W4: 9 * DAY,
};

/** +1h, +24h and +72h from the last time the bag changed. */
const CART_OFFSETS: Record<CartStep, number> = {
  C1: 1 * HOUR,
  C2: 24 * HOUR,
  C3: 72 * HOUR,
};

const WELCOME_STEPS = Object.keys(WELCOME_OFFSETS) as WelcomeStep[];
const CART_STEPS = Object.keys(CART_OFFSETS) as CartStep[];

/** The product W3 is about. Resolved from the catalogue at send time. */
const W3_SLUG = "hmd-tct-classic";

/**
 * Days between the shipped mail and the post-purchase one.
 *
 * The brief allows two to three; three is used so it can never land on the
 * same day as the courier notice even if the shipped mail went out late in the
 * evening and the sweep runs early. THE PARCEL SHOULD ARRIVE FIRST — this mail
 * asks how the session went, which is nonsense if the box is still in transit.
 */
const P1_DELAY_DAYS = 3;

/**
 * How long after a recovery sequence someone may enter another one. Tune here
 * — it is the difference between a helpful reminder and a weekly nag.
 */
const COOLDOWN_DAYS = 14;

/**
 * How many bag lines a recovery mail illustrates. A twenty-line bag would
 * otherwise produce a mail longer than the page it links to; the button
 * carries the rest.
 */
const MAX_PRODUCT_ROWS = 4;

/* ---- keys and identity --------------------------------------------------- */

/** One canonical form, so `Mario@X.com` and `mario@x.com ` are one person. */
export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export const welcomeJobKey = (email: string) => `welcome:${normaliseEmail(email)}`;
export const cartJobKey = (email: string) => `cart:${normaliseEmail(email)}`;
/** Keyed on the ORDER, not the address: one post-purchase mail per parcel,
    and a customer who buys twice hears from us about both. */
export const p1JobKey = (orderId: string) => `p1:${orderId}`;

/* ---- rows ---------------------------------------------------------------- */

type JobRow = {
  id: string;
  job_key: string;
  flow: "welcome" | "cart" | "p1";
  step: string;
  recipient: string;
  locale: Locale;
  send_after: string;
  payload: Record<string, unknown> | null;
  attempts: number;
  created_at: string;
};

type SubscriberRow = {
  email: string;
  locale: Locale;
  marketing_opt_in: boolean;
  token: string;
  unsubscribed_at: string | null;
};

export type CartSnapshotLine = PricedLineInput;

/* ---- subscribing --------------------------------------------------------- */

export type SubscribeResult =
  | { ok: true; welcomeScheduled: boolean }
  | { ok: false; reason: "invalid_email" | "unavailable" };

/**
 * Put someone on the list and start their welcome series.
 *
 * IDEMPOTENT IN BOTH DIRECTIONS. Submitting the form twice does not produce
 * two chains — the second insert collides with the partial unique index and is
 * treated as "already running" — and an address that is already an active
 * subscriber is not sent W1 again at all. A chain starts only for someone new,
 * someone who had been stored without consent (a stock-notify capture, say),
 * or someone returning after an unsubscribe.
 */
export async function subscribe(input: {
  email: string;
  locale: Locale;
  source: string;
}): Promise<SubscribeResult> {
  const email = normaliseEmail(input.email);
  if (!isEmail(email)) return { ok: false, reason: "invalid_email" };

  let admin: SupabaseClient;
  try {
    admin = createAdminClient();
  } catch (e) {
    console.error("[email] subscribe: no admin client:", e);
    return { ok: false, reason: "unavailable" };
  }

  const { data: existing } = await admin
    .from("subscribers")
    .select("email, marketing_opt_in, unsubscribed_at")
    .eq("email", email)
    .maybeSingle();

  const prior = existing as Pick<SubscriberRow, "marketing_opt_in" | "unsubscribed_at"> | null;
  // A chain is owed to anyone who is not already an opted-in, subscribed member.
  const owedWelcome = !prior || !prior.marketing_opt_in || !!prior.unsubscribed_at;

  const { error: upErr } = await admin.from("subscribers").upsert(
    {
      email,
      locale: input.locale,
      marketing_opt_in: true,
      source: input.source,
      // Returning after an unsubscribe re-opens the list. Deliberate: filling
      // the form in again is a clearer signal of intent than a click made
      // months ago, and refusing it would leave them no way back.
      unsubscribed_at: null,
    },
    { onConflict: "email" }
  );

  if (upErr) {
    console.error("[email] subscribe: upsert failed:", upErr.code, upErr.message);
    return { ok: false, reason: "unavailable" };
  }

  if (!owedWelcome) return { ok: true, welcomeScheduled: false };

  const scheduled = await scheduleWelcome(admin, email, input.locale);

  // W1 is due the moment it is written, and a welcome mail that waits for the
  // next cron sweep reads as broken. Sent inline, through the one send path,
  // and only after the row exists — so if this fails the cron still delivers
  // it rather than it being lost with the request.
  if (scheduled) {
    await runDueJobsForKey(admin, welcomeJobKey(email)).catch((e) =>
      console.error("[email] immediate W1 failed (cron will retry):", e)
    );
  }

  return { ok: true, welcomeScheduled: scheduled };
}

/** Writes W1–W4. False when a chain is already pending for this address. */
async function scheduleWelcome(
  admin: SupabaseClient,
  email: string,
  locale: Locale
): Promise<boolean> {
  const now = Date.now();
  const rows = WELCOME_STEPS.map((step) => ({
    job_key: welcomeJobKey(email),
    flow: "welcome" as const,
    step,
    recipient: email,
    locale,
    send_after: new Date(now + WELCOME_OFFSETS[step]).toISOString(),
  }));

  // All four or none: a partial chain is worse than no chain, and inserting
  // them in one statement makes the unique index arbitrate the race.
  const { error } = await admin.from("email_jobs").insert(rows);
  if (!error) return true;

  if (error.code === "23505") return false; // a chain is already pending
  console.error("[email] welcome schedule failed:", error.code, error.message);
  return false;
}

/* ---- unsubscribing ------------------------------------------------------- */

/**
 * Stop everything for one address.
 *
 * Both flows are cancelled, not just the one whose footer was clicked: someone
 * who asks to stop hearing from us has not asked to stop hearing about welcome
 * mail specifically.
 */
export async function unsubscribeEmail(email: string, reason = "unsubscribed"): Promise<boolean> {
  const addr = normaliseEmail(email);
  if (!isEmail(addr)) return false;

  let admin: SupabaseClient;
  try {
    admin = createAdminClient();
  } catch {
    return false;
  }

  const { error } = await admin
    .from("subscribers")
    .update({ marketing_opt_in: false, unsubscribed_at: new Date().toISOString() })
    .eq("email", addr);

  if (error) {
    console.error("[email] unsubscribe failed:", error.code, error.message);
    return false;
  }

  await cancelFlow(admin, welcomeJobKey(addr), reason);
  await cancelFlow(admin, cartJobKey(addr), reason);
  // Their bag is no longer ours to remember.
  await admin.from("abandoned_carts").delete().eq("email", addr);
  return true;
}

/** The token path — the only one a link in an email may use. */
export async function unsubscribeByToken(token: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return false;

  let admin: SupabaseClient;
  try {
    admin = createAdminClient();
  } catch {
    return false;
  }

  const { data } = await admin
    .from("subscribers")
    .select("email")
    .eq("token", token)
    .maybeSingle();

  const row = data as { email: string } | null;
  if (!row) return false;
  return unsubscribeEmail(row.email);
}

/** Look someone up by the token in their mail, for the preferences page. */
export async function subscriberByToken(token: string): Promise<SubscriberRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("subscribers")
      .select("email, locale, marketing_opt_in, token, unsubscribed_at")
      .eq("token", token)
      .maybeSingle();
    return (data as SubscriberRow | null) ?? null;
  } catch {
    return null;
  }
}

/**
 * Is this address already on the list?
 *
 * For the sign-up page, which should not present a subscribe form to someone
 * who subscribed last week — it should tell them so and point at their
 * preferences. Returns null when they are unknown OR have unsubscribed, both
 * of which mean "show them the form".
 */
export async function subscriberByEmail(
  email: string
): Promise<{ email: string; locale: Locale; token: string } | null> {
  const addr = normaliseEmail(email);
  if (!isEmail(addr)) return null;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("subscribers")
      .select("email, locale, token, marketing_opt_in, unsubscribed_at")
      .eq("email", addr)
      .maybeSingle();
    const row = data as SubscriberRow | null;
    if (!row || !row.marketing_opt_in || row.unsubscribed_at) return null;
    return { email: row.email, locale: row.locale === "uk" ? "uk" : "en", token: row.token };
  } catch {
    // A lookup failure must not hide the form — worst case they see it twice.
    return null;
  }
}

/** Change the language every future mail is written in. */
export async function setSubscriberLocale(token: string, locale: Locale): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return false;
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("subscribers").update({ locale }).eq("token", token);
    return !error;
  } catch {
    return false;
  }
}

/** Re-open a list someone left, from the preferences page they landed on. */
export async function resubscribeByToken(token: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return false;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("subscribers")
      .select("email, locale")
      .eq("token", token)
      .maybeSingle();
    const row = data as { email: string; locale: Locale } | null;
    if (!row) return false;

    const { error } = await admin
      .from("subscribers")
      .update({ marketing_opt_in: true, unsubscribed_at: null })
      .eq("token", token);
    return !error;
  } catch {
    return false;
  }
}

/* ---- the bag ------------------------------------------------------------- */

export type CartSnapshotResult =
  | { ok: true; tracked: boolean }
  | { ok: false; reason: "invalid_email" | "unavailable" };

/**
 * Record the bag as it now stands.
 *
 * THE ANCHOR IS THE LAST CHANGE, so every edit pushes the whole sequence back —
 * someone still adding things to their bag is not abandoning it. But the edit
 * writes NOTHING to the queue to achieve that. The jobs are anchor-agnostic:
 * each one, when it wakes, measures itself against `abandoned_carts.updated_at`
 * and puts itself back to sleep if the bag has been touched more recently than
 * its own offset allows.
 *
 * WHY NOT CANCEL AND RESCHEDULE, which is the obvious way to do it: two tabs
 * saving at once would interleave their cancels and inserts, and the loser's
 * chain would be left anchored to a moment the cart row no longer agrees with
 * — a sequence that then quietly cancels itself. Letting each job re-date
 * itself removes the race entirely, and turns four writes per cart edit into
 * one.
 *
 * A CHANGE AFTER C1 HAS GONE DOES NOT BRING C1 BACK. Only pending steps move,
 * so the sequence advances rather than restarting; someone who keeps nudging
 * their bag gets one "your bag is waiting", not one per nudge.
 *
 * AN EMPTY BAG CANCELS. Emptying is a decision, and following it with "your
 * bag is waiting" would be answering something the customer never said.
 */
export async function recordCartSnapshot(input: {
  email: string;
  locale: Locale;
  lines: CartSnapshotLine[];
}): Promise<CartSnapshotResult> {
  const email = normaliseEmail(input.email);
  if (!isEmail(email)) return { ok: false, reason: "invalid_email" };

  let admin: SupabaseClient;
  try {
    admin = createAdminClient();
  } catch {
    return { ok: false, reason: "unavailable" };
  }

  // The consent gate, and the abuse gate in the same check. An address that
  // never opted in is not stored at all — not stored and then filtered later,
  // which would leave us holding a list we have no right to.
  const { data } = await admin
    .from("subscribers")
    .select("email, marketing_opt_in, unsubscribed_at")
    .eq("email", email)
    .maybeSingle();
  const sub = data as Pick<SubscriberRow, "marketing_opt_in" | "unsubscribed_at"> | null;
  if (!sub || !sub.marketing_opt_in || sub.unsubscribed_at) {
    return { ok: true, tracked: false };
  }

  // Through the checkout's own pricer, so an unknown slug, a silly quantity or
  // an add-on flag on a product that cannot take one is gone before it is
  // stored. Only what survives is persisted, and only its shape — no prices.
  const priced = priceCart(input.lines, input.locale);
  const clean = priced.lines.map((l) => ({
    slug: l.slug,
    qty: l.qty,
    options: {
      ...(l.options.variant ? { variant: l.options.variant } : {}),
      ...(l.options.lid ? { lid: true } : {}),
      ...(l.options.rubber ? { rubber: true } : {}),
      ...(l.options.timer ? { timer: true } : {}),
    },
  }));

  if (!clean.length) {
    await cancelFlow(admin, cartJobKey(email), "cart_emptied");
    await admin.from("abandoned_carts").delete().eq("email", email);
    return { ok: true, tracked: false };
  }

  const anchor = new Date().toISOString();
  const { error: cartErr } = await admin.from("abandoned_carts").upsert(
    { email, locale: input.locale, lines: clean, updated_at: anchor },
    { onConflict: "email" }
  );
  if (cartErr) {
    console.error("[email] cart snapshot failed:", cartErr.code, cartErr.message);
    return { ok: false, reason: "unavailable" };
  }

  const now = Date.parse(anchor);
  const rows = CART_STEPS.map((step) => ({
    job_key: cartJobKey(email),
    flow: "cart" as const,
    step,
    recipient: email,
    locale: input.locale,
    send_after: new Date(now + CART_OFFSETS[step]).toISOString(),
  }));

  // ONE SEQUENCE PER FORTNIGHT, whatever the bag does in between.
  //
  // The insert below is refused by the unique index while any step is still
  // pending, which handles the common case. This handles the other one: a
  // sequence that has fully run, after which nothing is pending and a bag
  // edited on day four would start the whole thing again. A regular browser
  // would collect three mails a week that way, which is how a recovery flow
  // turns into the reason someone unsubscribes.
  const { data: recent } = await admin
    .from("email_jobs")
    .select("id")
    .eq("job_key", cartJobKey(email))
    .not("sent_at", "is", null)
    .gte("sent_at", new Date(now - COOLDOWN_DAYS * DAY).toISOString())
    .limit(1);

  if ((recent ?? []).length) {
    // The bag is still recorded — only the mail is withheld. If they come back
    // and buy, nothing here is in the way.
    return { ok: true, tracked: false };
  }

  // Start a chain if there is not one already. A collision means the customer
  // is mid-sequence, which is exactly right — those jobs will re-date
  // themselves against the anchor just written.
  const { error } = await admin.from("email_jobs").insert(rows);
  if (error && error.code !== "23505") {
    console.error("[email] cart schedule failed:", error.code, error.message);
    return { ok: false, reason: "unavailable" };
  }

  return { ok: true, tracked: true };
}

/* ---- post-purchase (P1) -------------------------------------------------- */

/**
 * The parcel is on its way. Schedule the one post-purchase mail.
 *
 * CALLED FROM THE SHIPPED PATH, right after the courier notice goes out, so
 * the trigger is the shipped moment and not payment — a nurture mail sent on
 * `paid` would arrive while the customer is still watching for a tracking
 * number, and would compete with the mail that carries it.
 *
 * IDEMPOTENT BY KEY, not by a flag we maintain: 'p1:{order id}' plus the
 * partial unique index means a second call for the same order cannot insert.
 * Two tracking runs claiming the same parcel therefore cannot produce two
 * mails even if both reach this line.
 *
 * NEVER THROWS. It is called from the tracking sweep, which also books
 * waybills and sends the shipping mail; a nurture mail that cannot be
 * scheduled must not take that down.
 */
export async function scheduleP1(order: {
  id: string;
  email: string | null;
  locale: string | null;
}): Promise<boolean> {
  if (!order.email) return false;
  const email = normaliseEmail(order.email);
  if (!isEmail(email)) return false;

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("email_jobs").insert({
      job_key: p1JobKey(order.id),
      flow: "p1",
      step: "P1",
      recipient: email,
      locale: order.locale === "uk" ? "uk" : "en",
      send_after: new Date(Date.now() + P1_DELAY_DAYS * DAY).toISOString(),
      payload: { order_id: order.id },
    });
    if (error && error.code !== "23505") {
      console.error("[email] P1 schedule failed:", error.code, error.message);
      return false;
    }
    return !error;
  } catch (e) {
    console.error("[email] P1 schedule threw:", e);
    return false;
  }
}

/** Stop a pending P1 — the order was cancelled. */
export async function cancelP1(orderId: string, reason = "order_cancelled"): Promise<void> {
  try {
    const admin = createAdminClient();
    await cancelFlow(admin, p1JobKey(orderId), reason);
  } catch (e) {
    console.error("[email] P1 cancel failed for", orderId, e);
  }
}

/**
 * The order was paid. Stop the recovery flow.
 *
 * CALLED FROM FULFILMENT, and it must stay called: a "your bag is waiting"
 * arriving after the money has moved is the single worst thing this system can
 * do. Never throws — a mail queue must not be able to undo a paid order — and
 * the send path checks for a paid order independently, so a failure here
 * degrades to a second line of defence rather than to a wrong send.
 */
export async function cancelCartFlowOnPayment(email: string | null | undefined): Promise<void> {
  if (!email) return;
  const addr = normaliseEmail(email);
  if (!isEmail(addr)) return;

  try {
    const admin = createAdminClient();
    await cancelFlow(admin, cartJobKey(addr), "order_paid");
    // The bag is bought; there is nothing left to remember about it.
    await admin.from("abandoned_carts").delete().eq("email", addr);
  } catch (e) {
    console.error("[email] cancel-on-payment failed for", addr, e);
  }
}

/* ---- cancelling ---------------------------------------------------------- */

/** Cancel every job still pending under a key. Sent ones are left alone. */
async function cancelFlow(admin: SupabaseClient, jobKey: string, reason: string): Promise<number> {
  const { data, error } = await admin
    .from("email_jobs")
    .update({ cancelled_at: new Date().toISOString(), cancel_reason: reason })
    .eq("job_key", jobKey)
    .is("sent_at", null)
    .is("cancelled_at", null)
    .select("id");

  if (error) {
    console.error("[email] cancel failed:", jobKey, error.code, error.message);
    return 0;
  }
  return (data ?? []).length;
}

/* ---- running the queue --------------------------------------------------- */

export type QueueResult = {
  claimed: number;
  sent: number;
  cancelled: number;
  /** Put back to sleep because the bag moved. Not a failure. */
  deferred: number;
  failed: number;
};

/**
 * Send everything that is due. The cron's whole job.
 *
 * Claiming happens in the database with FOR UPDATE SKIP LOCKED, so two
 * overlapping runs divide the work instead of both sending the same mail.
 */
export async function runDueJobs(batch = 25): Promise<QueueResult> {
  const empty: QueueResult = { claimed: 0, sent: 0, cancelled: 0, deferred: 0, failed: 0 };

  let admin: SupabaseClient;
  try {
    admin = createAdminClient();
  } catch (e) {
    console.error("[email] queue: no admin client:", e);
    return empty;
  }

  const { data, error } = await admin.rpc("claim_email_jobs", { batch });
  if (error) {
    console.error("[email] claim failed:", error.code, error.message);
    return empty;
  }

  const jobs = (data ?? []) as JobRow[];
  return processJobs(admin, jobs);
}

/**
 * Send the due jobs for one key, now.
 *
 * The claim is a compare-and-swap rather than the RPC: the update only matches
 * rows whose `claimed_at` is still null, so whatever comes back is ours alone
 * even if the cron is sweeping at the same moment.
 */
async function runDueJobsForKey(admin: SupabaseClient, jobKey: string): Promise<QueueResult> {
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("email_jobs")
    .update({ claimed_at: now })
    .eq("job_key", jobKey)
    .is("sent_at", null)
    .is("cancelled_at", null)
    .is("claimed_at", null)
    .lte("send_after", now)
    .select("*");

  if (error) {
    console.error("[email] inline claim failed:", error.code, error.message);
    return { claimed: 0, sent: 0, cancelled: 0, deferred: 0, failed: 0 };
  }
  return processJobs(admin, (data ?? []) as JobRow[]);
}

async function processJobs(admin: SupabaseClient, jobs: JobRow[]): Promise<QueueResult> {
  const result: QueueResult = { claimed: jobs.length, sent: 0, cancelled: 0, deferred: 0, failed: 0 };

  // Sequential on purpose. A burst of parallel sends is what a provider's rate
  // limiter reads as an incident, and the batch is small.
  for (const job of jobs) {
    try {
      const outcome = await sendJob(admin, job);
      if (outcome === "sent") result.sent++;
      else if (outcome === "cancelled") result.cancelled++;
      else if (outcome === "deferred") result.deferred++;
      else result.failed++;
    } catch (e) {
      result.failed++;
      const message = e instanceof Error ? e.message : String(e);
      console.error("[email] job threw:", job.step, job.recipient, message);
      // Released rather than left claimed, so the next sweep retries it
      // immediately instead of waiting out the fifteen-minute stale window.
      await admin
        .from("email_jobs")
        .update({ claimed_at: null, last_error: message.slice(0, 500) })
        .eq("id", job.id);
    }
  }

  return result;
}

type Outcome = "sent" | "cancelled" | "deferred" | "failed";

async function sendJob(admin: SupabaseClient, job: JobRow): Promise<Outcome> {
  // 1. Consent, read now rather than trusted from when the job was written.
  const { data } = await admin
    .from("subscribers")
    .select("email, locale, marketing_opt_in, token, unsubscribed_at")
    .eq("email", job.recipient)
    .maybeSingle();
  const sub = data as SubscriberRow | null;

  /* CONSENT IS NOT THE SAME QUESTION FOR ALL THREE FLOWS.
   *
   * Welcome and cart are marketing to someone who asked for marketing, so they
   * require an opted-in subscriber row and stop without one.
   *
   * P1 goes to somebody who has just bought something. Requiring a newsletter
   * subscription would silence it for nearly every real customer, since buying
   * a bowl is not subscribing to anything. So it sends without a subscriber
   * row — but an explicit unsubscribe still stops it, which is what "honour
   * unsubscribe where the stack supports it" has to mean if it means anything.
   * An address that has pressed unsubscribe hears nothing further from any
   * flow here. */
  const unsubscribed = !!sub?.unsubscribed_at;
  const optedIn = !!sub && sub.marketing_opt_in && !sub.unsubscribed_at;
  const allowed = job.flow === "p1" ? !unsubscribed : optedIn;

  if (!allowed) {
    await markCancelled(admin, job.id, unsubscribed ? "unsubscribed" : "no_consent");
    return "cancelled";
  }

  // The subscriber row is the authority on language when there is one: it
  // holds the locale captured at signup, and a change on the preferences page
  // outranks the one frozen into the job. A P1 recipient may have no row at
  // all, in which case the order's own locale — already on the job — stands.
  const locale: Locale = sub ? (sub.locale === "uk" ? "uk" : "en") : job.locale;

  const built =
    job.flow === "welcome"
      ? await buildWelcome(job, locale, sub)
      : job.flow === "p1"
        ? await buildP1(admin, job, locale, sub)
        : await buildCart(admin, job, locale, sub);

  if (built.kind === "cancel") {
    await markCancelled(admin, job.id, built.reason);
    return "cancelled";
  }

  if (built.kind === "defer") {
    // The bag was touched more recently than this step's offset allows, so it
    // is not abandoned yet. Attempts is reset with the date: the counter
    // exists to retire a job that keeps failing to send, and a customer who
    // edits their bag five times has not failed at anything.
    await admin
      .from("email_jobs")
      .update({ send_after: built.until, claimed_at: null, attempts: 0, last_error: null })
      .eq("id", job.id);
    return "deferred";
  }

  const sent = await sendMail({
    to: job.recipient,
    subject: built.subject,
    html: built.html,
    text: built.text,
    ...(MARKETING_FROM ? { from: MARKETING_FROM } : {}),
    headers: built.headers,
  });

  if (!sent.ok) {
    await admin
      .from("email_jobs")
      .update({ claimed_at: null, last_error: `resend: ${sent.error}` })
      .eq("id", job.id);
    return "failed";
  }

  await admin
    .from("email_jobs")
    .update({ sent_at: new Date().toISOString(), last_error: null })
    .eq("id", job.id);
  return "sent";
}

async function markCancelled(admin: SupabaseClient, id: string, reason: string): Promise<void> {
  await admin
    .from("email_jobs")
    .update({ cancelled_at: new Date().toISOString(), cancel_reason: reason })
    .eq("id", id);
}

/* ---- building the mail --------------------------------------------------- */

type Built =
  | { kind: "send"; subject: string; html: string; text: string; headers: Record<string, string> }
  | { kind: "cancel"; reason: string }
  /** Not yet — come back at `until`, an ISO timestamp. */
  | { kind: "defer"; until: string };

function unsubscribeLinks(locale: Locale, token: string) {
  const unsubscribeUrl = `${SITE}/${locale}/newsletter/preferences?token=${token}&action=unsubscribe`;
  const preferencesUrl = `${SITE}/${locale}/newsletter/preferences?token=${token}`;
  return { unsubscribeUrl, preferencesUrl };
}

/**
 * The headers Gmail and Yahoo require of anyone sending bulk mail.
 *
 * The HTTPS entry is a POST-only route, which matters: corporate link scanners
 * and Outlook Safe Links follow every URL in a message with a GET, and an
 * unsubscribe that honoured a GET would silently remove people who never
 * clicked anything.
 */
function listHeaders(token: string): Record<string, string> {
  return {
    "List-Unsubscribe": `<${SITE}/api/newsletter/unsubscribe?token=${token}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

async function buildWelcome(job: JobRow, locale: Locale, sub: SubscriberRow | null): Promise<Built> {
  if (!sub) return { kind: "cancel", reason: "no_consent" };
  const step = job.step as WelcomeStep;
  const copy: EmailCopy | undefined = WELCOME[step]?.[locale];
  if (!copy) return { kind: "cancel", reason: "unknown_step" };

  const links = WELCOME_LINKS[step];
  const { unsubscribeUrl, preferencesUrl } = unsubscribeLinks(locale, sub.token);

  // W3 is about one product, so it shows that product — resolved from the
  // catalogue now, at today's price, in this subscriber's currency. If the
  // slug ever leaves the catalogue the row is dropped and the button falls
  // back to the index, rather than the mail carrying a broken image and a 404.
  const rows = step === "W3" ? productRowsFor([{ slug: W3_SLUG, qty: 1 }], locale) : [];
  const primaryPath =
    step === "W3" && !rows.length ? "/products" : links.primary;

  const html = renderEmail({
    locale,
    preheader: copy.preheader,
    headline: copy.headline,
    paragraphs: copy.paragraphs,
    bullets: copy.bullets,
    productRows: rows,
    primaryCta: { label: copy.primaryLabel, url: url(locale, primaryPath) },
    secondaryCta: copy.secondaryLabel
      ? { label: copy.secondaryLabel, url: url(locale, links.secondary) }
      : undefined,
    unsubscribeUrl,
    preferencesUrl,
  });

  const text = renderEmailText({
    locale,
    preheader: copy.preheader,
    headline: copy.headline,
    paragraphs: copy.paragraphs,
    bullets: copy.bullets,
    productRows: rows,
    primaryCta: { label: copy.primaryLabel, url: url(locale, primaryPath) },
    secondaryCta: copy.secondaryLabel
      ? { label: copy.secondaryLabel, url: url(locale, links.secondary) }
      : undefined,
    unsubscribeUrl,
    preferencesUrl,
  });

  return { kind: "send", subject: copy.subject, html, text, headers: listHeaders(sub.token) };
}

/**
 * The post-purchase mail.
 *
 * FOUR REASONS IT MIGHT NOT GO, all checked here rather than trusted from when
 * the job was written three days ago:
 *
 *   the order was cancelled       — the parcel is not with them
 *   the order vanished            — nothing to write about
 *   they bought the whole kit     — the mail's one argument does not apply
 *   they unsubscribed             — handled by the caller, before this runs
 *
 * THE FULL-KIT SKIP is the brief's optional rule, and it is cheap because the
 * catalogue already knows each slug's category: an order carrying a bowl, a
 * heat device and a wind cover has nothing to be sold on "finish the system",
 * and sending it anyway is how a considered mail becomes noise.
 */
async function buildP1(
  admin: SupabaseClient,
  job: JobRow,
  locale: Locale,
  sub: SubscriberRow | null
): Promise<Built> {
  const copy: EmailCopy | undefined = POST_PURCHASE.P1?.[locale];
  if (!copy) return { kind: "cancel", reason: "unknown_step" };

  const orderId = typeof job.payload?.order_id === "string" ? job.payload.order_id : null;
  if (!orderId) return { kind: "cancel", reason: "no_order" };

  const { data, error } = await admin
    .from("orders")
    .select("id, status, order_items(product_id)")
    .eq("id", orderId)
    .maybeSingle();

  // A read failure is not proof of anything, so it postpones rather than kills.
  if (error) throw new Error(`P1 order check failed: ${error.message}`);
  if (!data) return { kind: "cancel", reason: "order_missing" };

  const row = data as { status?: string; order_items?: { product_id?: string }[] };
  if (row.status === "cancelled") return { kind: "cancel", reason: "order_cancelled" };

  const categories = new Set(
    (row.order_items ?? [])
      .map((it) => products.find((p) => p.slug === it.product_id)?.category)
      .filter(Boolean)
  );
  if (categories.has("bowl") && categories.has("hmd") && categories.has("windcover")) {
    return { kind: "cancel", reason: "already_full_kit" };
  }

  const links = POST_PURCHASE_LINKS.P1;
  /* Someone with no subscriber row has no token, so there is no preference
     page to send them to and no one-click header to set. The footer still
     carries the newsletter's unsubscribe route, which is where an unhappy
     recipient goes; it is just not personalised. */
  const token = sub?.token ?? null;
  const unsubscribeUrl = token
    ? `${SITE}/${locale}/newsletter/preferences?token=${token}&action=unsubscribe`
    : `${SITE}/${locale}/newsletter`;
  const preferencesUrl = token
    ? `${SITE}/${locale}/newsletter/preferences?token=${token}`
    : `${SITE}/${locale}/newsletter`;

  const input = {
    locale,
    preheader: copy.preheader,
    headline: copy.headline,
    paragraphs: copy.paragraphs,
    bullets: copy.bullets,
    primaryCta: { label: copy.primaryLabel, url: url(locale, links.primary) },
    secondaryCta: copy.secondaryLabel
      ? { label: copy.secondaryLabel, url: url(locale, links.secondary) }
      : undefined,
    unsubscribeUrl,
    preferencesUrl,
  } as const;

  return {
    kind: "send",
    subject: copy.subject,
    html: renderEmail(input),
    text: renderEmailText(input),
    headers: token ? listHeaders(token) : {},
  };
}

async function buildCart(
  admin: SupabaseClient,
  job: JobRow,
  locale: Locale,
  sub: SubscriberRow | null
): Promise<Built> {
  if (!sub) return { kind: "cancel", reason: "no_consent" };
  const step = job.step as CartStep;
  const copy: EmailCopy | undefined = CART[step]?.[locale];
  if (!copy) return { kind: "cancel", reason: "unknown_step" };

  // The bag, as it stands right now. Read first because its `updated_at` is
  // the anchor everything below measures against.
  const { data: cartData } = await admin
    .from("abandoned_carts")
    .select("lines, updated_at")
    .eq("email", job.recipient)
    .maybeSingle();
  const cart = cartData as { lines: CartSnapshotLine[]; updated_at: string } | null;

  if (!cart || !Array.isArray(cart.lines) || !cart.lines.length) {
    return { kind: "cancel", reason: "cart_emptied" };
  }

  // THE HARD ONE. Any order at all for this address since the bag was last
  // touched means they bought: orders are only ever written after Monobank has
  // confirmed the money, so existence is proof of payment and the status —
  // paid, shipped, delivered — does not come into it.
  const { data: paid, error: paidErr } = await admin
    .from("orders")
    .select("id")
    .eq("email", job.recipient)
    .gte("created_at", cart.updated_at)
    .limit(1);

  if (paidErr) {
    // Cannot prove they have NOT paid, so do not send. Thrown rather than
    // cancelled: a database blip should postpone the mail, not kill it.
    throw new Error(`order check failed: ${paidErr.message}`);
  }
  if ((paid ?? []).length) return { kind: "cancel", reason: "order_paid" };

  // NOT ABANDONED YET. The bag has been touched more recently than this step's
  // offset allows, so the job puts itself back to sleep at the moment the new
  // anchor makes it due. This is what "any cart change resets the anchor"
  // means in practice — no rescheduling write happens when the bag changes,
  // the job simply measures itself against the bag when it wakes.
  const due = Date.parse(cart.updated_at) + CART_OFFSETS[step];
  if (due > Date.now()) return { kind: "defer", until: new Date(due).toISOString() };

  const rows = productRowsFor(cart.lines, locale);
  if (!rows.length) return { kind: "cancel", reason: "cart_emptied" };

  // C1's preheader names what is waiting. The placeholder is filled from the
  // catalogue, never from anything the browser sent.
  const preheader = copy.preheader.replace(/\{\{\s*product_name\s*\}\}/g, rows[0].name);
  const { unsubscribeUrl, preferencesUrl } = unsubscribeLinks(locale, sub.token);
  const links = CART_LINKS[step];

  const input = {
    locale,
    preheader,
    headline: copy.headline,
    paragraphs: copy.paragraphs,
    bullets: copy.bullets,
    productRows: rows,
    primaryCta: { label: copy.primaryLabel, url: url(locale, links.primary) },
    secondaryCta: copy.secondaryLabel
      ? { label: copy.secondaryLabel, url: url(locale, links.secondary) }
      : undefined,
    unsubscribeUrl,
    preferencesUrl,
  } as const;

  return {
    kind: "send",
    subject: copy.subject,
    html: renderEmail(input),
    text: renderEmailText(input),
    headers: listHeaders(sub.token),
  };
}

/**
 * Cart lines as the mail describes them.
 *
 * Priced by the checkout's own pricer and described by the cart's own
 * describeLine, so the mail cannot disagree with either about what a thing is
 * called, what finish it is in, or what it costs.
 *
 * Exported so the dev preview renders rows through this and not through a
 * lookalike of it — a preview that builds its own rows is a preview that can
 * quietly stop matching what actually gets sent.
 */
export function productRowsFor(lines: CartSnapshotLine[], locale: Locale): EmailProductRow[] {
  const priced = priceCart(lines, locale);
  const currency = currencyForLocale(locale);

  return priced.lines.slice(0, MAX_PRODUCT_ROWS).map((l) => {
    const described = describeLine(
      {
        slug: l.slug,
        qty: l.qty,
        options: {
          ...(l.options.variant ? { variant: l.options.variant } : {}),
          lid: l.options.lid,
          rubber: l.options.rubber,
          timer: l.options.timer,
        },
      },
      locale
    );

    const parts = [described?.colour, described?.addons, l.qty > 1 ? `×${l.qty}` : null].filter(
      Boolean
    ) as string[];

    // NOT described.image. That prefers the tile cut-out, which is tall bleed
    // art for the flagship grid and warps in a square frame — see
    // lib/email/product-image.ts. Everything else about the row still comes
    // from describeLine, so the wording cannot drift from the site's.
    const image = emailProductImage(l.slug, l.options.variant);

    return {
      // Absolute and unoptimised: an email client cannot reach a Next.js image
      // route with a relative path, and /public is served straight from the CDN.
      imageUrl: image ? `${SITE}${image}` : undefined,
      name: l.name,
      variant: parts.length ? parts.join(" · ") : undefined,
      // l.total is unit × qty, so a line of two quotes what two cost.
      priceLabel: formatMoney(l.total, currency),
    };
  });
}
