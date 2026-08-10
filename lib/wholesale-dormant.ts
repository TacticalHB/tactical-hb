import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_EMAIL, SALES_EMAIL } from "@/lib/contact-info";
import { sendMail } from "@/lib/email";
import { buildFollowUpMail } from "@/lib/followup-email";

/* ---------------------------------------------------------------------------
   The wholesale dormant check-in.

   A B2B PARTNER WHO HAS GONE QUIET GETS ONE PROFESSIONAL LETTER. Not a
   newsletter, not a promotion, and never the consumer creative: it goes
   through buildFollowUpMail — the same plain shell the founder's own partner
   letters use — so what lands in a buyer's inbox reads like correspondence
   rather than a campaign. The two lists never meet. A partner is not a
   subscriber, wholesale_partners is not `subscribers`, and nothing here reads
   or writes the consumer tables.

   A SCAN, NOT A QUEUE, and that is deliberate. Nothing HAPPENS to trigger this
   — no click, no purchase, no signup — so there is no event to hang a job on.
   A nightly pass asks who has gone quiet and, crucially, asks it at the moment
   of sending. A queued job would have to be found and cancelled when an order
   arrived; a scan that re-checks cannot go stale, so "suppress when a new
   order arrives" needs no cancellation code at all — a partner who ordered
   yesterday simply does not match tomorrow.

   THE COOLDOWN LIVES IN partner_messages, not in a column of its own. That
   table already records every letter sent to a partner, founder-written and
   automatic alike, so it already answers "when did we last write to them" —
   and both kinds must count against the same silence. A separate
   last_follow_up_at would be a second answer to the same question, free to
   drift from the first.

   EVERY ATTEMPT IS RECORDED, failures included. An unrecorded failure is how
   a partner gets three copies of the same letter.
--------------------------------------------------------------------------- */

/** Quiet for this long since their last order, and they are worth a note. */
export const DORMANT_AFTER_DAYS = 90;

/**
 * Approved but never ordered at all: a longer rope before the first nudge.
 * Measured from `created_at`, which for an approved partner is when the record
 * was made — the only date on the row that always exists. `next_follow_up` is
 * the founder's own field and is left alone, exactly as 0017 requires.
 */
export const NEVER_ORDERED_AFTER_DAYS = 120;

/** Two letters to the same partner may not fall closer together than this. */
export const FOLLOW_UP_COOLDOWN_DAYS = 90;

/** How many go out in one pass. A quiet flow; a small ceiling is a feature. */
const MAX_PER_RUN = 10;

const DAY = 24 * 60 * 60 * 1000;

type PartnerRow = {
  id: string;
  company: string;
  contact_name: string | null;
  email: string | null;
  locale: string;
  status: string;
  created_at: string;
};

export type DormantRunResult = {
  considered: number;
  sent: number;
  skipped: number;
  failed: number;
};

/* ---- the letter ---------------------------------------------------------- */

const SITE = (process.env.SITE_URL || "https://tactical-hb.com").replace(/\/$/, "");

/**
 * Short, straight, and it asks for a reply rather than a click.
 *
 * NO DISCOUNT AND NO OFFER. A percentage in a first check-in tells a buyer
 * their price was negotiable all along, which is a worse position than the
 * silence it was meant to break.
 */
function dormantLetter(partner: PartnerRow, uk: boolean): { subject: string; body: string } {
  const who = partner.contact_name?.trim() || partner.company.trim();

  if (uk) {
    return {
      subject: "Як справи? — оптова співпраця Tactical HB",
      body: [
        `Доброго дня, ${who},`,
        "Помітили, що замовлень від вас не було вже певний час — пишемо без жодного тиску, просто щоб бути на зв'язку.",
        "Якщо потрібно звірити наявність, уточнити ціни на поточний обсяг або спланувати наступне відвантаження — відповідайте на цей лист, і ми все підготуємо.",
        `Умови й асортимент: ${SITE}/uk/wholesale`,
        "Гарного тижня,\nTactical HB",
      ].join("\n\n"),
    };
  }

  return {
    subject: "Checking in — Tactical HB wholesale",
    body: [
      `Hello ${who},`,
      "We noticed it's been a while since your last order — no pressure at all, just keeping in touch.",
      "If it would help to check stock, go over pricing for your current volume, or plan the next shipment, reply to this email and we'll get it ready.",
      `Terms and range: ${SITE}/en/wholesale`,
      "Best,\nTactical HB",
    ].join("\n\n"),
  };
}

/* ---- the scan ------------------------------------------------------------ */

/**
 * One dormant pass. Safe to call repeatedly; never throws.
 *
 * The order of the checks is the order of cheapness: status and email are on
 * the row, the cooldown is one indexed query, and the last-order date is the
 * one that costs a join — so a partner who was written to last week is
 * discarded before we ever ask when they last bought.
 */
export async function runWholesaleDormant(): Promise<DormantRunResult> {
  const out: DormantRunResult = { considered: 0, sent: 0, skipped: 0, failed: 0 };

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    console.error("[dormant] no admin client:", e);
    return out;
  }

  // ACTIVE PARTNERS ONLY. 'dormant' as a status is the founder's own decision
  // that a relationship has ended, and a letter chasing it would contradict
  // them; 'lead' and 'contacted' have no relationship to revive yet.
  const { data, error } = await admin
    .from("wholesale_partners")
    .select("id, company, contact_name, email, locale, status, created_at")
    .eq("status", "active");

  if (error) {
    console.error("[dormant] partner read failed:", error.code, error.message);
    return out;
  }

  const partners = (data ?? []) as PartnerRow[];
  const now = Date.now();

  for (const p of partners) {
    if (out.sent >= MAX_PER_RUN) break;
    out.considered++;

    // No address, nothing to send. An enquiry can arrive by Instagram.
    if (!p.email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(p.email)) {
      out.skipped++;
      continue;
    }

    // 1. Have we written to them recently — by any hand, automatic or founder?
    const { data: recent } = await admin
      .from("partner_messages")
      .select("id")
      .eq("partner_id", p.id)
      .eq("status", "sent")
      .gte("created_at", new Date(now - FOLLOW_UP_COOLDOWN_DAYS * DAY).toISOString())
      .limit(1);

    if ((recent ?? []).length) {
      out.skipped++;
      continue;
    }

    // 2. When did they last buy? Orders carry wholesale_partner_id from 0017.
    const { data: lastOrder } = await admin
      .from("orders")
      .select("created_at")
      .eq("wholesale_partner_id", p.id)
      .order("created_at", { ascending: false })
      .limit(1);

    const last = (lastOrder ?? [])[0] as { created_at?: string } | undefined;

    // Never ordered gets the longer rope, measured from when the record was
    // made; otherwise the clock runs from the last order.
    const since = last?.created_at ? Date.parse(last.created_at) : Date.parse(p.created_at);
    const threshold = last?.created_at ? DORMANT_AFTER_DAYS : NEVER_ORDERED_AFTER_DAYS;
    if (!Number.isFinite(since) || now - since < threshold * DAY) {
      out.skipped++;
      continue;
    }

    // 3. Write.
    const uk = p.locale === "uk";
    const { subject, body } = dormantLetter(p, uk);
    const mail = buildFollowUpMail({ locale: uk ? "uk" : "en", subject, body });

    const res = await sendMail({
      to: p.email,
      // From the verified domain so Resend will carry it; replies land in the
      // sales inbox, which is where a wholesale reply belongs. Same pattern as
      // the founder's own follow-up and /api/wholesale.
      from: `Tactical HB <${ADMIN_EMAIL}>`,
      replyTo: SALES_EMAIL,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });

    // Recorded either way — a failed row is the evidence for a later retry and
    // the reason a silent loop cannot form.
    const { error: logErr } = await admin.from("partner_messages").insert({
      partner_id: p.id,
      to_email: p.email,
      locale: uk ? "uk" : "en",
      subject: mail.subject,
      body,
      kind: "dormant",
      status: res.ok ? "sent" : "failed",
      error: res.ok ? null : String(res.error),
      /* sent_by is `not null` because 0023 required every letter to name the
         human who pressed send. A cron has no human, so it names itself
         instead — and in a form no address could ever collide with, so a row
         written by the scan can never be misread as the founder's own. The
         migration widens that column's meaning in step with this. */
      sent_by: "system:dormant-cron",
    });
    if (logErr) console.error("[dormant] could not record the send:", logErr.code, logErr.message);

    if (res.ok) out.sent++;
    else out.failed++;
  }

  console.log("[dormant]", JSON.stringify(out));
  return out;
}
