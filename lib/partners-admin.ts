import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Partner, PartnerStatus } from "@/lib/partners-display";
import { isAppLocale, type AppLocale } from "@/i18n/routing";
import { isAccountStatus } from "@/lib/wholesale-display";
import { isPartnerType } from "@/lib/wholesale-prices";

/* ---------------------------------------------------------------------------
   Reading and writing wholesale partners for /admin/partners.

   Service-role, same posture as every admin module: wholesale_partners has
   RLS on with no policies, so nothing reaches it through a browser key.
   Authorisation is the caller's job.

   THE LINK RULE (0017): orders.wholesale_partner_id is only ever written by
   the explicit link/unlink functions below, each invoked by an admin action.
   Nothing in this module links an order as a side effect of reading.
--------------------------------------------------------------------------- */

/** Statuses that count toward a partner's revenue and last-order date —
 *  the same allowlist the finance views use (0018). */
const COUNTABLE = ["paid", "processing", "shipped", "delivered"];

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function text(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s : null;
}

/** A linked order, as the partner card lists it. */
export type PartnerOrder = {
  id: string;
  reference: string;
  createdAt: string;
  status: string;
  amountUah: number | null;
};

export type PartnersRead = {
  partners: Partner[];
  /** Linked orders per partner id, newest first. */
  ordersByPartner: Record<string, PartnerOrder[]>;
};

/**
 * The whole register, with order aggregates derived on the way through.
 *
 * Two queries — partners, then the orders that could concern them — and the
 * joining happens here rather than in SQL because "unlinked order whose email
 * matches" needs a case-insensitive comparison against every partner at once.
 * At wholesale scale (tens of partners, hundreds of orders) this is nothing;
 * if order volume ever makes it something, the fix is a view, not a loop.
 */
export async function fetchPartners(): Promise<PartnersRead | null> {
  try {
    const admin = createAdminClient();

    const [pRes, oRes] = await Promise.all([
      admin
        .from("wholesale_partners")
        .select(
          "id, company, contact_name, email, phone, country, city, business_type, locale, status, next_follow_up, notes, created_at, user_id, account_status, application_note, account_status_changed_at, account_status_changed_by, partner_type"
        ),
      admin
        .from("orders")
        .select("id, external_ref, created_at, status, email, amount_uah, wholesale_partner_id")
        .order("created_at", { ascending: false })
        .limit(2000),
    ]);

    if (pRes.error) {
      console.error("[admin/partners] read failed:", pRes.error.code, pRes.error.message);
      return null;
    }
    if (oRes.error) {
      console.error("[admin/partners] orders read failed:", oRes.error.code, oRes.error.message);
      return null;
    }

    const orders = (oRes.data ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      return {
        id: String(row.id),
        reference: String(row.external_ref ?? String(row.id).slice(0, 8)),
        createdAt: String(row.created_at),
        status: String(row.status ?? ""),
        email: text(row.email)?.toLowerCase() ?? null,
        amountUah: num(row.amount_uah),
        partnerId: (row.wholesale_partner_id as string | null) ?? null,
      };
    });

    const ordersByPartner: Record<string, PartnerOrder[]> = {};
    const partners = (pRes.data ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      const id = String(row.id);
      const email = text(row.email)?.toLowerCase() ?? null;

      const linked = orders.filter((o) => o.partnerId === id);
      ordersByPartner[id] = linked.map(({ id: oid, reference, createdAt, status, amountUah }) => ({
        id: oid,
        reference,
        createdAt,
        status,
        amountUah,
      }));

      const countable = linked.filter((o) => COUNTABLE.includes(o.status));
      const matching =
        email === null
          ? 0
          : orders.filter((o) => o.partnerId === null && o.email === email).length;

      return {
        id,
        company: String(row.company),
        contactName: text(row.contact_name),
        email: text(row.email),
        phone: text(row.phone),
        country: text(row.country),
        locale: isAppLocale(row.locale) ? row.locale : ("en" as const),
        accountStatus: isAccountStatus(row.account_status) ? row.account_status : ("pending" as const),
        hasLogin: Boolean(row.user_id),
        applicationNote: text(row.application_note),
        partnerType: isPartnerType(row.partner_type) ? row.partner_type : null,
        city: text(row.city),
        businessType: text(row.business_type),
        statusChangedAt: text(row.account_status_changed_at),
        statusChangedBy: text(row.account_status_changed_by),
        status: String(row.status) as PartnerStatus,
        nextFollowUp: text(row.next_follow_up),
        notes: text(row.notes),
        createdAt: String(row.created_at),
        orderCount: countable.length,
        // Newest-first ordering above makes [0] the latest.
        lastOrderAt: countable[0]?.createdAt ?? null,
        revenueUah: countable.reduce((s, o) => s + (o.amountUah ?? 0), 0),
        matchingOrders: matching,
      };
    });

    return { partners, ordersByPartner };
  } catch (e) {
    console.error("[admin/partners] read threw:", e);
    return null;
  }
}

type WriteResult = { ok: true } | { ok: false; error: string };

export async function insertPartner(input: {
  company: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  locale: AppLocale;
  status: PartnerStatus;
  nextFollowUp: string | null;
  notes: string | null;
  createdBy: string;
}): Promise<WriteResult> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("wholesale_partners").insert({
      company: input.company,
      contact_name: input.contactName,
      email: input.email,
      phone: input.phone,
      country: input.country,
      locale: input.locale,
      status: input.status,
      next_follow_up: input.nextFollowUp,
      notes: input.notes,
      created_by: input.createdBy,
    });

    if (error) {
      // 23505 is the unique email index (0017): same company entered twice.
      if (error.code === "23505") return { ok: false, error: "duplicate_email" };
      console.error("[admin/partners] insert failed:", error.code, error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save the partner." };
  }
}

export async function updatePartnerRecord(
  id: string,
  patch: {
    contactName: string | null;
    email: string | null;
    phone: string | null;
    country: string | null;
    locale: AppLocale;
    status: PartnerStatus;
    nextFollowUp: string | null;
    notes: string | null;
  }
): Promise<WriteResult> {
  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("wholesale_partners")
      .update({
        contact_name: patch.contactName,
        email: patch.email,
        phone: patch.phone,
        country: patch.country,
        locale: patch.locale,
        status: patch.status,
        next_follow_up: patch.nextFollowUp,
        notes: patch.notes,
      })
      .eq("id", id);

    if (error) {
      if (error.code === "23505") return { ok: false, error: "duplicate_email" };
      console.error("[admin/partners] update failed:", error.code, error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save the partner." };
  }
}

/**
 * Link every unlinked order whose email matches the partner's.
 *
 * The match is exact on the lowercased address — ilike would treat the
 * underscores that really do appear in emails as wildcards, so the candidate
 * ids are resolved here and linked by id, which also makes the count honest.
 */
export async function linkMatchingOrders(
  partnerId: string
): Promise<{ ok: true; linked: number } | { ok: false; error: string }> {
  try {
    const admin = createAdminClient();

    const { data: partner, error: pErr } = await admin
      .from("wholesale_partners")
      .select("email")
      .eq("id", partnerId)
      .single();

    if (pErr || !partner?.email) {
      return { ok: false, error: pErr ? pErr.message : "This partner has no email to match on." };
    }
    const target = String(partner.email).trim().toLowerCase();

    const { data: candidates, error: cErr } = await admin
      .from("orders")
      .select("id, email")
      .is("wholesale_partner_id", null)
      .not("email", "is", null);

    if (cErr) return { ok: false, error: cErr.message };

    const ids = (candidates ?? [])
      .filter((o) => String(o.email).trim().toLowerCase() === target)
      .map((o) => o.id);

    if (ids.length === 0) return { ok: true, linked: 0 };

    const { error: uErr } = await admin
      .from("orders")
      .update({ wholesale_partner_id: partnerId })
      .in("id", ids)
      // Re-asserted in the write itself: a link set by hand between our read
      // and this update must not be stolen.
      .is("wholesale_partner_id", null);

    if (uErr) return { ok: false, error: uErr.message };
    return { ok: true, linked: ids.length };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not link the orders." };
  }
}

/**
 * Link one order by its TCT reference (or a raw order id). Refuses to steal:
 * an order already linked to another partner must be unlinked first, so a
 * typo cannot silently refile revenue.
 */
export async function linkOrderByReference(
  partnerId: string,
  reference: string
): Promise<{ ok: true; reference: string } | { ok: false; error: string }> {
  try {
    const admin = createAdminClient();
    const ref = reference.trim();

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref);
    const q = admin
      .from("orders")
      .select("id, external_ref, wholesale_partner_id")
      .limit(1);
    const { data, error } = isUuid ? await q.eq("id", ref) : await q.eq("external_ref", ref);

    if (error) return { ok: false, error: error.message };
    const order = data?.[0];
    if (!order) return { ok: false, error: "not_found" };
    if (order.wholesale_partner_id === partnerId) return { ok: false, error: "already_linked" };
    if (order.wholesale_partner_id !== null) return { ok: false, error: "linked_elsewhere" };

    const { error: uErr } = await admin
      .from("orders")
      .update({ wholesale_partner_id: partnerId })
      .eq("id", order.id)
      .is("wholesale_partner_id", null);

    if (uErr) return { ok: false, error: uErr.message };
    return { ok: true, reference: String(order.external_ref ?? String(order.id).slice(0, 8)) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not link the order." };
  }
}

/**
 * Remove a partner. Safe for the ledger by construction: the FK is
 * `on delete set null` (0017), so linked orders shed the annotation and
 * keep everything else. Their history simply becomes retail again.
 */
export async function deletePartnerRecord(id: string): Promise<WriteResult> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("wholesale_partners").delete().eq("id", id);

    if (error) {
      console.error("[admin/partners] delete failed:", error.code, error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not delete the partner." };
  }
}

/** Undo a link. The order itself is untouched — the link is an annotation. */
export async function unlinkOrder(orderId: string): Promise<WriteResult> {
  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("orders")
      .update({ wholesale_partner_id: null })
      .eq("id", orderId);

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not unlink the order." };
  }
}
