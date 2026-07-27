"use server";

import { revalidatePath } from "next/cache";
import { requireAdminActor } from "@/lib/admin-guard";
import {
  deleteMachineRecord,
  deleteMachineTime,
  insertMachine,
  updateMachineRecord,
  upsertMachineTime,
  type MachineFields,
} from "@/lib/machines-admin";
import {
  isMachineKind,
  isMachineStatus,
  type MachineKind,
  type MachineStatus,
} from "@/lib/machines-display";

/* ---------------------------------------------------------------------------
   Admin: the machine register and its routings.

   AUTHORISATION LIVES HERE, not on the page — same reasoning as every action
   before this one.

   THERE IS NO "APPLY TO UNIT COST" ACTION IN THIS FILE, and there must never
   be one. The workshop computes what an hour costs and what that makes a unit
   worth in machine time; turning that into a real cost is a dated,
   hand-entered decision in /admin/costs, because the moment a machine's
   depreciation could write itself into product_costs, every margin ever
   calculated would restate itself whenever a life-hours guess changed.
--------------------------------------------------------------------------- */

export type MachineResult = { ok: true } | { ok: false; error: string };

const MAX_MONEY = 100_000_000;
const MAX_HOURS = 1_000_000;
const MAX_MINUTES = 100_000;

export type MachineForm = {
  name: string;
  kind: string;
  status: string;
  purchasedOn: string;
  purchaseCostUah: string;
  expectedLifeHours: string;
  runningCostPerHourUah: string;
  maintenancePerYearUah: string;
  hoursPerYear: string;
  supplierId: string;
  notes: string;
};

const clean = (v: string | undefined): string | null => {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
};

/** Empty means "unknown", which is a valid and honest setting for every
    money field on a machine — 0022 leaves them all nullable for this reason. */
function parseMoney(raw: string): number | null | "invalid" {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const n = Number(s.replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(n) || n < 0 || n > MAX_MONEY) return "invalid";
  return Math.round(n * 100) / 100;
}

function parseCount(raw: string, max: number): number | null | "invalid" {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > max) return "invalid";
  return n;
}

function parseDate(raw: string): string | null | "invalid" {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "invalid";
  const d = new Date(`${s}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? "invalid" : s;
}

function parseFields(form: MachineForm): MachineFields | { error: string } {
  const name = String(form.name ?? "").trim();
  if (!name || name.length > 200) return { error: "no_name" };

  const kind = String(form.kind ?? "");
  if (!isMachineKind(kind)) return { error: "bad_kind" };

  const status = String(form.status ?? "");
  if (!isMachineStatus(status)) return { error: "bad_status" };

  const purchasedOn = parseDate(form.purchasedOn);
  if (purchasedOn === "invalid") return { error: "bad_date" };

  const purchaseCostUah = parseMoney(form.purchaseCostUah);
  if (purchaseCostUah === "invalid") return { error: "bad_amount" };

  const runningCostPerHourUah = parseMoney(form.runningCostPerHourUah);
  if (runningCostPerHourUah === "invalid") return { error: "bad_amount" };

  const maintenancePerYearUah = parseMoney(form.maintenancePerYearUah);
  if (maintenancePerYearUah === "invalid") return { error: "bad_amount" };

  const expectedLifeHours = parseCount(form.expectedLifeHours, MAX_HOURS);
  if (expectedLifeHours === "invalid") return { error: "bad_hours" };

  const hoursPerYear = parseCount(form.hoursPerYear, MAX_HOURS);
  if (hoursPerYear === "invalid") return { error: "bad_hours" };

  return {
    name,
    kind: kind as MachineKind,
    status: status as MachineStatus,
    purchasedOn,
    purchaseCostUah,
    expectedLifeHours,
    runningCostPerHourUah,
    maintenancePerYearUah,
    hoursPerYear,
    supplierId: clean(form.supplierId),
    notes: clean(form.notes),
  };
}

function refresh() {
  revalidatePath("/[locale]/admin/workshop", "page");
}

export async function createMachine(form: MachineForm): Promise<MachineResult> {
  const actor = await requireAdminActor();
  if (!actor) return { ok: false, error: "Not authorised." };

  const fields = parseFields(form);
  if ("error" in fields) return { ok: false, error: fields.error };

  const res = await insertMachine({ ...fields, createdBy: actor });
  if (!res.ok) return res;

  refresh();
  return { ok: true };
}

export async function updateMachine(id: string, form: MachineForm): Promise<MachineResult> {
  const actor = await requireAdminActor();
  if (!actor) return { ok: false, error: "Not authorised." };

  const machineId = String(id ?? "").trim();
  if (!machineId) return { ok: false, error: "not_found" };

  const fields = parseFields(form);
  if ("error" in fields) return { ok: false, error: fields.error };

  const res = await updateMachineRecord(machineId, fields);
  if (!res.ok) return res;

  refresh();
  return { ok: true };
}

export async function deleteMachine(id: string): Promise<MachineResult> {
  const actor = await requireAdminActor();
  if (!actor) return { ok: false, error: "Not authorised." };

  const machineId = String(id ?? "").trim();
  if (!machineId) return { ok: false, error: "not_found" };

  const res = await deleteMachineRecord(machineId);
  if (!res.ok) return res;

  refresh();
  return { ok: true };
}

/** Set how many minutes of a machine one unit of a sku takes. */
export async function saveMachineTime(form: {
  sku: string;
  machineId: string;
  minutesPerUnit: string;
  note: string;
}): Promise<MachineResult> {
  const actor = await requireAdminActor();
  if (!actor) return { ok: false, error: "Not authorised." };

  const sku = String(form.sku ?? "").trim();
  if (!sku) return { ok: false, error: "no_sku" };

  const machineId = String(form.machineId ?? "").trim();
  if (!machineId) return { ok: false, error: "no_machine" };

  const raw = String(form.minutesPerUnit ?? "").trim();
  const minutes = Number(raw.replace(/\s/g, "").replace(",", "."));
  if (!raw || !Number.isFinite(minutes) || minutes <= 0 || minutes > MAX_MINUTES) {
    return { ok: false, error: "bad_minutes" };
  }

  const res = await upsertMachineTime({
    sku,
    machineId,
    minutesPerUnit: Math.round(minutes * 100) / 100,
    note: clean(form.note),
    createdBy: actor,
  });
  if (!res.ok) return res;

  refresh();
  return { ok: true };
}

export async function removeMachineTime(id: string): Promise<MachineResult> {
  const actor = await requireAdminActor();
  if (!actor) return { ok: false, error: "Not authorised." };

  const timeId = String(id ?? "").trim();
  if (!timeId) return { ok: false, error: "not_found" };

  const res = await deleteMachineTime(timeId);
  if (!res.ok) return res;

  refresh();
  return { ok: true };
}
