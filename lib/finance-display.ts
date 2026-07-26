/* ---------------------------------------------------------------------------
   How the finance snapshot reads. Pure and I/O-free: the shapes of the 0018
   views, the month arithmetic, and the CSV building — everything that can be
   exercised without a database.

   The nulls here are load-bearing. A null revenue is a month with orders that
   predate UAH amounts; a null cogs is a month whose unit costs are not entered
   yet. Rendering either as 0 would turn "we don't know" into "it was nothing",
   which is exactly the lie the views were built to refuse (0018).
--------------------------------------------------------------------------- */

/** One row of public.finance_monthly. */
export type FinanceMonth = {
  month: string; // YYYY-MM, Kyiv
  ordersCount: number;
  revenueUah: number | null;
  unpricedOrders: number;
  cogsUah: number | null;
  uncostedLines: number;
  opexUah: number | null;
  marginUah: number;
};

/** One row of public.finance_products_monthly. */
export type ProductMonth = {
  month: string;
  sku: string;
  productName: string;
  units: number;
  revenueUah: number | null;
  cogsUah: number | null;
  uncostedLines: number;
  unpricedLines: number;
};

/** One row of public.cost_entries_monthly. */
export type CostMonth = {
  month: string;
  category: string;
  totalUah: number;
  entries: number;
};

/** "2026-07" → "July 2026" / "Липень 2026". */
export function monthLabel(month: string, uk: boolean): string {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) return month;
  const names = uk
    ? ["Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень",
       "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"]
    : ["January", "February", "March", "April", "May", "June",
       "July", "August", "September", "October", "November", "December"];
  return `${names[m - 1]} ${y}`;
}

/**
 * A month is complete when revenue, cogs and every line behind them are
 * known. Anything else gets flagged on the page — the number is still shown,
 * with an honest asterisk, because a gappy figure plus a warning beats no
 * figure at all.
 */
export function monthHasGaps(m: FinanceMonth): boolean {
  return m.unpricedOrders > 0 || m.uncostedLines > 0;
}

/* ---------------------------------------------------------------------------
   CSV, for the accountant.

   Plain comma-separated UTF-8 with a BOM. The BOM is not decoration: without
   it Excel guesses the encoding and Ukrainian text opens as mojibake. Amounts
   are bare numbers with a dot decimal — formatting is the spreadsheet's job.
--------------------------------------------------------------------------- */

function csvField(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  // Quote only when the content demands it, so numbers stay numbers to Excel.
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Rows → one CSV document, BOM included. */
export function buildCsv(
  header: string[],
  rows: (string | number | null | undefined)[][]
): string {
  const lines = [header, ...rows].map((r) => r.map(csvField).join(","));
  return "\uFEFF" + lines.join("\r\n") + "\r\n";
}
