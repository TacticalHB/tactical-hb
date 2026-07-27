"use server";

import { revalidatePath } from "next/cache";
import { requireAdminActor } from "@/lib/admin-guard";
import {
  deleteSupplierRecord,
  insertSupplier,
  updateSupplierRecord,
  type SupplierFields,
} from "@/lib/suppliers-admin";
import {
  isSupplierCurrency,
  isSupplierStatus,
  type SupplierCurrency,
  type SupplierStatus,
} from "@/lib/suppliers-display";

/* ---------------------------------------------------------------------------
   Admin: supplier records.

   AUTHORISATION LIVES HERE, not on the page — Next exposes every server action
   as its own endpoint, so guarding only the page would leave these callable by
   anyone holding the action id. Same reasoning as every action before them.

   A supplier record is a contact book entry with a lead time. Nothing here
   touches money: deleting one detaches it from its costs (0022 sets
   supplier_id to null) and every hryvnia, with the name typed at the time,
   stays exactly where it was.
--------------------------------------------------------------------------- */

export type SupplierResult = { ok: true } | { ok: false; error: string };

const MAX_LEAD_DAYS = 365;

export type SupplierForm = {
  name: string;
  status: string;
  contactName: string;
  email: string;
  phone: string;
  website: string;
  country: string;
  leadTimeDays: string;
  currency: string;
  notes: string;
};

const clean = (v: string | undefined): string | null => {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
};

function parseFields(form: SupplierForm): SupplierFields | { error: string } {
  const name = String(form.name ?? "").trim();
  if (!name) return { error: "no_name" };
  if (name.length > 200) return { error: "no_name" };

  const status = String(form.status ?? "");
  if (!isSupplierStatus(status)) return { error: "bad_status" };

  const leadRaw = String(form.leadTimeDays ?? "").trim();
  let leadTimeDays: number | null = null;
  if (leadRaw) {
    const n = Number(leadRaw);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0 || n > MAX_LEAD_DAYS) {
      return { error: "bad_lead_time" };
    }
    leadTimeDays = n;
  }

  const currencyRaw = String(form.currency ?? "").trim();
  let currency: SupplierCurrency | null = null;
  if (currencyRaw) {
    if (!isSupplierCurrency(currencyRaw)) return { error: "bad_currency" };
    currency = currencyRaw;
  }

  const email = clean(form.email);
  // Deliberately loose: a supplier's address is copied off an invoice, not
  // used to authenticate anyone. Refusing an odd-looking one helps nobody.
  if (email && !email.includes("@")) return { error: "bad_email" };

  return {
    name,
    status: status as SupplierStatus,
    contactName: clean(form.contactName),
    email,
    phone: clean(form.phone),
    website: clean(form.website),
    country: clean(form.country),
    leadTimeDays,
    currency,
    notes: clean(form.notes),
  };
}

function refresh() {
  revalidatePath("/[locale]/admin/suppliers", "page");
  // The costs picker and the workshop's machine list both name suppliers.
  revalidatePath("/[locale]/admin/costs", "page");
  revalidatePath("/[locale]/admin/workshop", "page");
}

export async function createSupplier(form: SupplierForm): Promise<SupplierResult> {
  const actor = await requireAdminActor();
  if (!actor) return { ok: false, error: "Not authorised." };

  const fields = parseFields(form);
  if ("error" in fields) return { ok: false, error: fields.error };

  const res = await insertSupplier({ ...fields, createdBy: actor });
  if (!res.ok) return res;

  refresh();
  return { ok: true };
}

export async function updateSupplier(id: string, form: SupplierForm): Promise<SupplierResult> {
  const actor = await requireAdminActor();
  if (!actor) return { ok: false, error: "Not authorised." };

  const supplierId = String(id ?? "").trim();
  if (!supplierId) return { ok: false, error: "not_found" };

  const fields = parseFields(form);
  if ("error" in fields) return { ok: false, error: fields.error };

  const res = await updateSupplierRecord(supplierId, fields);
  if (!res.ok) return res;

  refresh();
  return { ok: true };
}

export async function deleteSupplier(id: string): Promise<SupplierResult> {
  const actor = await requireAdminActor();
  if (!actor) return { ok: false, error: "Not authorised." };

  const supplierId = String(id ?? "").trim();
  if (!supplierId) return { ok: false, error: "not_found" };

  const res = await deleteSupplierRecord(supplierId);
  if (!res.ok) return res;

  refresh();
  return { ok: true };
}
