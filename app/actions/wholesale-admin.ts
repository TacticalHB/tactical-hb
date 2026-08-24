"use server";

import { revalidatePath } from "next/cache";
import { requireAdminActor } from "@/lib/admin-guard";
import { setAccountStatus, setRequestStatus } from "@/lib/wholesale-portal";
import { isAccountStatus, isRequestStatus } from "@/lib/wholesale-display";

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

  const ok = await setAccountStatus(id, status, actor);
  if (!ok) return { ok: false, error: "write_failed" };

  // Named so it is greppable: this line is the moment a partner gains or
  // loses dealer pricing, and it should be findable in the logs.
  console.info(`[wholesale] ${actor} set account_status=${status} for partner ${id}`);

  revalidatePath("/[locale]/admin/partners", "page");
  revalidatePath("/[locale]/admin/wholesale", "page");
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
