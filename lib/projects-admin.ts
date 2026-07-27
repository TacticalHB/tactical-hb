import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isExhibitionStatus,
  isProjectStatus,
  type Exhibition,
  type ExhibitionStatus,
  type Project,
  type ProjectStatus,
  type SavingsEntry,
} from "@/lib/projects-display";

/* ---------------------------------------------------------------------------
   Reading and writing projects, the savings ledger, and exhibitions (0021)
   for /admin/projects.

   Service-role, same standing posture as every admin module: RLS on with no
   policies, authorisation re-checked by every caller.

   savedUah is COMPUTED here from the ledger on every read — there is no
   stored total anywhere to drift (the 0021 comment is binding). The ledger
   itself is append-only in practice: no update or delete functions exist in
   this file, deliberately; a wrong entry is corrected by a compensating row.
--------------------------------------------------------------------------- */

export type ProjectsRead = {
  projects: Project[];
  /** The ledger per project, newest first — the card shows recent history. */
  savingsByProject: Record<string, SavingsEntry[]>;
};

export async function fetchProjects(): Promise<ProjectsRead | null> {
  try {
    const admin = createAdminClient();
    const [projRes, savRes] = await Promise.all([
      admin
        .from("projects")
        .select(
          "id, name, status, target_budget_uah, monthly_saving_uah, deadline, notes, created_at"
        )
        .order("created_at", { ascending: false }),
      admin
        .from("project_savings")
        .select("id, project_id, amount_uah, saved_on, note")
        .order("saved_on", { ascending: false })
        .order("created_at", { ascending: false }),
    ]);

    if (projRes.error || savRes.error) {
      const e = projRes.error ?? savRes.error;
      console.error("[admin/projects] read failed:", e?.code, e?.message);
      return null;
    }

    const savingsByProject: Record<string, SavingsEntry[]> = {};
    const savedTotals = new Map<string, number>();
    for (const r of savRes.data ?? []) {
      const row = r as Record<string, unknown>;
      const projectId = String(row.project_id);
      const entry: SavingsEntry = {
        id: String(row.id),
        amountUah: Number(row.amount_uah),
        savedOn: String(row.saved_on),
        note: (row.note as string | null) ?? null,
      };
      (savingsByProject[projectId] ??= []).push(entry);
      savedTotals.set(projectId, (savedTotals.get(projectId) ?? 0) + entry.amountUah);
    }

    const projects: Project[] = (projRes.data ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      const status = String(row.status);
      const id = String(row.id);
      return {
        id,
        name: String(row.name),
        status: (isProjectStatus(status) ? status : "idea") as ProjectStatus,
        targetBudgetUah:
          row.target_budget_uah === null ? null : Number(row.target_budget_uah),
        monthlySavingUah:
          row.monthly_saving_uah === null ? null : Number(row.monthly_saving_uah),
        deadline: (row.deadline as string | null) ?? null,
        notes: (row.notes as string | null) ?? null,
        savedUah: savedTotals.get(id) ?? 0,
        createdAt: String(row.created_at),
      };
    });

    return { projects, savingsByProject };
  } catch (e) {
    console.error("[admin/projects] read threw:", e);
    return null;
  }
}

export type ProjectFields = {
  name: string;
  status: ProjectStatus;
  targetBudgetUah: number | null;
  monthlySavingUah: number | null;
  deadline: string | null;
  notes: string | null;
};

type WriteResult = { ok: true } | { ok: false; error: string };

export async function insertProject(
  fields: ProjectFields & { createdBy: string }
): Promise<WriteResult> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("projects").insert({
      name: fields.name,
      status: fields.status,
      target_budget_uah: fields.targetBudgetUah,
      monthly_saving_uah: fields.monthlySavingUah,
      deadline: fields.deadline,
      notes: fields.notes,
      created_by: fields.createdBy,
    });

    if (error) {
      console.error("[admin/projects] insert failed:", error.code, error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save the project." };
  }
}

export async function updateProjectRecord(id: string, fields: ProjectFields): Promise<WriteResult> {
  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("projects")
      .update({
        name: fields.name,
        status: fields.status,
        target_budget_uah: fields.targetBudgetUah,
        monthly_saving_uah: fields.monthlySavingUah,
        deadline: fields.deadline,
        notes: fields.notes,
      })
      .eq("id", id);

    if (error) {
      console.error("[admin/projects] update failed:", error.code, error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save the project." };
  }
}

/** Deleting a project takes its ledger with it (0021, on delete cascade) —
    the client's confirm says so in plain words before this is called. */
export async function deleteProjectRecord(id: string): Promise<WriteResult> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("projects").delete().eq("id", id);

    if (error) {
      console.error("[admin/projects] delete failed:", error.code, error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not delete the project." };
  }
}

/** Append to the ledger. Negative = withdrawal, recorded as honestly. */
export async function insertSavingsEntry(input: {
  projectId: string;
  amountUah: number;
  savedOn: string;
  note: string | null;
  createdBy: string;
}): Promise<WriteResult> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("project_savings").insert({
      project_id: input.projectId,
      amount_uah: input.amountUah,
      saved_on: input.savedOn,
      note: input.note,
      created_by: input.createdBy,
    });

    if (error) {
      console.error("[admin/projects] savings insert failed:", error.code, error.message);
      if (error.code === "23503") return { ok: false, error: "not_found" };
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not record the entry." };
  }
}

/* ---------------------------------------------------------------------------
   Exhibitions.
--------------------------------------------------------------------------- */

export async function fetchExhibitions(): Promise<Exhibition[] | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("exhibitions")
      .select("id, name, location, starts_on, ends_on, budget_uah, status, notes")
      .order("starts_on", { ascending: false, nullsFirst: false });

    if (error) {
      console.error("[admin/exhibitions] read failed:", error.code, error.message);
      return null;
    }

    return (data ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      const status = String(row.status);
      return {
        id: String(row.id),
        name: String(row.name),
        location: (row.location as string | null) ?? null,
        startsOn: (row.starts_on as string | null) ?? null,
        endsOn: (row.ends_on as string | null) ?? null,
        budgetUah: row.budget_uah === null ? null : Number(row.budget_uah),
        status: (isExhibitionStatus(status) ? status : "considering") as ExhibitionStatus,
        notes: (row.notes as string | null) ?? null,
      };
    });
  } catch (e) {
    console.error("[admin/exhibitions] read threw:", e);
    return null;
  }
}

export type ExhibitionFields = {
  name: string;
  location: string | null;
  startsOn: string | null;
  endsOn: string | null;
  budgetUah: number | null;
  status: ExhibitionStatus;
  notes: string | null;
};

/** 23514 is the dates-order check — phrased for the form. */
function mapExhibitionError(code: string | undefined, message: string): string {
  if (code === "23514") return "bad_dates";
  return message;
}

export async function insertExhibition(
  fields: ExhibitionFields & { createdBy: string }
): Promise<WriteResult> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("exhibitions").insert({
      name: fields.name,
      location: fields.location,
      starts_on: fields.startsOn,
      ends_on: fields.endsOn,
      budget_uah: fields.budgetUah,
      status: fields.status,
      notes: fields.notes,
      created_by: fields.createdBy,
    });

    if (error) {
      console.error("[admin/exhibitions] insert failed:", error.code, error.message);
      return { ok: false, error: mapExhibitionError(error.code, error.message) };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save the exhibition." };
  }
}

export async function updateExhibitionRecord(
  id: string,
  fields: ExhibitionFields
): Promise<WriteResult> {
  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("exhibitions")
      .update({
        name: fields.name,
        location: fields.location,
        starts_on: fields.startsOn,
        ends_on: fields.endsOn,
        budget_uah: fields.budgetUah,
        status: fields.status,
        notes: fields.notes,
      })
      .eq("id", id);

    if (error) {
      console.error("[admin/exhibitions] update failed:", error.code, error.message);
      return { ok: false, error: mapExhibitionError(error.code, error.message) };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save the exhibition." };
  }
}

export async function deleteExhibitionRecord(id: string): Promise<WriteResult> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("exhibitions").delete().eq("id", id);

    if (error) {
      console.error("[admin/exhibitions] delete failed:", error.code, error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not delete the exhibition." };
  }
}
