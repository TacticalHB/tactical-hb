import type { Partner } from "@/lib/partners-display";

/* ---------------------------------------------------------------------------
   The Wholesale Follow-up Agent's judgement and its letters. Pure and
   I/O-free; the partner rows arrive from lib/partners-admin.ts, already
   carrying their order aggregates.

   NOTHING IN THIS FILE SENDS, and nothing in it knows how. The judgement and
   the words live here; the send path added in Phase F lives in
   lib/followup-admin.ts, behind an admin action that re-derives every fact it
   needs rather than trusting the page.

   THE GATE, as it now stands (§6.3, "never sends email without explicit
   approval"): the founder opens one partner, reads the draft, edits it if it
   needs editing, presses Send, and then confirms against the actual address
   the letter will go to. There is no bulk send, no scheduled send, and no
   cron path that can reach a partner's inbox — the Monday job may still only
   write to the founder. Every attempt is recorded in partner_messages (0023),
   and a successful one shuts the button for SEND_COOLDOWN_DAYS.

   WHO COUNTS AS QUIET. A partner with a live relationship — active, or
   already marked dormant — whose last countable order is QUIET_DAYS behind
   us. Leads that never ordered are the CRM's business (/admin/partners and
   next_follow_up cover them); this agent's one job is warmth that is going
   cold. next_follow_up is read only to be respected: a partner the founder
   has already scheduled a nudge for is not nagged about twice.
--------------------------------------------------------------------------- */

/** "Quiet for 3–4 months" (plan §6.3), taken at the three-month edge. */
export const QUIET_DAYS = 90;

/**
 * How long after a follow-up the send button stays shut for that partner.
 *
 * Silence is not a reason to write again. A partner stays "quiet" until they
 * ORDER — which means that without this, the same company could be nudged
 * every time the page is opened, and the agent's whole purpose (warmth) would
 * become its opposite. Two weeks is the shortest gap at which a second letter
 * reads as persistence rather than pestering.
 *
 * It is a block, not a warning. The escape hatch is the one that always
 * existed: copy the draft and write from your own mail client, where a human
 * is unambiguously the sender.
 */
export const SEND_COOLDOWN_DAYS = 14;

export type FollowUpCandidate = {
  partner: Partner;
  /** Days since the last countable order, or since the record was created
      when no order was ever linked. */
  daysQuiet: number;
  /** True when the founder already has next_follow_up set on or before today
      — the CRM will surface it, so this page lists it without pressing. */
  alreadyScheduled: boolean;
};

function daysBetween(fromIso: string, todayIso: string): number {
  const from = new Date(fromIso).getTime();
  const to = new Date(`${todayIso}T00:00:00Z`).getTime();
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.max(0, Math.floor((to - from) / (24 * 60 * 60 * 1000)));
}

/**
 * The quiet list, quietest first. `today` is YYYY-MM-DD, passed in so the
 * judgement is reproducible — the same inputs must give the weekly brief and
 * the page the same answer.
 */
export function quietPartners(partners: Partner[], today: string): FollowUpCandidate[] {
  return partners
    .filter((p) => p.status === "active" || p.status === "dormant")
    .map((p) => ({
      partner: p,
      daysQuiet: daysBetween(p.lastOrderAt ?? p.createdAt, today),
      alreadyScheduled: p.nextFollowUp !== null && p.nextFollowUp <= today,
    }))
    .filter((c) => c.daysQuiet >= QUIET_DAYS)
    .sort((a, b) => b.daysQuiet - a.daysQuiet);
}

export type Draft = { subject: string; body: string };

/** One row of partner_messages (0023) — a send that was attempted. */
export type PartnerMessage = {
  id: string;
  partnerId: string;
  toEmail: string;
  locale: "en" | "uk";
  subject: string;
  status: "sent" | "failed";
  error: string | null;
  sentBy: string;
  createdAt: string;
};

/**
 * Whether a partner may be sent to right now, and why not when they may not.
 *
 * Only SUCCESSFUL sends start a cooldown. A failed attempt left the partner
 * with nothing, so refusing to try again would strand them behind a wall
 * built by an outage.
 */
export function sendBlock(
  messages: PartnerMessage[],
  nowIso: string
): { blocked: false } | { blocked: true; lastSentAt: string; daysAgo: number } {
  const lastSent = messages
    .filter((m) => m.status === "sent")
    .map((m) => m.createdAt)
    .sort()
    .at(-1);

  if (!lastSent) return { blocked: false };

  const days = Math.floor(
    (new Date(nowIso).getTime() - new Date(lastSent).getTime()) / (24 * 60 * 60 * 1000)
  );
  if (!Number.isFinite(days) || days >= SEND_COOLDOWN_DAYS) return { blocked: false };

  return { blocked: true, lastSentAt: lastSent, daysAgo: Math.max(0, days) };
}

/**
 * The letter, in one language. Deliberately plain and short: a template that
 * sounds like a campaign gets deleted; three sentences from a person get
 * answered. No invented facts — it mentions the last order only when one is
 * actually linked, and promises nothing (no discounts the founder didn't
 * offer). The founder edits before sending; this is a head start, not a
 * script.
 */
export function followUpDraft(c: FollowUpCandidate, uk: boolean): Draft {
  const p = c.partner;
  const name = p.contactName?.split(/\s+/)[0] ?? null;
  const months = Math.max(3, Math.round(c.daysQuiet / 30));
  const hasOrdered = p.lastOrderAt !== null && p.orderCount > 0;

  if (uk) {
    const greeting = name ? `Вітаю, ${name}!` : `Вітаю!`;
    const opener = hasOrdered
      ? `Давно не було вістей від ${p.company} — з часу вашого останнього замовлення минуло вже близько ${months} місяців.`
      : `Давно не було вістей від ${p.company}.`;
    return {
      subject: `Tactical HB — як справи у ${p.company}?`,
      body: [
        greeting,
        ``,
        opener,
        `Хотів дізнатись, як ідуть продажі і чи потрібно щось із нашого асортименту — все з каталогу зараз доступне, і я радо підготую актуальні гуртові умови.`,
        ``,
        `Якщо зручніше, просто дайте знати, коли зателефонувати.`,
        ``,
        `З повагою,`,
        `Tactical HB`,
      ].join("\n"),
    };
  }

  const greeting = name ? `Hi ${name},` : `Hello,`;
  const opener = hasOrdered
    ? `It has been about ${months} months since the last order from ${p.company}, and I wanted to check in.`
    : `It has been a while since we last heard from ${p.company}, and I wanted to check in.`;
  return {
    subject: `Tactical HB — checking in with ${p.company}`,
    body: [
      greeting,
      ``,
      opener,
      `How are sales going on your side? Everything in our range is currently available, and I would be glad to put together up-to-date wholesale terms if you are restocking.`,
      ``,
      `If a call is easier, just tell me a good time.`,
      ``,
      `Best regards,`,
      `Tactical HB`,
    ].join("\n"),
  };
}

/**
 * Every refusal the send action can return, in both languages.
 *
 * It lives here rather than beside the action because a "use server" module
 * may only export async functions — and because the card that renders these
 * is a client component, which must not pull the send path into the browser
 * bundle to read a list of strings.
 */
export function sendErrors(uk: boolean): Record<string, string> {
  return {
    not_authorised: uk ? "Немає доступу." : "Not authorised.",
    not_found: uk ? "Партнера не знайдено." : "That partner no longer exists.",
    no_subject: uk ? "Тема не може бути порожньою." : "The subject can't be empty.",
    subject_too_long: uk ? "Тема задовга." : "That subject is too long.",
    no_body: uk ? "Лист не може бути порожнім." : "The letter can't be empty.",
    body_too_long: uk ? "Лист задовгий." : "That letter is too long.",
    no_email: uk
      ? "У цього партнера немає email — напишіть іншим каналом."
      : "This partner has no email address — reach them another way.",
    not_sendable: uk
      ? "Писати можна лише активним або затихлим партнерам."
      : "Only active or dormant partners can be written to.",
    history_unreadable: uk
      ? "Не вдалося прочитати історію листів, тому лист не надіслано. Спробуйте ще раз."
      : "Couldn't read the send history, so nothing was sent. Try again.",
    too_soon: uk
      ? `Цьому партнеру вже писали за останні ${SEND_COOLDOWN_DAYS} днів. Скопіюйте лист і надішліть зі своєї пошти, якщо це терміново.`
      : `This partner was written to within the last ${SEND_COOLDOWN_DAYS} days. Copy the draft and send it from your own mail if it can't wait.`,
    not_configured: uk
      ? "RESEND_API_KEY не налаштовано — лист не надіслано."
      : "RESEND_API_KEY isn't configured — nothing was sent.",
    send_failed: uk
      ? "Пошта не прийняла лист. Спробу записано; лист не надіслано."
      : "The mail service rejected the letter. The attempt is logged; nothing was sent.",
    sent_not_recorded: uk
      ? "ЛИСТ НАДІСЛАНО, але записати його не вдалося. Не надсилайте вдруге — перевірте, чи дійшов лист."
      : "THE LETTER WAS SENT but could not be logged. Do not send again — check that it arrived.",
  };
}

/**
 * A mailto: link that opens the founder's OWN mail client with the draft
 * loaded. The mail that eventually leaves is composed, addressed and sent by
 * the founder there — the system's involvement ends at the href.
 */
export function draftMailto(email: string, draft: Draft): string {
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
    draft.subject
  )}&body=${encodeURIComponent(draft.body)}`;
}
