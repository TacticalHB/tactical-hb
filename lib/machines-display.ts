/* ---------------------------------------------------------------------------
   The vocabulary of the workshop (0022, plan §4.2 and the §5 Workshop
   department). Pure and I/O-free; lib/machines-admin.ts does the reading.

   THE RATE IS A PLANNING FIGURE. Everything computed here exists to answer
   "is this product carrying its machine time?" — a question the founder
   answers by entering a unit cost in /admin/costs, dated, by hand. Nothing in
   this file or behind it writes to product_costs, and the arithmetic below is
   never added to a margin. 0022's header says why: the purchase is already
   real money in cost_entries, and counting it twice would be flattery.
--------------------------------------------------------------------------- */

export const MACHINE_KINDS = ["printer_3d", "laser", "cnc", "lathe", "other"] as const;

export type MachineKind = (typeof MACHINE_KINDS)[number];

export function isMachineKind(v: string): v is MachineKind {
  return (MACHINE_KINDS as readonly string[]).includes(v);
}

export function machineKindLabel(k: MachineKind, uk: boolean): string {
  const labels: Record<MachineKind, [en: string, uk: string]> = {
    printer_3d: ["3D printer", "3D-принтер"],
    laser: ["Laser / engraver", "Лазер / гравер"],
    cnc: ["CNC", "ЧПУ"],
    lathe: ["Lathe", "Токарний"],
    other: ["Other", "Інше"],
  };
  return labels[k][uk ? 1 : 0];
}

export const MACHINE_STATUSES = ["active", "idle", "repair", "retired"] as const;

export type MachineStatus = (typeof MACHINE_STATUSES)[number];

export function isMachineStatus(v: string): v is MachineStatus {
  return (MACHINE_STATUSES as readonly string[]).includes(v);
}

export function machineStatusLabel(s: MachineStatus, uk: boolean): string {
  const labels: Record<MachineStatus, [en: string, uk: string]> = {
    active: ["Active", "Працює"],
    idle: ["Idle", "Простій"],
    repair: ["In repair", "У ремонті"],
    retired: ["Retired", "Списано"],
  };
  return labels[s][uk ? 1 : 0];
}

export function machineStatusTone(s: MachineStatus): { bg: string; fg: string } {
  switch (s) {
    case "active":
      return { bg: "var(--console-ok-soft)", fg: "var(--console-ok)" };
    case "repair":
      return { bg: "var(--console-alert-soft)", fg: "var(--console-alert)" };
    case "idle":
      return { bg: "var(--console-warn-soft)", fg: "var(--console-warn)" };
    default:
      return { bg: "var(--console-panel-2)", fg: "var(--console-muted)" };
  }
}

export type Machine = {
  id: string;
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
  supplierName: string | null;
  notes: string | null;
  createdAt: string;

  /* From the machine_hourly_cost view — each null when its inputs are missing. */
  depreciationPerHourUah: number | null;
  maintenancePerHourUah: number | null;
  hourlyCostUah: number | null;
  /** 0–3. How much of the rate is real; 0 means there is no rate at all. */
  componentsKnown: number;
};

export type MachineTime = {
  id: string;
  sku: string;
  machineId: string;
  machineName: string;
  minutesPerUnit: number;
  note: string | null;
};

/** One row of the machine_unit_cost view, plus what the founder actually entered. */
export type SkuMachineCost = {
  sku: string;
  nameEn: string;
  nameUk: string;
  minutesPerUnit: number;
  /** Null when every machine in the routing lacks a rate. */
  machineCostPerUnitUah: number | null;
  machinesUsed: number;
  machinesMissingRate: number;
  /** product_costs_current — what margin actually uses today. */
  enteredUnitCostUah: number | null;
};

export type CarryVerdict =
  | "no_rate" // the routing has no costed machine — nothing to say
  | "no_unit_cost" // machine time is known, but no unit cost is entered at all
  | "carried" // entered cost comfortably exceeds machine time
  | "tight" // entered cost is within a whisker of machine time alone
  | "under"; // entered cost is below machine time — materials and labour are free?

/** How much headroom over machine time we expect before calling it tight. */
const TIGHT_MARGIN = 1.2;

export function carryVerdict(row: SkuMachineCost): CarryVerdict {
  if (row.machineCostPerUnitUah === null) return "no_rate";
  if (row.enteredUnitCostUah === null) return "no_unit_cost";
  if (row.enteredUnitCostUah < row.machineCostPerUnitUah) return "under";
  if (row.enteredUnitCostUah < row.machineCostPerUnitUah * TIGHT_MARGIN) return "tight";
  return "carried";
}

export function carryVerdictLabel(v: CarryVerdict, uk: boolean): string {
  const labels: Record<CarryVerdict, [en: string, uk: string]> = {
    no_rate: ["machine rate unknown", "ставка машини невідома"],
    no_unit_cost: ["no unit cost entered", "собівартість не внесена"],
    carried: ["machine time covered", "час машини покрито"],
    tight: ["barely covers machine time", "ледве покриває час машини"],
    under: ["below machine time alone", "нижче за час машини"],
  };
  return labels[v][uk ? 1 : 0];
}

export function carryVerdictTone(v: CarryVerdict): { bg: string; fg: string } {
  switch (v) {
    case "carried":
      return { bg: "var(--console-ok-soft)", fg: "var(--console-ok)" };
    case "tight":
      return { bg: "var(--console-warn-soft)", fg: "var(--console-warn)" };
    case "under":
    case "no_unit_cost":
      return { bg: "var(--console-alert-soft)", fg: "var(--console-alert)" };
    default:
      return { bg: "var(--console-panel-2)", fg: "var(--console-muted)" };
  }
}

/** Minutes as the workshop says them: 90 → "1 h 30 min". */
export function formatMinutes(mins: number, uk: boolean): string {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m} ${uk ? "хв" : "min"}`;
  if (m === 0) return `${h} ${uk ? "год" : "h"}`;
  return `${h} ${uk ? "год" : "h"} ${m} ${uk ? "хв" : "min"}`;
}

/** Working list order: what's running first, the scrapheap last. */
export function byMachineOrder(a: Machine, b: Machine): number {
  const rank: Record<MachineStatus, number> = { active: 0, repair: 1, idle: 2, retired: 3 };
  const d = rank[a.status] - rank[b.status];
  if (d !== 0) return d;
  return a.name.localeCompare(b.name);
}
