"use server";

import { revalidatePath } from "next/cache";
import { requireAdminActor } from "@/lib/admin-guard";
import {
  deletePartnerRecord,
  insertPartner,
  updatePartnerRecord,
  linkMatchingOrders as linkMatching,
  linkOrderByReference as linkByRef,
  unlinkOrder as unlink,
} from "@/lib/partners-admin";
import { isPartnerStatus } from "@/lib/partners-display";

/* ---------------------------------------------------------------------------
   Admin: the wholesale CRM's writes.

   Authorisation is re-established here, not inherited from the page — see
   app/actions/stock.ts for the full reasoning. Every mutation is an explicit
   admin act; in particular the order-linking ones, because a linked order is
   what the CRM (and later the finance channel split) counts as wholesale
   revenue. No code path links an order automatically.

   Error strings returned to the UI are keys where the cause is one the form
   can phrase better bilingually (duplicate_email, not_found, …), and raw
   messages otherwise.
--------------------------------------------------------------------------- */

export type PartnerResult = { ok: true } | { ok: false; error: string };

function parseDate(raw: string): string | null {
  const s = String(raw ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : s;
}

function cleanEmail(raw: string): string | null | undefined {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  // Loose on purpose — the point is catching a phone number pasted into the
  // wrong box, not re-implementing the RFC.
  return /^\S+@\S+\.\S+$/.test(s) ? s : undefined;
}

type PartnerFields = {
  company?: string;
  contactName: string;
  email: string;
  phone: string;
  country: string;
  locale: string;
  status: string;
  nextFollowUp: string;
  notes: string;
};

function parseFields(form: PartnerFields) {
  const email = cleanEmail(form.email);
  if (email === undefined) return { error: "bad_email" as const };

  if (!isPartnerStatus(form.status)) return { error: "bad_status" as const };

  const followRaw = form.nextFollowUp?.trim();
  const nextFollowUp = followRaw ? parseDate(followRaw) : null;
  if (followRaw && !nextFollowUp) return { error: "bad_date" as const };

  return {
    error: null,
    fields: {
      contactName: form.contactName?.trim() || null,
      email,
      phone: form.phone?.trim() || null,
      country: form.country?.trim() || null,
      locale: form.locale === "uk" ? ("uk" as const) : ("en" as const),
      status: form.status,
      nextFollowUp,
      notes: form.notes?.trim() || null,
    },
  };
}

/** Add a partner to the register. */
export async function createPartner(form: PartnerFields): Promise<PartnerResult> {
  const actor = await requireAdminActor();
  if (!actor) return { ok: false, error: "Not authorised." };

  const company = form.company?.trim();
  if (!company) return { ok: false, error: "no_company" };

  const parsed = parseFields(form);
  if (parsed.error) return { ok: false, error: parsed.error };

  const res = await insertPartner({ company, ...parsed.fields, createdBy: actor });
  if (!res.ok) return res;

  revalidatePath("/[locale]/admin/partners", "page");
  return { ok: true };
}

/** Save edits to a partner — status moves live here too. */
export async function updatePartner(id: string, form: PartnerFields): Promise<PartnerResult> {
  const actor = await requireAdminActor();
  if (!actor) return { ok: false, error: "Not authorised." };
  if (!id?.trim()) return { ok: false, error: "not_found" };

  const parsed = parseFields(form);
  if (parsed.error) return { ok: false, error: parsed.error };

  const res = await updatePartnerRecord(id, parsed.fields);
  if (!res.ok) return res;

  revalidatePath("/[locale]/admin/partners", "page");
  return { ok: true };
}

/** Link every unlinked order whose email matches this partner's. */
export async function linkMatchingOrders(
  partnerId: string
): Promise<{ ok: true; linked: number } | { ok: false; error: string }> {
  const actor = await requireAdminActor();
  if (!actor) return { ok: false, error: "Not authorised." };

  const res = await linkMatching(partnerId);
  if (res.ok && res.linked > 0) revalidatePath("/[locale]/admin/partners", "page");
  return res;
}

/** Link one order by TCT reference or order id. */
export async function linkOrderByReference(
  partnerId: string,
  reference: string
): Promise<{ ok: true; reference: string } | { ok: false; error: string }> {
  const actor = await requireAdminActor();
  if (!actor) return { ok: false, error: "Not authorised." };
  if (!reference?.trim()) return { ok: false, error: "not_found" };

  const res = await linkByRef(partnerId, reference);
  if (res.ok) revalidatePath("/[locale]/admin/partners", "page");
  return res;
}

/**
 * Remove a partner from the register. Orders that were linked to it lose
 * only the annotation (the FK is `on delete set null` — 0017); the client
 * confirms before calling, since there is no undo beyond re-entering them.
 */
export async function deletePartner(id: string): Promise<PartnerResult> {
  const actor = await requireAdminActor();
  if (!actor) return { ok: false, error: "Not authorised." };
  if (!id?.trim()) return { ok: false, error: "not_found" };

  const res = await deletePartnerRecord(id);
  if (res.ok) revalidatePath("/[locale]/admin/partners", "page");
  return res;
}

/** Remove a link set in error. */
export async function unlinkOrder(orderId: string): Promise<PartnerResult> {
  const actor = await requireAdminActor();
  if (!actor) return { ok: false, error: "Not authorised." };

  const res = await unlink(orderId);
  if (res.ok) revalidatePath("/[locale]/admin/partners", "page");
  return res;
}
