import type { Partner } from "@/lib/partners-display";

/* ---------------------------------------------------------------------------
   The Wholesale Follow-up Agent's judgement and its letters. Pure and
   I/O-free; the partner rows arrive from lib/partners-admin.ts, already
   carrying their order aggregates.

   NOTHING HERE SENDS. There is no Resend import anywhere in this agent, in
   either half — the drafts exist to be copied into the founder's own mail
   client, where the founder reads them, edits them, and decides. That is the
   Phase C gate stated in the plan (§6.3) and tightened by the founder for
   this phase: drafts only, nothing sends. When a later phase adds a send
   button, the Reply-To must be the sales inbox pattern the site already uses.

   WHO COUNTS AS QUIET. A partner with a live relationship — active, or
   already marked dormant — whose last countable order is QUIET_DAYS behind
   us. Leads that never ordered are the CRM's business (/admin/partners and
   next_follow_up cover them); this agent's one job is warmth that is going
   cold. next_follow_up is read only to be respected: a partner the founder
   has already scheduled a nudge for is not nagged about twice.
--------------------------------------------------------------------------- */

/** "Quiet for 3–4 months" (plan §6.3), taken at the three-month edge. */
export const QUIET_DAYS = 90;

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
 * A mailto: link that opens the founder's OWN mail client with the draft
 * loaded. The mail that eventually leaves is composed, addressed and sent by
 * the founder there — the system's involvement ends at the href.
 */
export function draftMailto(email: string, draft: Draft): string {
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
    draft.subject
  )}&body=${encodeURIComponent(draft.body)}`;
}
