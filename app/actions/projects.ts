"use server";

import { revalidatePath } from "next/cache";
import { requireAdminActor } from "@/lib/admin-guard";
import {
  deleteExhibitionRecord,
  deleteProjectRecord,
  insertExhibition,
  insertProject,
  insertSavingsEntry,
  updateExhibitionRecord,
  updateProjectRecord,
} from "@/lib/projects-admin";
import { isExhibitionStatus, isProjectStatus } from "@/lib/projects-display";

/* ---------------------------------------------------------------------------
   Admin: writes for projects, the savings ledger, and exhibitions.

   Authorisation is re-established here, not inherited from the page — see
   app/actions/stock.ts for the full reasoning. The Savings Coach has no
   action in this file and never will: it computes on render and suggests.
   Every hryvnia recorded below was moved by the founder, elsewhere, first.

   The ledger has an INSERT and nothing else — corrections are compensating
   rows, like the paper ledger this table imitates (0021).
--------------------------------------------------------------------------- */

export type ProjectResult = { ok: true } | { ok: false; error: string };

const MAX_AMOUNT = 100_000_000;

function parseDate(raw: string): string | null {
  const s = String(raw ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : s;
}

/** "" → null; otherwise a positive amount, comma tolerated. */
function parsePositiveAmount(raw: string): number | null | "invalid" {
  const s = String(raw ?? "").trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0 || n > MAX_AMOUNT) return "invalid";
  return Math.round(n * 100) / 100;
}

type ProjectForm = {
  name?: string;
  status: string;
  targetBudgetUah: string;
  monthlySavingUah: string;
  deadline: string;
  notes: string;
};

function parseProject(form: ProjectForm) {
  if (!isProjectStatus(form.status)) return { error: "bad_status" as const };

  const target = parsePositiveAmount(form.targetBudgetUah);
  if (target === "invalid") return { error: "bad_amount" as const };

  const monthly = parsePositiveAmount(form.monthlySavingUah);
  if (monthly === "invalid") return { error: "bad_amount" as const };

  const deadlineRaw = form.deadline?.trim();
  const deadline = deadlineRaw ? parseDate(deadlineRaw) : null;
  if (deadlineRaw && !deadline) return { error: "bad_date" as const };

  return {
    error: null,
    fields: {
      status: form.status,
      targetBudgetUah: target,
      monthlySavingUah: monthly,
      deadline,
      notes: form.notes?.trim() || null,
    },
  };
}

/** Add a project to the register. */
export async function createProject(form: ProjectForm): Promise<ProjectResult> {
  const actor = await requireAdminActor();
  if (!actor) return { ok: false, error: "Not authorised." };

  const name = form.name?.trim();
  if (!name) return { ok: false, error: "no_name" };

  const parsed = parseProject(form);
  if (parsed.error) return { ok: false, error: parsed.error };

  const res = await insertProject({ name, ...parsed.fields, createdBy: actor });
  if (!res.ok) return res;

  revalidatePath("/[locale]/admin/projects", "page");
  return { ok: true };
}

/** Save edits to a project — status, target, rate, deadline, notes. */
export async function updateProject(id: string, form: ProjectForm): Promise<ProjectResult> {
  const actor = await requireAdminActor();
  if (!actor) return { ok: false, error: "Not authorised." };
  if (!id?.trim()) return { ok: false, error: "not_found" };

  const name = form.name?.trim();
  if (!name) return { ok: false, error: "no_name" };

  const parsed = parseProject(form);
  if (parsed.error) return { ok: false, error: parsed.error };

  const res = await updateProjectRecord(id, { name, ...parsed.fields });
  if (!res.ok) return res;

  revalidatePath("/[locale]/admin/projects", "page");
  return { ok: true };
}

/** Remove a project AND its ledger (0021 cascades). The client confirms
    with exactly that warning — there is no undo. */
export async function deleteProject(id: string): Promise<ProjectResult> {
  const actor = await requireAdminActor();
  if (!actor) return { ok: false, error: "Not authorised." };
  if (!id?.trim()) return { ok: false, error: "not_found" };

  const res = await deleteProjectRecord(id);
  if (res.ok) revalidatePath("/[locale]/admin/projects", "page");
  return res;
}

/** Record a set-aside (positive) or a withdrawal (negative). */
export async function addSavingsEntry(
  projectId: string,
  form: { amountUah: string; savedOn: string; note: string }
): Promise<ProjectResult> {
  const actor = await requireAdminActor();
  if (!actor) return { ok: false, error: "Not authorised." };
  if (!projectId?.trim()) return { ok: false, error: "not_found" };

  const s = String(form.amountUah ?? "").trim().replace(",", ".");
  const n = Number(s);
  if (!s || !Number.isFinite(n) || n === 0 || Math.abs(n) > MAX_AMOUNT) {
    return { ok: false, error: "bad_amount" };
  }
  const amountUah = Math.round(n * 100) / 100;

  const savedOn = parseDate(form.savedOn);
  if (!savedOn) return { ok: false, error: "bad_date" };

  const res = await insertSavingsEntry({
    projectId,
    amountUah,
    savedOn,
    note: form.note?.trim() || null,
    createdBy: actor,
  });
  if (!res.ok) return res;

  revalidatePath("/[locale]/admin/projects", "page");
  return { ok: true };
}

/* ---------------------------------------------------------------------------
   Exhibitions.
--------------------------------------------------------------------------- */

type ExhibitionForm = {
  name?: string;
  location: string;
  startsOn: string;
  endsOn: string;
  budgetUah: string;
  status: string;
  notes: string;
};

function parseExhibition(form: ExhibitionForm) {
  if (!isExhibitionStatus(form.status)) return { error: "bad_status" as const };

  const startsRaw = form.startsOn?.trim();
  const startsOn = startsRaw ? parseDate(startsRaw) : null;
  if (startsRaw && !startsOn) return { error: "bad_date" as const };

  const endsRaw = form.endsOn?.trim();
  const endsOn = endsRaw ? parseDate(endsRaw) : null;
  if (endsRaw && !endsOn) return { error: "bad_date" as const };

  if (startsOn && endsOn && endsOn < startsOn) return { error: "bad_dates" as const };

  const budget = parsePositiveAmount(form.budgetUah);
  if (budget === "invalid") return { error: "bad_amount" as const };

  return {
    error: null,
    fields: {
      location: form.location?.trim() || null,
      startsOn,
      endsOn,
      budgetUah: budget,
      status: form.status,
      notes: form.notes?.trim() || null,
    },
  };
}

/** Add a fair to the calendar. */
export async function createExhibition(form: ExhibitionForm): Promise<ProjectResult> {
  const actor = await requireAdminActor();
  if (!actor) return { ok: false, error: "Not authorised." };

  const name = form.name?.trim();
  if (!name) return { ok: false, error: "no_name" };

  const parsed = parseExhibition(form);
  if (parsed.error) return { ok: false, error: parsed.error };

  const res = await insertExhibition({ name, ...parsed.fields, createdBy: actor });
  if (!res.ok) return res;

  revalidatePath("/[locale]/admin/projects", "page");
  return { ok: true };
}

/** Save edits to a fair. */
export async function updateExhibition(id: string, form: ExhibitionForm): Promise<ProjectResult> {
  const actor = await requireAdminActor();
  if (!actor) return { ok: false, error: "Not authorised." };
  if (!id?.trim()) return { ok: false, error: "not_found" };

  const name = form.name?.trim();
  if (!name) return { ok: false, error: "no_name" };

  const parsed = parseExhibition(form);
  if (parsed.error) return { ok: false, error: parsed.error };

  const res = await updateExhibitionRecord(id, { name, ...parsed.fields });
  if (!res.ok) return res;

  revalidatePath("/[locale]/admin/projects", "page");
  return { ok: true };
}

/** Remove a fair. The client confirms first. */
export async function deleteExhibition(id: string): Promise<ProjectResult> {
  const actor = await requireAdminActor();
  if (!actor) return { ok: false, error: "Not authorised." };
  if (!id?.trim()) return { ok: false, error: "not_found" };

  const res = await deleteExhibitionRecord(id);
  if (res.ok) revalidatePath("/[locale]/admin/projects", "page");
  return res;
}
