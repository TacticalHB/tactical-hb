/* ---------------------------------------------------------------------------
   The vocabulary of a cost: categories, labels, the shape of an entry.

   Pure — no database, no server-only import — because the add-cost form is a
   client component and needs the same category list the queries validate
   against. One list, not two that drift.

   The reads and writes live in lib/costs-admin.ts, which IS server-only. Same
   split as orders-display.ts / orders-admin.ts.
--------------------------------------------------------------------------- */

export const COST_CATEGORIES = [
  "manufacturing",
  "materials",
  "logistics",
  "tax",
  "shop",
  "salaries",
  "rnd",
  "exhibition",
  "ads",
  // Acquiring and bank charges. Added in 0022 because §6.2 names payment fees
  // as an input to the Margin Guard and there was nowhere honest to put them —
  // buried in 'shop' or 'other' they can't be told apart from rent.
  "fees",
  "other",
] as const;

export type CostCategory = (typeof COST_CATEGORIES)[number];

export function isCostCategory(v: string): v is CostCategory {
  return (COST_CATEGORIES as readonly string[]).includes(v);
}

export function categoryLabel(c: CostCategory, uk: boolean): string {
  const en: Record<CostCategory, string> = {
    manufacturing: "Manufacturing",
    materials: "Materials",
    logistics: "Logistics",
    tax: "Tax",
    shop: "Shop",
    salaries: "Salaries",
    rnd: "R&D",
    exhibition: "Exhibitions",
    ads: "Advertising",
    fees: "Payment fees",
    other: "Other",
  };
  const ua: Record<CostCategory, string> = {
    manufacturing: "Виробництво",
    materials: "Матеріали",
    logistics: "Логістика",
    tax: "Податки",
    shop: "Магазин",
    salaries: "Зарплати",
    rnd: "R&D",
    exhibition: "Виставки",
    ads: "Реклама",
    fees: "Комісії",
    other: "Інше",
  };
  return (uk ? ua : en)[c];
}

export type CostEntry = {
  id: string;
  category: CostCategory;
  amountUah: number;
  amountEur: number | null;
  incurredOn: string;
  period: string | null;
  /** Free text — what was typed at the time. Kept for legacy rows and for
      one-off vendors that will never earn a supplier record (0022 §2). */
  supplier: string | null;
  /** Set when the payee is a known supplier. Display prefers supplierName. */
  supplierId: string | null;
  supplierName: string | null;
  sku: string | null;
  note: string | null;
};

/** What to show in the supplier column: the record's name when there is one,
    otherwise whatever was typed. */
export function supplierText(e: CostEntry): string | null {
  return e.supplierName ?? e.supplier;
}

/** Current month as YYYY-MM — the default filter, and the usual `period`. */
export function currentPeriod(): string {
  return new Date().toISOString().slice(0, 7);
}
