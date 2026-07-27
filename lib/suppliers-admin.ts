import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isSupplierCurrency,
  isSupplierStatus,
  type Supplier,
  type SupplierCurrency,
  type SupplierStatus,
} from "@/lib/suppliers-display";

/* ---------------------------------------------------------------------------
   Reading and writing suppliers (0022) for /admin/suppliers.

   Service-role, same standing posture as every admin module: RLS on with no
   policies, authorisation re-checked by every caller.

   spendUah is COMPUTED from cost_entries on every read. There is no stored
   total to drift, and there is deliberately no trigger maintaining one — the
   costs table is the record of what was paid, and a supplier's spend is a
   question asked of it, not a fact kept beside it.

   NOTHING HERE DELETES MONEY. Removing a supplier sets cost_entries.supplier_id
   to null (0022 §2) and leaves every hryvnia, and the free-text name that was
   typed at the time, exactly where they were.
--------------------------------------------------------------------------- */

export type SupplierFields = {
  name: string;
  status: SupplierStatus;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  country: string | null;
  leadTimeDays: number | null;
  currency: SupplierCurrency | null;
  notes: string | null;
};

type WriteResult = { ok: true } | { ok: false; error: string };

/** 23505 is the case-insensitive name index — phrased for the form. */
function mapSupplierError(code: string | undefined, message: string): string {
  if (code === "23505") return "duplicate_name";
  return message;
}

export async function fetchSuppliers(): Promise<Supplier[] | null> {
  try {
    const admin = createAdminClient();
    const [supRes, costRes, unitRes] = await Promise.all([
      admin
        .from("suppliers")
        .select(
          "id, name, status, contact_name, email, phone, website, country, lead_time_days, currency, notes, created_at"
        )
        .order("name", { ascending: true }),
      // Only the columns the totals need. Rows with no supplier_id are the
      // free-text and general-overhead ones and simply don't count here.
      admin.from("cost_entries").select("supplier_id, amount_uah").not("supplier_id", "is", null),
      admin.from("product_costs").select("supplier_id").not("supplier_id", "is", null),
    ]);

    if (supRes.error || costRes.error || unitRes.error) {
      const e = supRes.error ?? costRes.error ?? unitRes.error;
      console.error("[admin/suppliers] read failed:", e?.code, e?.message);
      return null;
    }

    const spend = new Map<string, number>();
    const entries = new Map<string, number>();
    for (const r of costRes.data ?? []) {
      const row = r as Record<string, unknown>;
      const id = String(row.supplier_id);
      spend.set(id, (spend.get(id) ?? 0) + Number(row.amount_uah ?? 0));
      entries.set(id, (entries.get(id) ?? 0) + 1);
    }

    const unitCosts = new Map<string, number>();
    for (const r of unitRes.data ?? []) {
      const id = String((r as Record<string, unknown>).supplier_id);
      unitCosts.set(id, (unitCosts.get(id) ?? 0) + 1);
    }

    return (supRes.data ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      const id = String(row.id);
      const status = String(row.status);
      const currency = String(row.currency ?? "");
      return {
        id,
        name: String(row.name),
        status: (isSupplierStatus(status) ? status : "active") as SupplierStatus,
        contactName: (row.contact_name as string | null) ?? null,
        email: (row.email as string | null) ?? null,
        phone: (row.phone as string | null) ?? null,
        website: (row.website as string | null) ?? null,
        country: (row.country as string | null) ?? null,
        leadTimeDays: row.lead_time_days === null ? null : Number(row.lead_time_days),
        currency: isSupplierCurrency(currency) ? currency : null,
        notes: (row.notes as string | null) ?? null,
        createdAt: String(row.created_at),
        spendUah: spend.get(id) ?? 0,
        costEntries: entries.get(id) ?? 0,
        unitCosts: unitCosts.get(id) ?? 0,
      };
    });
  } catch (e) {
    console.error("[admin/suppliers] read threw:", e);
    return null;
  }
}

/** Just id and name, for the costs-page picker — the full read is wasteful there. */
export type SupplierOption = { id: string; name: string };

export async function fetchSupplierOptions(): Promise<SupplierOption[] | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("suppliers")
      .select("id, name")
      .neq("status", "archived")
      .order("name", { ascending: true });

    if (error) {
      console.error("[admin/suppliers] options read failed:", error.code, error.message);
      return null;
    }

    return (data ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      return { id: String(row.id), name: String(row.name) };
    });
  } catch (e) {
    console.error("[admin/suppliers] options read threw:", e);
    return null;
  }
}

export async function insertSupplier(
  fields: SupplierFields & { createdBy: string }
): Promise<WriteResult> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("suppliers").insert({
      name: fields.name,
      status: fields.status,
      contact_name: fields.contactName,
      email: fields.email,
      phone: fields.phone,
      website: fields.website,
      country: fields.country,
      lead_time_days: fields.leadTimeDays,
      currency: fields.currency,
      notes: fields.notes,
      created_by: fields.createdBy,
    });

    if (error) {
      console.error("[admin/suppliers] insert failed:", error.code, error.message);
      return { ok: false, error: mapSupplierError(error.code, error.message) };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save the supplier." };
  }
}

export async function updateSupplierRecord(
  id: string,
  fields: SupplierFields
): Promise<WriteResult> {
  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("suppliers")
      .update({
        name: fields.name,
        status: fields.status,
        contact_name: fields.contactName,
        email: fields.email,
        phone: fields.phone,
        website: fields.website,
        country: fields.country,
        lead_time_days: fields.leadTimeDays,
        currency: fields.currency,
        notes: fields.notes,
      })
      .eq("id", id);

    if (error) {
      console.error("[admin/suppliers] update failed:", error.code, error.message);
      return { ok: false, error: mapSupplierError(error.code, error.message) };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save the supplier." };
  }
}

/**
 * Delete a supplier. The costs they were attached to KEEP their amounts and
 * their free-text names — 0022 sets supplier_id to null rather than cascading.
 * Machines pointing at them are detached the same way.
 */
export async function deleteSupplierRecord(id: string): Promise<WriteResult> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("suppliers").delete().eq("id", id);

    if (error) {
      console.error("[admin/suppliers] delete failed:", error.code, error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not delete the supplier." };
  }
}
