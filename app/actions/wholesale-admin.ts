"use server";

import { revalidatePath } from "next/cache";
import { requireAdminActor } from "@/lib/admin-guard";
import { setAccountStatus, setPartnerType, setRequestStatus } from "@/lib/wholesale-portal";
import { isPartnerType } from "@/lib/wholesale-prices";
import { isAccountStatus, isRequestStatus } from "@/lib/wholesale-display";
import { buildDecisionMail } from "@/lib/wholesale-decision-email";
import { sendMail } from "@/lib/email";
import { ADMIN_EMAIL, SALES_EMAIL } from "@/lib/contact-info";

/* ---------------------------------------------------------------------------
   The two verbs only an admin has.

   Kept in their own file rather than beside the partner-facing actions,
   because that separation is the security model made visible: nothing a
   partner can call is in this file, and nothing in this file runs without
   requireAdminActor() first. Approval is the whole gate — see 0030 — so the
   function that grants it should be somewhere you can read in one screen.

   Authorisation is re-established here, never inherited from the page that
   rendered the button. Same reasoning as app/actions/stock.ts: a server action
   is a public endpoint and the page it came from proves nothing.
--------------------------------------------------------------------------- */

export type AdminResult = { ok: true } | { ok: false; error: string };

/** Approve, reject or suspend a partner's portal access. */
export async function setPartnerAccountStatus(
  partnerId: string,
  status: string
): Promise<AdminResult> {
  const actor = await requireAdminActor();
  if (!actor) return { ok: false, error: "forbidden" };

  if (!isAccountStatus(status)) return { ok: false, error: "bad_status" };
  const id = String(partnerId ?? "").trim();
  if (!id) return { ok: false, error: "not_found" };

  const result = await setAccountStatus(id, status, actor);
  if (!result.ok) return { ok: false, error: "write_failed" };

  // Named so it is greppable: this line is the moment a partner gains or
  // loses dealer pricing, and it should be findable in the logs.
  console.info(
    `[wholesale] ${actor} set account_status=${status} (was ${result.previous ?? "unknown"}) for partner ${id}`
  );

  /* THE PARTNER IS TOLD, because approving unlocks the portal silently. They
     posted a form days ago and went back to work — without this the flow ends
     in a door that quietly unlocked and nobody knocked on.

     Only when the status actually CHANGED: re-approving an already-approved
     partner (a stray double click, a status set back after a suspension that
     was itself an accident) must not send "congratulations" twice.

     Suspension sends nothing by design — see lib/wholesale-decision-email. */
  if (result.previous !== status && result.email) {
    const site = (process.env.SITE_URL || "https://tactical-hb.com").replace(/\/$/, "");
    const letter = buildDecisionMail(status, result.locale ?? "en", site, result.businessType);
    if (letter) {
      const sent = await sendMail({
        to: result.email,
        from: `Tactical HB <${ADMIN_EMAIL}>`,
        replyTo: SALES_EMAIL,
        subject: letter.subject,
        html: letter.html,
        text: letter.text,
      });
      // Loud but not fatal: the status change is already saved, and the whole
      // point of this letter is that nobody is watching the screen.
      if (!sent.ok) {
        console.error(`[wholesale] ${status} letter NOT sent to ${result.email} -`, sent.error);
      }
    }
  }

  revalidatePath("/[locale]/admin/partners", "page");
  revalidatePath("/[locale]/admin/wholesale", "page");
  return { ok: true };
}

/** Assign the price book. Admin-only, and the portal is worthless without it. */
export async function setPartnerPriceBook(
  partnerId: string,
  type: string | null
): Promise<AdminResult> {
  const actor = await requireAdminActor();
  if (!actor) return { ok: false, error: "forbidden" };

  const id = String(partnerId ?? "").trim();
  if (!id) return { ok: false, error: "not_found" };

  /* Empty string clears it — which is a legitimate thing to want: a partner
     whose channel is under review should see no prices rather than the last
     ones somebody guessed at. Anything else must be a real book. */
  const next = type ? (isPartnerType(type) ? type : null) : null;
  if (type && !next) return { ok: false, error: "bad_type" };

  if (!(await setPartnerType(id, next))) return { ok: false, error: "write_failed" };
  console.info(`[wholesale] ${actor} set partner_type=${next ?? "none"} for partner ${id}`);

  revalidatePath("/[locale]/admin/partners", "page");
  return { ok: true };
}

/** Move a submitted request along its ladder — contacted, payment sent, paid. */
export async function updateRequestStatus(
  requestId: string,
  status: string
): Promise<AdminResult> {
  const actor = await requireAdminActor();
  if (!actor) return { ok: false, error: "forbidden" };

  if (!isRequestStatus(status)) return { ok: false, error: "bad_status" };
  const id = String(requestId ?? "").trim();
  if (!id) return { ok: false, error: "not_found" };

  const ok = await setRequestStatus(id, status);
  if (!ok) return { ok: false, error: "write_failed" };

  revalidatePath("/[locale]/admin/wholesale", "page");
  return { ok: true };
}
