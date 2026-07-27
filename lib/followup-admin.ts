import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_EMAIL, SALES_EMAIL } from "@/lib/contact-info";
import { sendMail } from "@/lib/email";
import { buildFollowUpMail } from "@/lib/followup-email";
import type { PartnerMessage } from "@/lib/followup-display";

/* ---------------------------------------------------------------------------
   The follow-up send path (0023) — the first place in this codebase where an
   agent's suggestion can reach someone outside the company.

   FOUR THINGS THIS FILE REFUSES TO DO, each of which would be easy:

   1. It never takes the recipient from the caller. The address comes from
      wholesale_partners, read here, by id. A subject and a body arrive from
      the form because the founder edited them; an ADDRESS never does, or the
      action becomes a way to mail anyone from a verified domain.
   2. It never sends without recording. Every attempt writes a row — failures
      included, because an unrecorded failure is how a partner gets three
      copies of the same letter.
   3. It never retries. One call, one attempt. A loop that "makes sure it got
      there" is a loop that mails somebody five times.
   4. It never touches the partner's status or next_follow_up. 0017 made those
      read-only to agents and sending a letter does not change what the
      relationship IS — only the founder decides that, in /admin/partners.

   REPLY-TO IS THE SALES INBOX, the pattern §6.3 requires and the same one
   /api/wholesale already uses: the letter comes FROM the verified domain so
   Resend will carry it, and a reply lands where wholesale replies land.
--------------------------------------------------------------------------- */

/** The partner facts the send path needs, read fresh at send time. */
export type SendablePartner = {
  id: string;
  company: string;
  email: string | null;
  locale: "en" | "uk";
  status: string;
};

export async function fetchPartnerForSend(id: string): Promise<SendablePartner | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("wholesale_partners")
      .select("id, company, email, locale, status")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("[followups] partner read failed:", error.code, error.message);
      return null;
    }
    if (!data) return null;

    const row = data as Record<string, unknown>;
    return {
      id: String(row.id),
      company: String(row.company),
      email: (row.email as string | null) ?? null,
      locale: row.locale === "uk" ? "uk" : "en",
      status: String(row.status),
    };
  } catch (e) {
    console.error("[followups] partner read threw:", e);
    return null;
  }
}

/** Every send attempt, newest first, grouped by partner for the page. */
export async function fetchPartnerMessages(
  limit = 500
): Promise<Record<string, PartnerMessage[]> | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("partner_messages")
      .select("id, partner_id, to_email, locale, subject, status, error, sent_by, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[followups] messages read failed:", error.code, error.message);
      return null;
    }

    const byPartner: Record<string, PartnerMessage[]> = {};
    for (const r of data ?? []) {
      const row = r as Record<string, unknown>;
      const partnerId = String(row.partner_id);
      (byPartner[partnerId] ??= []).push({
        id: String(row.id),
        partnerId,
        toEmail: String(row.to_email),
        locale: row.locale === "uk" ? "uk" : "en",
        subject: String(row.subject),
        status: row.status === "sent" ? "sent" : "failed",
        error: (row.error as string | null) ?? null,
        sentBy: String(row.sent_by),
        createdAt: String(row.created_at),
      });
    }
    return byPartner;
  } catch (e) {
    console.error("[followups] messages read threw:", e);
    return null;
  }
}

/** Messages for one partner, for the cooldown check at send time. */
export async function fetchMessagesForPartner(partnerId: string): Promise<PartnerMessage[] | null> {
  const all = await fetchPartnerMessages(500);
  if (all === null) return null;
  return all[partnerId] ?? [];
}

async function recordAttempt(input: {
  partnerId: string;
  toEmail: string;
  locale: "en" | "uk";
  subject: string;
  body: string;
  status: "sent" | "failed";
  error: string | null;
  sentBy: string;
}): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("partner_messages").insert({
      partner_id: input.partnerId,
      to_email: input.toEmail,
      locale: input.locale,
      subject: input.subject,
      body: input.body,
      kind: "followup",
      status: input.status,
      error: input.error,
      sent_by: input.sentBy,
    });
    if (error) {
      console.error("[followups] record failed:", error.code, error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[followups] record threw:", e);
    return false;
  }
}

export type SendOutcome =
  | { ok: true }
  /** The letter WENT but the log did not. Surfaced loudly — the founder must
      not press send again on the strength of a missing record. */
  | { ok: false; error: "sent_not_recorded" }
  | { ok: false; error: "not_configured" | "send_failed" };

/**
 * Send one follow-up, to one partner, now.
 *
 * `toEmail` is passed in by the caller only so the action can prove it read
 * the same address the founder confirmed against — it must already have come
 * from fetchPartnerForSend, never from a form field.
 */
export async function sendFollowUp(input: {
  partnerId: string;
  toEmail: string;
  locale: "en" | "uk";
  subject: string;
  body: string;
  sentBy: string;
}): Promise<SendOutcome> {
  const mail = buildFollowUpMail({
    locale: input.locale,
    subject: input.subject,
    body: input.body,
  });

  const res = await sendMail({
    to: input.toEmail,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
    // Same shape as the wholesale auto-reply: from the verified domain,
    // replies to the sales inbox (§6.3).
    from: `Tactical HB <${ADMIN_EMAIL}>`,
    replyTo: SALES_EMAIL,
  });

  const recorded = await recordAttempt({
    partnerId: input.partnerId,
    toEmail: input.toEmail,
    locale: input.locale,
    subject: input.subject,
    body: input.body,
    status: res.ok ? "sent" : "failed",
    error: res.ok ? null : res.error,
    sentBy: input.sentBy,
  });

  if (!res.ok) return { ok: false, error: res.error };
  if (!recorded) return { ok: false, error: "sent_not_recorded" };
  return { ok: true };
}
