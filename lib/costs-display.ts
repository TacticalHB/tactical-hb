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
  supplier: string | null;
  sku: string | null;
  note: string | null;
};

/** Current month as YYYY-MM — the default filter, and the usual `period`. */
export function currentPeriod(): string {
  return new Date().toISOString().slice(0, 7);
}
