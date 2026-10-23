import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMail } from "@/lib/email";
import { buildApplicationReminder } from "@/lib/wholesale-email";
import { ADMIN_EMAIL, SALES_EMAIL } from "@/lib/contact-info";
import { SITE_URL } from "@/lib/seo";

/* ---------------------------------------------------------------------------
   The one "finish your application" reminder (23 Oct 2026).

   Two days after registering, an applicant whose online application is still
   not complete gets ONE short letter with a button back to it. Run from the
   morning cron (app/api/cron/email-queue).

   ONLY REGISTRATIONS FROM THE ONLINE FORM ONWARDS. Before it, applicants were
   sent a PDF to return by email — some of them did, into an inbox this code
   cannot see. Reminding them to "finish" an application they may already
   have sent would be wrong data, so anything registered before
   ONLINE_APPLICATION_SINCE is left alone.

   CLAIMED BEFORE SENT, like the shipping email: application_reminded_at is
   taken with a conditional update first, so two overlapping runs cannot both
   mail the same person; a failed send releases the claim.
   Never throws.
--------------------------------------------------------------------------- */

export const ONLINE_APPLICATION_SINCE = "2026-10-24T00:00:00Z";
const AFTER_MS = 48 * 3600 * 1000;

export async function remindUnfinishedApplications(): Promise<{ sent: number; skipped?: string }> {
  try {
    const db = createAdminClient();
    const before = new Date(Date.now() - AFTER_MS).toISOString();
    const { data, error } = await db
      .from("wholesale_partners")
      .select("id, email, locale, company")
      .eq("account_status", "pending")
      .not("user_id", "is", null)
      .is("application_completed_at", null)
      .is("application_reminded_at", null)
      .gte("created_at", ONLINE_APPLICATION_SINCE)
      .lt("created_at", before)
      .limit(20);
    if (error) {
      // 42703: migration 0048 not run yet — nothing to remind about.
      if (error.code !== "42703") console.error("[wholesale-reminders] list failed:", error.code, error.message);
      return { sent: 0, skipped: error.code };
    }

    let sent = 0;
    for (const p of data ?? []) {
      if (!p.email) continue;
      const now = new Date().toISOString();
      const { data: claimed } = await db
        .from("wholesale_partners")
        .update({ application_reminded_at: now })
        .eq("id", p.id)
        .is("application_reminded_at", null)
        .is("application_completed_at", null) // finished since the list was read → leave them be
        .select("id")
        .maybeSingle();
      if (!claimed) continue;

      const mail = buildApplicationReminder(String(p.locale ?? "en"), SITE_URL);
      const res = await sendMail({
        to: String(p.email),
        from: `Tactical HB <${ADMIN_EMAIL}>`,
        replyTo: SALES_EMAIL,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      });
      if (res.ok) {
        sent += 1;
      } else {
        console.error("[wholesale-reminders] send failed for", p.company, "-", res.error);
        await db.from("wholesale_partners").update({ application_reminded_at: null }).eq("id", p.id);
      }
    }
    return { sent };
  } catch (e) {
    console.error("[wholesale-reminders] failed:", e);
    return { sent: 0, skipped: "error" };
  }
}
