"use server";

import { revalidatePath } from "next/cache";
import { requireAdminActor } from "@/lib/admin-guard";
import { addCostEntry, setUnitCost } from "@/lib/costs-admin";
import { isCostCategory } from "@/lib/costs-display";

/* ---------------------------------------------------------------------------
   Admin: entering costs.

   Authorisation is re-established here, not inherited from the page — see
   app/actions/stock.ts for the full reasoning.

   Amounts are UAH. amount_eur is only ever what a euro invoice actually said;
   nothing here converts one into the other, because a converted figure looks
   like a fact and is really just today's exchange rate.
--------------------------------------------------------------------------- */

export type CostResult = { ok: true } | { ok: false; error: string };

const MAX_AMOUNT = 100_000_000;

function parseAmount(raw: string): number | null {
  // Accept a comma decimal separator — a Ukrainian keyboard types 1234,50.
  const n = Number(String(raw).trim().replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(n) || n < 0 || n > MAX_AMOUNT) return null;
  return Math.round(n * 100) / 100;
}

function parseDate(raw: string): string | null {
  const s = String(raw ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : s;
}

/** Record an operating cost. */
export async function createCostEntry(form: {
  category: string;
  amountUah: string;
  amountEur: string;
  incurredOn: string;
  recurring: boolean;
  supplier: string;
  sku: string;
  note: string;
}): Promise<CostResult> {
  const actor = await requireAdminActor();
  if (!actor) return { ok: false, error: "Not authorised." };

  if (!isCostCategory(form.category)) return { ok: false, error: "Pick a category." };

  const amountUah = parseAmount(form.amountUah);
  if (amountUah === null || amountUah === 0) return { ok: false, error: "Enter an amount above zero." };

  const eurRaw = form.amountEur?.trim();
  const amountEur = eurRaw ? parseAmount(eurRaw) : null;
  if (eurRaw && amountEur === null) return { ok: false, error: "That euro amount doesn't read as a number." };

  const incurredOn = parseDate(form.incurredOn);
  if (!incurredOn) return { ok: false, error: "Pick a date." };

  const res = await addCostEntry({
    category: form.category,
    amountUah,
    amountEur,
    incurredOn,
    // A recurring cost is stamped with the month it belongs to, which is what
    // lets "what does a month cost us" be answered without guessing which rows
    // repeat. One-offs stay null.
    period: form.recurring ? incurredOn.slice(0, 7) : null,
    supplier: form.supplier?.trim() || null,
    sku: form.sku?.trim() || null,
    note: form.note?.trim() || null,
    createdBy: actor,
  });

  if (!res.ok) return res;
  revalidatePath("/[locale]/admin/costs", "page");
  return { ok: true };
}

/**
 * Set what one unit costs, from a date.
 *
 * Dating it is not a formality. Entering today's date corrects today's figure;
 * a future date leaves every margin already calculated exactly as it was. That
 * is why this writes a dated row rather than editing one in place.
 */
export async function saveUnitCost(
  sku: string,
  unitCostUah: string,
  effectiveFrom: string,
  note: string
): Promise<CostResult> {
  const actor = await requireAdminActor();
  if (!actor) return { ok: false, error: "Not authorised." };

  const id = sku?.trim();
  if (!id) return { ok: false, error: "A sku is required." };

  const cost = parseAmount(unitCostUah);
  if (cost === null) return { ok: false, error: "Enter a cost of zero or more." };

  const from = parseDate(effectiveFrom);
  if (!from) return { ok: false, error: "Pick a date." };

  const res = await setUnitCost({
    sku: id,
    unitCostUah: cost,
    effectiveFrom: from,
    note: note?.trim() || null,
    createdBy: actor,
  });

  if (!res.ok) return res;
  revalidatePath("/[locale]/admin/costs", "page");
  revalidatePath("/[locale]/admin/stock", "page");
  return { ok: true };
}
