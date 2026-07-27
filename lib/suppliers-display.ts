/* ---------------------------------------------------------------------------
   The vocabulary of a supplier (0022, plan §4.2).

   Pure — no database, no server-only import — because the supplier form and
   the picker on the costs page are client components and need the same
   status list the actions validate against. One list, not two that drift.

   The reads and writes live in lib/suppliers-admin.ts, which IS server-only.
   Same split as costs-display.ts / costs-admin.ts.
--------------------------------------------------------------------------- */

export const SUPPLIER_STATUSES = ["active", "dormant", "archived"] as const;

export type SupplierStatus = (typeof SUPPLIER_STATUSES)[number];

export function isSupplierStatus(v: string): v is SupplierStatus {
  return (SUPPLIER_STATUSES as readonly string[]).includes(v);
}

export function supplierStatusLabel(s: SupplierStatus, uk: boolean): string {
  const labels: Record<SupplierStatus, [en: string, uk: string]> = {
    active: ["Active", "Активний"],
    dormant: ["Dormant", "Неактивний"],
    archived: ["Archived", "В архіві"],
  };
  return labels[s][uk ? 1 : 0];
}

export function supplierStatusTone(s: SupplierStatus): { bg: string; fg: string } {
  switch (s) {
    case "active":
      return { bg: "var(--console-ok-soft)", fg: "var(--console-ok)" };
    case "dormant":
      return { bg: "var(--console-warn-soft)", fg: "var(--console-warn)" };
    default:
      return { bg: "var(--console-panel-2)", fg: "var(--console-muted)" };
  }
}

/** What their invoices arrive in. Null is the normal case — UAH assumed. */
export const SUPPLIER_CURRENCIES = ["UAH", "EUR", "USD"] as const;

export type SupplierCurrency = (typeof SUPPLIER_CURRENCIES)[number];

export function isSupplierCurrency(v: string): v is SupplierCurrency {
  return (SUPPLIER_CURRENCIES as readonly string[]).includes(v);
}

export type Supplier = {
  id: string;
  name: string;
  status: SupplierStatus;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  country: string | null;
  /** The supplier's OWN quoted lead time. Deliberately not the advisor's
      stock_items.lead_time_days — see 0022 §1. */
  leadTimeDays: number | null;
  currency: SupplierCurrency | null;
  notes: string | null;
  createdAt: string;

  /** Derived on read from cost_entries.supplier_id — never stored. */
  spendUah: number;
  costEntries: number;
  /** How many unit costs name this supplier as the source of the figure. */
  unitCosts: number;
};

/** Working list order: who we actually buy from first, the archive last. */
export function bySupplierOrder(a: Supplier, b: Supplier): number {
  const rank: Record<SupplierStatus, number> = { active: 0, dormant: 1, archived: 2 };
  const d = rank[a.status] - rank[b.status];
  if (d !== 0) return d;
  if (a.spendUah !== b.spendUah) return b.spendUah - a.spendUah;
  return a.name.localeCompare(b.name);
}
