"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMail } from "@/lib/email";
import { buildStaffLetter, staffQuote } from "@/lib/staff-email";
import { ADMIN_EMAIL, SALES_EMAIL } from "@/lib/contact-info";
import { applyForAccount, submitRequest, type SubmitLine } from "@/lib/wholesale-portal";
import { buildPartnerAckMail, buildStaffRequestMail } from "@/lib/wholesale-request-email";
import { buildWholesaleRegistrationReply } from "@/lib/wholesale-email";
import { isAppLocale } from "@/i18n/routing";

/* ---------------------------------------------------------------------------
   The partner-facing writes: apply for an account, submit a request.

   WHO IS CALLING IS ESTABLISHED HERE, from the session cookie, and never taken
   from an argument. A server action is a public endpoint — anything in its
   parameter list is attacker-controlled, so the user id, the partner id and
   every price are all resolved server-side from things the caller cannot
   forge.

   NEITHER ACTION CAN GRANT ACCESS. Applying writes `pending` and nothing in
   this file can write `approved` — that verb lives in the admin actions,
   behind requireAdminActor(). See app/actions/wholesale-admin.ts.
--------------------------------------------------------------------------- */

export type WholesaleResult =
  | { ok: true; reference?: string; formSent?: boolean }
  | { ok: false; error: string };

const LIMITS = { company: 150, contactName: 100, phone: 40, country: 80, city: 80, businessType: 60, note: 2000 };

function clean(v: unknown, max: number): string {
  return String(v ?? "").trim().slice(0, max);
}

/** Whoever the session says is calling, or null. */
async function currentUser() {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

/* ---- Applying --------------------------------------------------------------- */

export type ApplyFields = {
  company: string;
  contactName: string;
  phone: string;
  country: string;
  city: string;
  businessType: string;
  note: string;
  locale: string;
};

/**
 * Attach the signed-in user to a pending partner row.
 *
 * REGISTRATION IS RATE-LIMITED BY THE EMAIL LOOP, not by a counter here. The
 * form cannot reach this action without an OTP that Supabase sent to the
 * address and the browser echoed back, and Supabase throttles those per
 * address. A counter in this process would add nothing: serverless gives every
 * instance its own memory, so it would reset under exactly the load it exists
 * to stop.
 */
export async function applyForWholesaleAccount(fields: ApplyFields): Promise<WholesaleResult> {
  const user = await currentUser();
  if (!user?.email) return { ok: false, error: "not_signed_in" };

  const company = clean(fields.company, LIMITS.company);
  if (!company) return { ok: false, error: "company_required" };

  const locale = isAppLocale(fields.locale) ? fields.locale : "en";

  const result = await applyForAccount({
    userId: user.id,
    company,
    contactName: clean(fields.contactName, LIMITS.contactName),
    email: user.email,
    phone: clean(fields.phone, LIMITS.phone),
    country: clean(fields.country, LIMITS.country),
    city: clean(fields.city, LIMITS.city),
    businessType: clean(fields.businessType, LIMITS.businessType),
    note: clean(fields.note, LIMITS.note),
    locale,
  });

  if (!result.ok) return { ok: false, error: result.error };

  /* Best-effort, and after the row exists. Sales finding out by email is how
     an application gets acted on quickly; sales NOT finding out is a delay,
     whereas a failed write would be a lost applicant. */
  const site = (process.env.SITE_URL || "https://tactical-hb.com").replace(/\/$/, "");
  const contact = clean(fields.contactName, LIMITS.contactName);
  const phone = clean(fields.phone, LIMITS.phone);
  const country = clean(fields.country, LIMITS.country);
  const city = clean(fields.city, LIMITS.city);
  const biz = clean(fields.businessType, LIMITS.businessType);
  const applicantNote = clean(fields.note, LIMITS.note);

  const rows: [string, string | null | undefined][] = [
    ["Company", company],
    ["Contact", contact],
    ["Email", user.email],
    ["Telephone", phone],
    ["Business type", biz],
    ["Country", country],
    ["City", city],
    ["Language", locale.toUpperCase()],
  ];

  const mail = await sendMail({
    to: SALES_EMAIL,
    replyTo: user.email,
    subject: `Wholesale account application — ${company}`,
    html: buildStaffLetter({
      title: "New wholesale application",
      lead: `${company} has registered and is awaiting approval.`,
      rows,
      blocks: applicantNote ? [staffQuote("What they told us", applicantNote)] : [],
      cta: { label: "Approve or decline", url: `${site}/en/admin/partners` },
      status: "They cannot see dealer prices or submit anything until approved.",
    }),
    text: [
      `${company} has registered for a wholesale account and is awaiting approval.`,
      ...rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`),
      "",
      applicantNote,
      "",
      `Approve or decline: ${site}/en/admin/partners`,
      "They cannot see dealer prices or submit anything until approved.",
    ]
      .filter(Boolean)
      .join("\n"),
  });
  if (!mail.ok) console.error("[wholesale] application alert not sent:", mail.error);

  /* THE FORM GOES OUT HERE, and this is the step the whole flow turns on.
     Registration creates an account that does nothing; the only thing that
     turns it into a real one is a completed PDF coming back by email. An
     applicant who never receives the form has no route forward at all, so a
     failure here is logged loudly — sales can attach it by hand from the
     alert above, which names the address. */
  const reply = buildWholesaleRegistrationReply(locale, site);
  const applicantMail = await sendMail({
    to: user.email,
    from: `Tactical HB <${ADMIN_EMAIL}>`,
    replyTo: SALES_EMAIL,
    subject: reply.subject,
    html: reply.html,
    text: reply.text,
    attachments: reply.attachments,
  });
  if (!applicantMail.ok) {
    console.error(
      "[wholesale] APPLICATION FORM NOT SENT to", user.email, "-", applicantMail.error,
      "— send it by hand; they cannot proceed without it"
    );
  }

  revalidatePath("/[locale]/admin/partners", "page");
  return { ok: true, formSent: applicantMail.ok };
}

/* ---- Submitting ------------------------------------------------------------- */

/** Requests one partner may submit per hour. Generous for real ordering,
    low enough that a script cannot fill the inbox. */
const SUBMIT_PER_HOUR = 10;

/**
 * Counted in the database, deliberately.
 *
 * The obvious in-memory Map would be worse than nothing here: on serverless
 * each instance keeps its own, so the limit is "10 per instance" and scales up
 * with traffic exactly when it should not. Counting rows is shared state that
 * already exists, costs one indexed query, and survives a cold start.
 */
async function overSubmitLimit(userId: string): Promise<boolean> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const db = createAdminClient();
  const { count, error } = await db
    .from("wholesale_requests")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);

  // A failed count must not become a free pass, but must not lock a real
  // partner out either — log it and let the submission through, because the
  // approval gate has already done the security work.
  if (error) {
    console.error("[wholesale] rate-limit count failed:", error.message);
    return false;
  }
  return (count ?? 0) >= SUBMIT_PER_HOUR;
}

export async function submitWholesaleRequest(
  lines: SubmitLine[],
  note: string
): Promise<WholesaleResult> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "not_signed_in" };

  if (!Array.isArray(lines) || lines.length === 0) return { ok: false, error: "empty" };
  if (await overSubmitLimit(user.id)) return { ok: false, error: "rate_limited" };

  const result = await submitRequest(user.id, lines, clean(note, LIMITS.note));
  if (!result.ok) return { ok: false, error: result.error };

  const req = result.request;

  /* THE ROW IS THE RECORD. Both letters are best-effort and neither can undo
     the request — the brief's "email + admin panel" means the panel is the
     one that must be true, and the emails are how people find out quickly. */
  const staff = buildStaffRequestMail(req);
  const staffMail = await sendMail({
    to: SALES_EMAIL,
    replyTo: req.email ?? undefined,
    subject: staff.subject,
    html: staff.html,
    text: staff.text,
  });
  if (!staffMail.ok) {
    console.error("[wholesale] staff alert not sent for", req.reference, "-", staffMail.error);
  }

  if (req.email) {
    const ack = buildPartnerAckMail(req);
    const ackMail = await sendMail({
      to: req.email,
      from: `Tactical HB <${ADMIN_EMAIL}>`,
      replyTo: SALES_EMAIL,
      subject: ack.subject,
      html: ack.html,
      text: ack.text,
    });
    if (!ackMail.ok) console.error("[wholesale] partner ack not sent:", ackMail.error);
  }

  revalidatePath("/[locale]/admin/wholesale", "page");
  revalidatePath("/[locale]/wholesale/portal", "page");
  return { ok: true, reference: req.reference };
}
