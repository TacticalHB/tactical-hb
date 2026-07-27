"use server";

import { revalidatePath } from "next/cache";
import { requireAdminActor } from "@/lib/admin-guard";
import {
  fetchMessagesForPartner,
  fetchPartnerForSend,
  sendFollowUp,
} from "@/lib/followup-admin";
import { sendBlock } from "@/lib/followup-display";

/* ---------------------------------------------------------------------------
   Admin: sending one wholesale follow-up (§6.3).

   THIS IS THE ONLY PATH IN THE CODEBASE BY WHICH AN AGENT'S WORDS REACH
   SOMEONE OUTSIDE THE COMPANY, so it is deliberately the most suspicious
   action in the project. It re-establishes every fact for itself:

   · WHO IS SENDING — requireAdminActor(), because Next exposes every server
     action as its own endpoint and the page's guard protects the page, not
     this.
   · WHO IT GOES TO — read from wholesale_partners by id. The form supplies a
     subject and a body, both of which the founder wrote; it does not supply
     an address, and there is no parameter here through which it could.
   · WHETHER THEY MAY BE WRITTEN TO AT ALL — status must be a live
     relationship, and the cooldown is re-checked here even though the button
     is already disabled in the UI. A disabled button is a courtesy; this is
     the rule.

   There is no bulk variant of this function, no scheduled caller, and no
   argument that would make it send to more than one company. If a future
   phase wants "send to everyone quiet", it needs a new conversation with the
   founder, not a loop around this.
--------------------------------------------------------------------------- */

export type SendResult = { ok: true } | { ok: false; error: string };

const MAX_SUBJECT = 200;
const MAX_BODY = 5000;

/** Statuses that represent a live relationship worth warming (§6.3). */
const SENDABLE = new Set(["active", "dormant"]);

export async function sendFollowUpEmail(input: {
  partnerId: string;
  locale: string;
  subject: string;
  body: string;
}): Promise<SendResult> {
  const actor = await requireAdminActor();
  if (!actor) return { ok: false, error: "not_authorised" };

  const partnerId = String(input.partnerId ?? "").trim();
  if (!partnerId) return { ok: false, error: "not_found" };

  const subject = String(input.subject ?? "").trim();
  if (!subject) return { ok: false, error: "no_subject" };
  if (subject.length > MAX_SUBJECT) return { ok: false, error: "subject_too_long" };

  const body = String(input.body ?? "").trim();
  if (!body) return { ok: false, error: "no_body" };
  if (body.length > MAX_BODY) return { ok: false, error: "body_too_long" };

  const locale = input.locale === "uk" ? "uk" : "en";

  // The recipient, and the right to write to them, come from the database.
  const partner = await fetchPartnerForSend(partnerId);
  if (partner === null) return { ok: false, error: "not_found" };
  if (!partner.email) return { ok: false, error: "no_email" };
  if (!SENDABLE.has(partner.status)) return { ok: false, error: "not_sendable" };

  const messages = await fetchMessagesForPartner(partnerId);
  // Unreadable history means an unknown cooldown, and an unknown cooldown is
  // not a licence to send — this is the one place where "we don't know" must
  // resolve to "no".
  if (messages === null) return { ok: false, error: "history_unreadable" };

  const block = sendBlock(messages, new Date().toISOString());
  if (block.blocked) return { ok: false, error: "too_soon" };

  const res = await sendFollowUp({
    partnerId: partner.id,
    toEmail: partner.email,
    locale,
    subject,
    body,
    sentBy: actor,
  });

  revalidatePath("/[locale]/admin/followups", "page");
  revalidatePath("/[locale]/admin/partners", "page");

  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true };
}
