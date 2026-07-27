import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isMachineKind,
  isMachineStatus,
  type Machine,
  type MachineKind,
  type MachineStatus,
  type MachineTime,
  type SkuMachineCost,
} from "@/lib/machines-display";

/* ---------------------------------------------------------------------------
   Reading and writing the workshop (0022) for /admin/workshop.

   Service-role, same standing posture as every admin module.

   THE ONE THING THIS FILE MUST NEVER GROW: a write to product_costs. The
   hourly rate and the per-unit allocation it feeds are planning figures; a
   function here that "applied" them would silently restate every margin ever
   calculated, which is exactly what 0016 dated the cost table to prevent.
   The workshop page offers the number and a link to the costs form. That's
   the whole mechanism, and it's the approval gate.
--------------------------------------------------------------------------- */

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export type WorkshopRead = {
  machines: Machine[];
  /** Routings grouped by sku, so the page can list them under each product. */
  timesBySku: Record<string, MachineTime[]>;
  skuCosts: SkuMachineCost[];
};

export async function fetchWorkshop(): Promise<WorkshopRead | null> {
  try {
    const admin = createAdminClient();
    const [machRes, rateRes, timeRes, unitRes, enteredRes, itemRes] = await Promise.all([
      admin
        .from("machines")
        .select(
          `id, name, kind, status, purchased_on, purchase_cost_uah, expected_life_hours,
           running_cost_per_hour_uah, maintenance_per_year_uah, hours_per_year,
           supplier_id, notes, created_at, suppliers ( name )`
        )
        .order("name", { ascending: true }),
      admin
        .from("machine_hourly_cost")
        .select(
          "id, depreciation_per_hour_uah, maintenance_per_hour_uah, hourly_cost_uah, components_known"
        ),
      admin
        .from("product_machine_time")
        .select("id, sku, machine_id, minutes_per_unit, note, machines ( name )")
        .order("sku", { ascending: true }),
      admin.from("machine_unit_cost").select("*"),
      admin.from("product_costs_current").select("sku, unit_cost_uah"),
      admin.from("stock_items").select("sku, name_en, name_uk"),
    ]);

    const err =
      machRes.error ?? rateRes.error ?? timeRes.error ?? unitRes.error ?? enteredRes.error ?? itemRes.error;
    if (err) {
      console.error("[admin/workshop] read failed:", err.code, err.message);
      return null;
    }

    const rates = new Map<string, Record<string, unknown>>();
    for (const r of rateRes.data ?? []) {
      const row = r as Record<string, unknown>;
      rates.set(String(row.id), row);
    }

    const machines: Machine[] = (machRes.data ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      const id = String(row.id);
      const rate = rates.get(id) ?? {};
      const kind = String(row.kind);
      const status = String(row.status);
      const supplier = row.suppliers as { name?: unknown } | null;
      return {
        id,
        name: String(row.name),
        kind: (isMachineKind(kind) ? kind : "other") as MachineKind,
        status: (isMachineStatus(status) ? status : "active") as MachineStatus,
        purchasedOn: (row.purchased_on as string | null) ?? null,
        purchaseCostUah: num(row.purchase_cost_uah),
        expectedLifeHours: num(row.expected_life_hours),
        runningCostPerHourUah: num(row.running_cost_per_hour_uah),
        maintenancePerYearUah: num(row.maintenance_per_year_uah),
        hoursPerYear: num(row.hours_per_year),
        supplierId: (row.supplier_id as string | null) ?? null,
        supplierName: supplier?.name ? String(supplier.name) : null,
        notes: (row.notes as string | null) ?? null,
        createdAt: String(row.created_at),
        depreciationPerHourUah: num(rate.depreciation_per_hour_uah),
        maintenancePerHourUah: num(rate.maintenance_per_hour_uah),
        hourlyCostUah: num(rate.hourly_cost_uah),
        componentsKnown: num(rate.components_known) ?? 0,
      };
    });

    const timesBySku: Record<string, MachineTime[]> = {};
    for (const r of timeRes.data ?? []) {
      const row = r as Record<string, unknown>;
      const machine = row.machines as { name?: unknown } | null;
      const sku = String(row.sku);
      (timesBySku[sku] ??= []).push({
        id: String(row.id),
        sku,
        machineId: String(row.machine_id),
        machineName: machine?.name ? String(machine.name) : "—",
        minutesPerUnit: Number(row.minutes_per_unit),
        note: (row.note as string | null) ?? null,
      });
    }

    const entered = new Map<string, number | null>();
    for (const r of enteredRes.data ?? []) {
      const row = r as Record<string, unknown>;
      entered.set(String(row.sku), num(row.unit_cost_uah));
    }

    const names = new Map<string, { en: string; uk: string }>();
    for (const r of itemRes.data ?? []) {
      const row = r as Record<string, unknown>;
      names.set(String(row.sku), {
        en: String(row.name_en ?? row.sku),
        uk: String(row.name_uk ?? row.sku),
      });
    }

    const skuCosts: SkuMachineCost[] = (unitRes.data ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      const sku = String(row.sku);
      const name = names.get(sku);
      return {
        sku,
        nameEn: name?.en ?? sku,
        nameUk: name?.uk ?? sku,
        minutesPerUnit: Number(row.minutes_per_unit ?? 0),
        machineCostPerUnitUah: num(row.machine_cost_per_unit_uah),
        machinesUsed: num(row.machines_used) ?? 0,
        machinesMissingRate: num(row.machines_missing_rate) ?? 0,
        enteredUnitCostUah: entered.get(sku) ?? null,
      };
    });

    skuCosts.sort((a, b) => a.nameEn.localeCompare(b.nameEn));

    return { machines, timesBySku, skuCosts };
  } catch (e) {
    console.error("[admin/workshop] read threw:", e);
    return null;
  }
}

/* ---------------------------------------------------------------------------
   Machines.
--------------------------------------------------------------------------- */

export type MachineFields = {
  name: string;
  kind: MachineKind;
  status: MachineStatus;
  purchasedOn: string | null;
  purchaseCostUah: number | null;
  expectedLifeHours: number | null;
  runningCostPerHourUah: number | null;
  maintenancePerYearUah: number | null;
  hoursPerYear: number | null;
  supplierId: string | null;
  notes: string | null;
};

type WriteResult = { ok: true } | { ok: false; error: string };

function mapMachineError(code: string | undefined, message: string): string {
  if (code === "23505") return "duplicate_name";
  return message;
}

function machineRow(fields: MachineFields) {
  return {
    name: fields.name,
    kind: fields.kind,
    status: fields.status,
    purchased_on: fields.purchasedOn,
    purchase_cost_uah: fields.purchaseCostUah,
    expected_life_hours: fields.expectedLifeHours,
    running_cost_per_hour_uah: fields.runningCostPerHourUah,
    maintenance_per_year_uah: fields.maintenancePerYearUah,
    hours_per_year: fields.hoursPerYear,
    supplier_id: fields.supplierId,
    notes: fields.notes,
  };
}

export async function insertMachine(
  fields: MachineFields & { createdBy: string }
): Promise<WriteResult> {
  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("machines")
      .insert({ ...machineRow(fields), created_by: fields.createdBy });

    if (error) {
      console.error("[admin/workshop] machine insert failed:", error.code, error.message);
      return { ok: false, error: mapMachineError(error.code, error.message) };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save the machine." };
  }
}

export async function updateMachineRecord(id: string, fields: MachineFields): Promise<WriteResult> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("machines").update(machineRow(fields)).eq("id", id);

    if (error) {
      console.error("[admin/workshop] machine update failed:", error.code, error.message);
      return { ok: false, error: mapMachineError(error.code, error.message) };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save the machine." };
  }
}

/** Deleting a machine takes its routing rows with it (0022, on delete cascade)
    — the client's confirm says so before this is called. No cost is touched. */
export async function deleteMachineRecord(id: string): Promise<WriteResult> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("machines").delete().eq("id", id);

    if (error) {
      console.error("[admin/workshop] machine delete failed:", error.code, error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not delete the machine." };
  }
}

/* ---------------------------------------------------------------------------
   Routing — minutes of a machine per unit of a sku.
--------------------------------------------------------------------------- */

export async function upsertMachineTime(input: {
  sku: string;
  machineId: string;
  minutesPerUnit: number;
  note: string | null;
  createdBy: string;
}): Promise<WriteResult> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("product_machine_time").upsert(
      {
        sku: input.sku,
        machine_id: input.machineId,
        minutes_per_unit: input.minutesPerUnit,
        note: input.note,
        created_by: input.createdBy,
      },
      { onConflict: "sku,machine_id" }
    );

    if (error) {
      console.error("[admin/workshop] time upsert failed:", error.code, error.message);
      // 23503 is the sku or machine foreign key — the row named something gone.
      if (error.code === "23503") return { ok: false, error: "not_found" };
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save the time." };
  }
}

export async function deleteMachineTime(id: string): Promise<WriteResult> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("product_machine_time").delete().eq("id", id);

    if (error) {
      console.error("[admin/workshop] time delete failed:", error.code, error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not remove the time." };
  }
}
