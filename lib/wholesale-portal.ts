import "server-only";
import { randomInt } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { products, type Product, type Variant } from "@/lib/products";
import {
  canAccessPortal,
  isAccountStatus,
  isRequestStatus,
  makeReference,
  type AccountStatus,
  type PortalPartner,
  type RequestItem,
  type RequestStatus,
  type WholesaleRequest,
} from "@/lib/wholesale-display";

/* ---------------------------------------------------------------------------
   The wholesale portal's data access.

   Service-role, because wholesale_requests and wholesale_request_items have
   RLS on with no policies — nothing reaches them through a browser key. That
   makes authorisation entirely this module's job, and the rule is one line:
   every function that can see or change a partner's data takes the CALLER'S
   auth user id and scopes to it. None of them take a partner id from the
   client, because a partner id from the client is a partner id an attacker
   chose.

   NOTHING HERE TAKES MONEY. A request has no shipping method, no carrier, no
   invoice and no payment intent. Totals are a courtesy copy of dealer prices
   where those exist, and null where they do not.
--------------------------------------------------------------------------- */

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function text(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s : null;
}

/* ---- Dealer prices --------------------------------------------------------
   One place decides whether a product has a trade price, so the catalogue,
   the submitted line and the staff email can never disagree about it.
--------------------------------------------------------------------------- */

export type DealerPrice = { eur: number; uah: number } | null;

/**
 * The trade price of one orderable thing — a product, or one colour of it.
 *
 * A colour's own pair wins when it has one, and the product's is the fallback,
 * mirroring how retail resolves `variant.price ?? product.price`. What neither
 * level ever falls back to is the RETAIL price: absent means "not agreed", and
 * the portal says so.
 */
export function dealerPrice(p: Product, variant?: Variant | null): DealerPrice {
  const eur = variant?.wholesalePriceEur ?? p.wholesalePriceEur;
  const uah = variant?.wholesalePriceUah ?? p.wholesalePriceUah;
  // BOTH OR NEITHER. A product priced in one currency only would show a
  // number on one storefront and "quote on request" on another for the same
  // line, and the request would be half-totalled.
  if (typeof eur !== "number" || typeof uah !== "number") return null;
  if (!Number.isFinite(eur) || !Number.isFinite(uah) || eur <= 0 || uah <= 0) return null;
  return { eur, uah };
}

/**
 * The stock key for a line: `<slug>` or `<slug>__<variant>`.
 *
 * Lowercased and derived here rather than typed anywhere, because stock_items
 * (0015) and the order-consumption function both build it exactly this way. A
 * second spelling of the same key would be a line nothing could be counted
 * against.
 */
export function lineSku(slug: string, variant?: string | null): string {
  return variant ? `${slug}__${variant.toLowerCase()}` : slug;
}

/** Everything a partner may put on a request. Retail-only SKUs would be
    excluded here; today the whole catalogue is sellable to trade. */
export function wholesaleCatalogue(): Product[] {
  return products;
}

/* ---- Who is asking --------------------------------------------------------- */

/**
 * The partner row belonging to a signed-in user, or null.
 *
 * Returns the ACCOUNT status too, so callers can tell "no application" from
 * "application pending" — those are different screens, and conflating them
 * shows a registration form to someone who already registered.
 *
 * Only the fields the portal needs. The CRM's notes, follow-up date and
 * created_by never leave the server: they are staff-owned and a partner
 * reading their own file would be a leak, not a feature.
 */
export async function partnerForUser(userId: string): Promise<PortalPartner | null> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("wholesale_partners")
    .select("id, company, contact_name, email, phone, locale, account_status")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[wholesale] partner lookup failed:", error.message);
    return null;
  }
  if (!data) return null;

  const status = data.account_status;
  return {
    id: String(data.id),
    company: String(data.company ?? ""),
    contactName: text(data.contact_name),
    email: text(data.email),
    phone: text(data.phone),
    locale: String(data.locale ?? "en"),
    // An unrecognised value fails closed rather than being trusted through.
    accountStatus: isAccountStatus(status) ? status : ("pending" as AccountStatus),
  };
}

/* ---- Applying -------------------------------------------------------------- */

export type ApplyInput = {
  userId: string;
  company: string;
  contactName: string;
  email: string;
  phone: string;
  country: string;
  /* City and business type match what /api/wholesale has always asked an
     enquiry for. A reviewer opening a trade account wants to know what kind
     of business it is before anything else, and registration used to arrive
     without it. */
  city: string;
  businessType: string;
  locale: string;
  note: string;
};

export type ApplyResult =
  | { ok: true; partnerId: string; alreadyExisted: boolean }
  | { ok: false; error: "taken" | "failed" };

/**
 * Attach a freshly registered user to a partner row, pending approval.
 *
 * THE ROW MAY ALREADY EXIST. Most applicants send the enquiry form first, so
 * sales has already created their company in the CRM. Registering must adopt
 * that row rather than creating a second one — the unique index on email would
 * reject the duplicate anyway, and a partner whose application landed in a
 * brand-new row would look like a stranger to the salesperson handling them.
 *
 * WHAT THIS FUNCTION CANNOT DO IS GRANT ACCESS. account_status is written as
 * 'pending' on insert and left completely alone on adopt — if a row somehow
 * already said 'approved', that was an admin's decision and this path neither
 * needs nor is allowed to change it. There is no argument, anywhere, that
 * lets the application decide its own status.
 */
export async function applyForAccount(input: ApplyInput): Promise<ApplyResult> {
  const db = createAdminClient();
  const email = input.email.trim().toLowerCase();

  const { data: existing, error: readErr } = await db
    .from("wholesale_partners")
    .select("id, user_id")
    .ilike("email", email)
    .maybeSingle();

  if (readErr) {
    console.error("[wholesale] application lookup failed:", readErr.message);
    return { ok: false, error: "failed" };
  }

  if (existing) {
    // Somebody else's login already owns this company. Refuse rather than
    // reassign: reassigning would hand one partner's request history to
    // whoever registered second.
    if (existing.user_id && existing.user_id !== input.userId) {
      console.warn("[wholesale] application refused: company already claimed by another login");
      return { ok: false, error: "taken" };
    }
    const { error } = await db
      .from("wholesale_partners")
      .update({
        user_id: input.userId,
        contact_name: input.contactName || null,
        phone: input.phone || null,
        country: input.country || null,
        city: input.city || null,
        business_type: input.businessType || null,
        locale: input.locale,
        application_note: input.note || null,
      })
      .eq("id", existing.id);
    if (error) {
      console.error("[wholesale] application adopt failed:", error.message);
      return { ok: false, error: "failed" };
    }
    return { ok: true, partnerId: String(existing.id), alreadyExisted: true };
  }

  const { data, error } = await db
    .from("wholesale_partners")
    .insert({
      company: input.company,
      contact_name: input.contactName || null,
      email,
      phone: input.phone || null,
      country: input.country || null,
      city: input.city || null,
      business_type: input.businessType || null,
      locale: input.locale,
      user_id: input.userId,
      account_status: "pending",
      // CRM pipeline, separate ladder: an application in hand is exactly what
      // 'application_sent' means, and it saves the salesperson a click.
      status: "application_sent",
      application_note: input.note || null,
      created_by: "self-registration",
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[wholesale] application insert failed:", error?.message);
    return { ok: false, error: "failed" };
  }
  return { ok: true, partnerId: String(data.id), alreadyExisted: false };
}

/* ---- Submitting a request --------------------------------------------------- */

export type SubmitLine = { slug: string; variant?: string | null; qty: number };

export type SubmitResult =
  | { ok: true; request: WholesaleRequest }
  | { ok: false; error: "not_approved" | "empty" | "failed" };

const MAX_LINES = 60;
const MAX_QTY = 100_000;

/**
 * Turn a set of quantities into a stored request.
 *
 * THE GATE IS RE-CHECKED HERE. The portal page already refuses to render for
 * anyone unapproved, but a page that refuses to render is a UI decision and
 * this is a write. Approval is established from the database, keyed on the
 * caller's user id, on every single submission.
 *
 * PRICES ARE READ SERVER-SIDE, never accepted from the request body. The
 * client sends slugs and quantities; what those cost is not its business to
 * assert.
 */
export async function submitRequest(
  userId: string,
  lines: SubmitLine[],
  note: string
): Promise<SubmitResult> {
  const partner = await partnerForUser(userId);
  if (!partner || !canAccessPortal(partner.accountStatus)) {
    console.warn("[wholesale] submit refused for account status", partner?.accountStatus ?? "none");
    return { ok: false, error: "not_approved" };
  }

  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const items: RequestItem[] = [];

  for (const line of lines.slice(0, MAX_LINES)) {
    const product = bySlug.get(String(line.slug));
    const qty = Math.floor(Number(line.qty));
    if (!product) continue;
    if (!Number.isFinite(qty) || qty <= 0 || qty > MAX_QTY) continue;

    /* THE COLOUR IS RESOLVED AGAINST THE CATALOGUE, not taken as given. The
       client sends a name; if it does not match one this product actually has,
       the line is dropped rather than stored with a colour nobody makes.

       And a product WITH colours cannot be ordered without one: a bare
       hmd-tct-op line would resolve to a sku stock has no row for, so it is
       refused here rather than landing on a packing list as an open question. */
    const wanted = line.variant ? String(line.variant) : null;
    let variant: Variant | null = null;
    if (product.variants?.length) {
      variant = product.variants.find((v) => v.name === wanted) ?? null;
      if (!variant) continue;
    } else if (wanted) {
      continue;
    }

    const price = dealerPrice(product, variant);
    items.push({
      productSlug: product.slug,
      sku: lineSku(product.slug, variant?.name),
      variant: variant?.name ?? null,
      // The name as it will be read on a packing list, colour included.
      name: variant ? `${product.nameEn} — ${variant.name}` : product.nameEn,
      qty,
      unitPriceEur: price ? price.eur : null,
      unitPriceUah: price ? price.uah : null,
      lineTotalEur: price ? round2(price.eur * qty) : null,
      lineTotalUah: price ? round2(price.uah * qty) : null,
    });
  }

  if (items.length === 0) return { ok: false, error: "empty" };

  /* A subtotal only when EVERY line has one. A partial total invites the
     reader to treat it as the price of the request, and it is not — it is the
     price of the priced half. Null says "we will quote", which is true. */
  const allPriced = items.every((i) => i.lineTotalEur !== null);
  const subtotalEur = allPriced ? round2(items.reduce((s, i) => s + (i.lineTotalEur ?? 0), 0)) : null;
  const subtotalUah = allPriced ? round2(items.reduce((s, i) => s + (i.lineTotalUah ?? 0), 0)) : null;

  const db = createAdminClient();
  const reference = makeReference((max) => randomInt(max));

  const { data, error } = await db
    .from("wholesale_requests")
    .insert({
      reference,
      partner_id: partner.id,
      user_id: userId,
      company: partner.company,
      email: partner.email,
      phone: partner.phone,
      locale: partner.locale,
      note: note.trim() ? note.trim().slice(0, 2000) : null,
      status: "submitted",
      subtotal_eur: subtotalEur,
      subtotal_uah: subtotalUah,
      item_count: items.reduce((s, i) => s + i.qty, 0),
    })
    .select("id, reference, created_at")
    .single();

  if (error || !data) {
    console.error("[wholesale] request insert failed:", error?.message);
    return { ok: false, error: "failed" };
  }

  const { error: itemsErr } = await db.from("wholesale_request_items").insert(
    items.map((i) => ({
      request_id: data.id,
      product_slug: i.productSlug,
      sku: i.sku,
      variant: i.variant,
      name: i.name,
      qty: i.qty,
      unit_price_eur: i.unitPriceEur,
      unit_price_uah: i.unitPriceUah,
      line_total_eur: i.lineTotalEur,
      line_total_uah: i.lineTotalUah,
    }))
  );

  if (itemsErr) {
    /* A header with no lines is worse than no request at all — staff would
       email about an empty order. Roll it back and report failure so the
       partner presses submit again rather than believing it landed. */
    console.error("[wholesale] request items failed, rolling back header:", itemsErr.message);
    await db.from("wholesale_requests").delete().eq("id", data.id);
    return { ok: false, error: "failed" };
  }

  return {
    ok: true,
    request: {
      id: String(data.id),
      reference: String(data.reference),
      partnerId: partner.id,
      company: partner.company,
      email: partner.email,
      phone: partner.phone,
      locale: partner.locale,
      note: note.trim() || null,
      status: "submitted",
      subtotalEur,
      subtotalUah,
      itemCount: items.reduce((s, i) => s + i.qty, 0),
      createdAt: String(data.created_at),
      items,
    },
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/* ---- Reading requests -------------------------------------------------------- */

type Row = Record<string, unknown>;

function mapItems(rows: Row[]): RequestItem[] {
  return rows.map((r) => ({
    productSlug: String(r.product_slug ?? ""),
    sku: text(r.sku),
    variant: text(r.variant),
    name: String(r.name ?? ""),
    qty: Number(r.qty ?? 0),
    unitPriceEur: num(r.unit_price_eur),
    unitPriceUah: num(r.unit_price_uah),
    lineTotalEur: num(r.line_total_eur),
    lineTotalUah: num(r.line_total_uah),
  }));
}

function mapRequest(r: Row, items: RequestItem[]): WholesaleRequest {
  const status = r.status;
  return {
    id: String(r.id),
    reference: String(r.reference ?? ""),
    partnerId: String(r.partner_id ?? ""),
    company: String(r.company ?? ""),
    email: text(r.email),
    phone: text(r.phone),
    locale: String(r.locale ?? "en"),
    note: text(r.note),
    status: isRequestStatus(status) ? status : "submitted",
    subtotalEur: num(r.subtotal_eur),
    subtotalUah: num(r.subtotal_uah),
    itemCount: Number(r.item_count ?? 0),
    createdAt: String(r.created_at ?? ""),
    items,
  };
}

/**
 * A partner's own history.
 *
 * Scoped by the CALLER'S user id resolved to a partner id, never by a partner
 * id the client supplied — that is the whole of "partners see only their own
 * requests", and it is enforced here rather than by a policy because the
 * tables are unreachable from a browser key at all.
 */
export async function requestsForUser(userId: string): Promise<WholesaleRequest[]> {
  const partner = await partnerForUser(userId);
  if (!partner) return [];

  const db = createAdminClient();
  const { data, error } = await db
    .from("wholesale_requests")
    .select("*")
    .eq("partner_id", partner.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data) {
    if (error) console.error("[wholesale] history read failed:", error.message);
    return [];
  }
  return attachItems(db, data as Row[]);
}

/** The admin inbox: every request, newest first. Callers must be admins. */
export async function fetchAllRequests(limit = 200): Promise<WholesaleRequest[] | null> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("wholesale_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[wholesale] admin inbox read failed:", error.message);
    return null;
  }
  return attachItems(db, (data ?? []) as Row[]);
}

/** One round trip for the lines of every request, rather than N. */
async function attachItems(
  db: ReturnType<typeof createAdminClient>,
  rows: Row[]
): Promise<WholesaleRequest[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => String(r.id));
  const { data: itemRows } = await db
    .from("wholesale_request_items")
    .select("*")
    .in("request_id", ids);

  const byRequest = new Map<string, Row[]>();
  for (const row of (itemRows ?? []) as Row[]) {
    const key = String(row.request_id);
    const list = byRequest.get(key);
    if (list) list.push(row);
    else byRequest.set(key, [row]);
  }
  return rows.map((r) => mapRequest(r, mapItems(byRequest.get(String(r.id)) ?? [])));
}

/* ---- Admin writes ------------------------------------------------------------ */

/**
 * Approve, reject or suspend a partner's portal access. Admin-only callers.
 *
 * Returns the row as it was BEFORE the change plus the locale, because the
 * caller has to email the partner and would otherwise need a second read to
 * find out which language to write in — and because "was this already
 * approved" decides whether an approval is news.
 */
export async function setAccountStatus(
  partnerId: string,
  status: AccountStatus,
  actorEmail: string
): Promise<{
  ok: boolean;
  previous?: AccountStatus;
  email?: string | null;
  locale?: string;
  /** Carried out so the decline letter can ask for the right evidence. */
  businessType?: string | null;
}> {
  const db = createAdminClient();

  const { data: before } = await db
    .from("wholesale_partners")
    .select("account_status, email, locale, approved_at, business_type")
    .eq("id", partnerId)
    .maybeSingle();

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    account_status: status,
    /* EVERY change is attributable, in either direction. Rejection and
       suspension are the two decisions that need explaining months later, and
       neither used to leave a trace. */
    account_status_changed_at: now,
    account_status_changed_by: actorEmail,
  };

  /* approved_at / approved_by are FIRST approval, and are never cleared. They
     used to be wiped on any non-approved status, which threw away the record
     that a now-suspended partner had ever been let in — precisely the fact you
     want when they write asking what happened. */
  if (status === "approved" && !before?.approved_at) {
    patch.approved_at = now;
    patch.approved_by = actorEmail;
  }

  const { error } = await db.from("wholesale_partners").update(patch).eq("id", partnerId);

  if (error) {
    console.error("[wholesale] account status write failed:", error.message);
    return { ok: false };
  }
  return {
    ok: true,
    previous: isAccountStatus(before?.account_status) ? before.account_status : undefined,
    email: text(before?.email),
    locale: String(before?.locale ?? "en"),
    businessType: text(before?.business_type),
  };
}

/** Move a request along its ladder. Admin-only callers. */
export async function setRequestStatus(requestId: string, status: RequestStatus): Promise<boolean> {
  const db = createAdminClient();
  const { error } = await db
    .from("wholesale_requests")
    .update({ status })
    .eq("id", requestId);

  if (error) {
    console.error("[wholesale] request status write failed:", error.message);
    return false;
  }
  return true;
}

/** The partner rows behind the admin inbox, keyed by id. */
export async function partnerContactsById(): Promise<Record<string, { accountStatus: string; email: string | null }>> {
  const db = createAdminClient();
  const { data } = await db.from("wholesale_partners").select("id, account_status, email");
  const out: Record<string, { accountStatus: string; email: string | null }> = {};
  for (const r of (data ?? []) as Row[]) {
    out[String(r.id)] = { accountStatus: String(r.account_status ?? "pending"), email: text(r.email) };
  }
  return out;
}
