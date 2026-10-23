import "server-only";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ACCEPTED_TYPES,
  EMPTY_ANSWERS,
  LIMITS,
  MAX_BYTES,
  isDocKind,
  isProductInterest,
  isVolume,
  isYears,
  missingFor,
  type Application,
  type ApplicationAnswers,
  type ApplicationDocument,
  type DocKind,
  type Missing,
} from "@/lib/wholesale-application-display";

/* ---------------------------------------------------------------------------
   The online wholesale application — the server half (23 Oct 2026).

   EVERY CALL STARTS FROM THE SIGNED-IN USER, never from an id the browser
   sends: the partner row is looked up by user_id, so nobody can read or write
   another company's application or documents. Only a PENDING account can
   change its application — once Mario has decided, the record is his.

   FILES NEVER PASS THROUGH OUR SERVER. A phone photo is easily over Vercel's
   4.5 MB request limit, so the browser uploads straight to the private bucket
   through a one-time signed URL this module hands out, and then tells us
   which path it used. registerDocument() checks that path belongs to this
   partner and that the file really is there before recording it.

   Reads tolerate migration 0048 not being run yet (42703 / 42P01 / no bucket):
   the application simply reads as empty and saving reports "not ready".
--------------------------------------------------------------------------- */

export const BUCKET = "wholesale-documents";

type Row = Record<string, unknown>;

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function clip(v: unknown, max: number): string {
  return String(v ?? "").trim().slice(0, max);
}

async function pendingPartnerFor(userId: string): Promise<{ id: string; row: Row } | null> {
  const { data, error } = await createAdminClient()
    .from("wholesale_partners")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return { id: String(data.id), row: data as Row };
}

function answersFrom(row: Row): ApplicationAnswers {
  return {
    legalName: str(row.legal_name),
    address: str(row.address),
    taxId: str(row.tax_id),
    yearsInBusiness: isYears(row.years_in_business) ? row.years_in_business : "",
    website: str(row.website),
    expectedVolume: isVolume(row.expected_volume) ? row.expected_volume : "",
    productsInterest: Array.isArray(row.products_interest) ? row.products_interest.filter(isProductInterest) : [],
    referralSource: str(row.referral_source),
    comments: str(row.application_comments),
  };
}

export async function documentsFor(partnerId: string): Promise<ApplicationDocument[]> {
  const { data, error } = await createAdminClient()
    .from("wholesale_documents")
    .select("id, kind, filename, size_bytes, uploaded_at")
    .eq("partner_id", partnerId)
    .order("uploaded_at", { ascending: true });
  if (error) return []; // table not there yet (0048) — nothing uploaded
  return (data ?? [])
    .filter((d) => isDocKind(d.kind))
    .map((d) => ({
      id: String(d.id),
      kind: d.kind as DocKind,
      filename: String(d.filename),
      sizeBytes: d.size_bytes == null ? null : Number(d.size_bytes),
      uploadedAt: String(d.uploaded_at),
    }));
}

export function applicationFromRow(row: Row, documents: ApplicationDocument[]): Application {
  return {
    ...EMPTY_ANSWERS,
    ...answersFrom(row),
    confirmedName: str(row.confirmed_name) || null,
    confirmedAt: str(row.confirmed_at) || null,
    completedAt: str(row.application_completed_at) || null,
    documents,
  };
}

/** The signed-in user's application, or null when they have no partner row. */
export async function applicationForUser(userId: string): Promise<{ partnerId: string; application: Application } | null> {
  const p = await pendingPartnerFor(userId);
  if (!p) return null;
  return { partnerId: p.id, application: applicationFromRow(p.row, await documentsFor(p.id)) };
}

export type AppResult<T = object> = ({ ok: true } & T) | { ok: false; error: string; missing?: Missing[] };

function sanitise(input: Partial<ApplicationAnswers>): ApplicationAnswers {
  return {
    legalName: clip(input.legalName, LIMITS.legalName),
    address: clip(input.address, LIMITS.address),
    taxId: clip(input.taxId, LIMITS.taxId),
    yearsInBusiness: isYears(input.yearsInBusiness) ? input.yearsInBusiness : "",
    website: clip(input.website, LIMITS.website),
    expectedVolume: isVolume(input.expectedVolume) ? input.expectedVolume : "",
    productsInterest: Array.isArray(input.productsInterest) ? [...new Set(input.productsInterest.filter(isProductInterest))] : [],
    referralSource: clip(input.referralSource, LIMITS.referralSource),
    comments: clip(input.comments, LIMITS.comments),
  };
}

function columnsFor(a: ApplicationAnswers) {
  return {
    legal_name: a.legalName || null,
    address: a.address || null,
    tax_id: a.taxId || null,
    years_in_business: a.yearsInBusiness || null,
    website: a.website || null,
    expected_volume: a.expectedVolume || null,
    products_interest: a.productsInterest.length ? a.productsInterest : null,
    referral_source: a.referralSource || null,
    application_comments: a.comments || null,
  };
}

/** Save the answers as they stand (a draft). Pending accounts only. */
export async function saveAnswers(userId: string, input: Partial<ApplicationAnswers>): Promise<AppResult> {
  const p = await pendingPartnerFor(userId);
  if (!p) return { ok: false, error: "no_application" };
  if (p.row.account_status !== "pending") return { ok: false, error: "decided" };
  const { error } = await createAdminClient().from("wholesale_partners").update(columnsFor(sanitise(input))).eq("id", p.id);
  if (error) {
    console.error("[wholesale-application] save failed:", error.code, error.message);
    return { ok: false, error: error.code === "42703" ? "not_ready" : "failed" };
  }
  return { ok: true };
}

function extFor(type: string, filename: string): string {
  const fromName = filename.split(".").pop()?.toLowerCase() ?? "";
  if (/^(pdf|jpe?g|png|heic|heif|webp)$/.test(fromName)) return fromName;
  return { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/heic": "heic", "image/heif": "heif", "image/webp": "webp" }[type] ?? "bin";
}

/** A one-time signed upload URL for one file. */
export async function createUploadSlot(
  userId: string,
  kind: unknown,
  filename: unknown,
  contentType: unknown,
  size: unknown
): Promise<AppResult<{ path: string; token: string }>> {
  const p = await pendingPartnerFor(userId);
  if (!p) return { ok: false, error: "no_application" };
  if (p.row.account_status !== "pending") return { ok: false, error: "decided" };
  if (!isDocKind(kind)) return { ok: false, error: "bad_kind" };
  const type = String(contentType ?? "");
  if (!ACCEPTED_TYPES.includes(type)) return { ok: false, error: "bad_type" };
  const bytes = Number(size);
  if (!Number.isFinite(bytes) || bytes <= 0 || bytes > MAX_BYTES) return { ok: false, error: "too_big" };

  const path = `${p.id}/${kind}-${randomUUID()}.${extFor(type, String(filename ?? ""))}`;
  const { data, error } = await createAdminClient().storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error("[wholesale-application] upload slot failed:", error?.message);
    return { ok: false, error: "not_ready" };
  }
  return { ok: true, path: data.path, token: data.token };
}

/** Record a file the browser has uploaded into its slot. */
export async function registerDocument(
  userId: string,
  path: unknown,
  kind: unknown,
  filename: unknown,
  contentType: unknown,
  size: unknown
): Promise<AppResult<{ document: ApplicationDocument }>> {
  const p = await pendingPartnerFor(userId);
  if (!p) return { ok: false, error: "no_application" };
  if (p.row.account_status !== "pending") return { ok: false, error: "decided" };
  const storagePath = String(path ?? "");
  // The path must be one this partner was given — <partner id>/<kind>-…
  if (!isDocKind(kind) || !storagePath.startsWith(`${p.id}/${kind}-`) || storagePath.includes("..")) {
    return { ok: false, error: "bad_path" };
  }
  const db = createAdminClient();
  // …and the file must really be there.
  const folder = storagePath.slice(0, storagePath.lastIndexOf("/"));
  const name = storagePath.slice(storagePath.lastIndexOf("/") + 1);
  const { data: listed } = await db.storage.from(BUCKET).list(folder, { search: name, limit: 1 });
  if (!listed?.some((f) => f.name === name)) return { ok: false, error: "not_uploaded" };

  const row = {
    partner_id: p.id,
    kind,
    storage_path: storagePath,
    filename: clip(filename, LIMITS.filename) || name,
    content_type: String(contentType ?? "") || null,
    size_bytes: Number.isFinite(Number(size)) ? Number(size) : null,
  };
  const { data, error } = await db.from("wholesale_documents").insert(row).select("id, uploaded_at").single();
  if (error || !data) {
    console.error("[wholesale-application] document insert failed:", error?.message);
    return { ok: false, error: "failed" };
  }
  return {
    ok: true,
    document: { id: String(data.id), kind, filename: row.filename, sizeBytes: row.size_bytes, uploadedAt: String(data.uploaded_at) },
  };
}

export async function removeDocument(userId: string, documentId: unknown): Promise<AppResult> {
  const p = await pendingPartnerFor(userId);
  if (!p) return { ok: false, error: "no_application" };
  if (p.row.account_status !== "pending") return { ok: false, error: "decided" };
  const db = createAdminClient();
  const { data: doc } = await db
    .from("wholesale_documents")
    .select("id, storage_path")
    .eq("id", String(documentId ?? ""))
    .eq("partner_id", p.id) // ← only their own
    .maybeSingle();
  if (!doc) return { ok: false, error: "not_found" };
  await db.storage.from(BUCKET).remove([String(doc.storage_path)]);
  await db.from("wholesale_documents").delete().eq("id", doc.id);
  return { ok: true };
}

/**
 * Send the application: saves the answers, checks everything required is in,
 * and stamps it complete. Returns the partner row for the staff email.
 */
export async function completeApplication(
  userId: string,
  input: Partial<ApplicationAnswers>,
  confirmedName: unknown
): Promise<AppResult<{ partner: Row; application: Application }>> {
  const p = await pendingPartnerFor(userId);
  if (!p) return { ok: false, error: "no_application" };
  if (p.row.account_status !== "pending") return { ok: false, error: "decided" };

  const answers = sanitise(input);
  const name = clip(confirmedName, LIMITS.confirmedName);
  const documents = await documentsFor(p.id);
  const missing = missingFor(answers, documents, name);
  if (missing.length) {
    await saveAnswers(userId, answers); // keep what they did fill in
    return { ok: false, error: "incomplete", missing };
  }

  const now = new Date().toISOString();
  const { data, error } = await createAdminClient()
    .from("wholesale_partners")
    .update({ ...columnsFor(answers), confirmed_name: name, confirmed_at: now, application_completed_at: now })
    .eq("id", p.id)
    .select("*")
    .single();
  if (error || !data) {
    console.error("[wholesale-application] complete failed:", error?.code, error?.message);
    return { ok: false, error: error?.code === "42703" ? "not_ready" : "failed" };
  }
  return { ok: true, partner: data as Row, application: applicationFromRow(data as Row, documents) };
}

/* ---- Admin ---------------------------------------------------------------- */

/** A five-minute link to one document, for Admin › Partners. Caller must be an admin. */
export async function documentLink(documentId: string): Promise<string | null> {
  const db = createAdminClient();
  const { data: doc } = await db.from("wholesale_documents").select("storage_path, filename").eq("id", documentId).maybeSingle();
  if (!doc) return null;
  const { data } = await db.storage.from(BUCKET).createSignedUrl(String(doc.storage_path), 300, { download: String(doc.filename) });
  return data?.signedUrl ?? null;
}

/** Every partner's documents, keyed by partner id — one query for the whole admin list. */
export async function documentsByPartner(): Promise<Record<string, ApplicationDocument[]>> {
  const { data, error } = await createAdminClient()
    .from("wholesale_documents")
    .select("id, partner_id, kind, filename, size_bytes, uploaded_at")
    .order("uploaded_at", { ascending: true });
  if (error) return {};
  const out: Record<string, ApplicationDocument[]> = {};
  for (const d of data ?? []) {
    if (!isDocKind(d.kind)) continue;
    (out[String(d.partner_id)] ??= []).push({
      id: String(d.id),
      kind: d.kind,
      filename: String(d.filename),
      sizeBytes: d.size_bytes == null ? null : Number(d.size_bytes),
      uploadedAt: String(d.uploaded_at),
    });
  }
  return out;
}

/* ---- Housekeeping (daily cron) -------------------------------------------- */

/**
 * Delete the documents of applicants Mario REJECTED more than six months ago —
 * the privacy page promises it. The answers stay on the CRM row; only the
 * uploaded files go. Never throws.
 */
export async function purgeRejectedDocuments(): Promise<number> {
  try {
    const db = createAdminClient();
    const cutoff = new Date(Date.now() - 183 * 24 * 3600 * 1000).toISOString();
    const { data: partners } = await db
      .from("wholesale_partners")
      .select("id")
      .eq("account_status", "rejected")
      .lt("account_status_changed_at", cutoff);
    const ids = (partners ?? []).map((p) => String(p.id));
    if (!ids.length) return 0;
    const { data: docs } = await db.from("wholesale_documents").select("id, storage_path").in("partner_id", ids);
    if (!docs?.length) return 0;
    await db.storage.from(BUCKET).remove(docs.map((d) => String(d.storage_path)));
    await db.from("wholesale_documents").delete().in("id", docs.map((d) => d.id));
    console.log("[wholesale-application] purged", docs.length, "documents of rejected applicants");
    return docs.length;
  } catch (e) {
    console.error("[wholesale-application] purge failed:", e);
    return 0;
  }
}
