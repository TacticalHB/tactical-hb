"use server";

import { revalidatePath } from "next/cache";
import { requireAdminActor } from "@/lib/admin-guard";
import {
  deleteAdSpendRecord,
  deleteCreativeRecord,
  insertAdSpend,
  insertCreative,
  updateAdSpendRecord,
  updateCreativeRecord,
} from "@/lib/marketing-admin";
import {
  isCreativeKind,
  isCreativeStatus,
  isMarketingChannel,
  type MarketingChannel,
} from "@/lib/marketing-display";

/* ---------------------------------------------------------------------------
   Admin: the marketing memory's writes — creatives and spend rows.

   Authorisation is re-established here, not inherited from the page — see
   app/actions/stock.ts for the full reasoning. Nothing in this file (or this
   phase) touches an ad platform: "spend" rows are the founder's own records
   of money already spent elsewhere, and a creative's status is a shelf label,
   not a campaign switch. The Marketing Strategist reads these tables and
   writes only its own agent_runs row.

   Error strings returned to the UI are keys where the form can phrase the
   cause better bilingually (no_title, bad_month, …), raw messages otherwise.
--------------------------------------------------------------------------- */

export type MarketingResult = { ok: true } | { ok: false; error: string };

type CreativeForm = {
  title?: string;
  kind: string;
  url: string;
  channels: string[];
  productSku: string;
  status: string;
  notes: string;
};

function parseCreative(form: CreativeForm) {
  if (!isCreativeKind(form.kind)) return { error: "bad_kind" as const };
  if (!isCreativeStatus(form.status)) return { error: "bad_status" as const };

  const channels: MarketingChannel[] = [];
  for (const raw of form.channels ?? []) {
    if (!isMarketingChannel(raw)) return { error: "bad_channel" as const };
    if (!channels.includes(raw)) channels.push(raw);
  }

  return {
    error: null,
    fields: {
      kind: form.kind,
      url: form.url?.trim() || null,
      channels,
      productSku: form.productSku?.trim() || null,
      status: form.status,
      notes: form.notes?.trim() || null,
    },
  };
}

/** Add a creative to the library. */
export async function createCreative(form: CreativeForm): Promise<MarketingResult> {
  const actor = await requireAdminActor();
  if (!actor) return { ok: false, error: "Not authorised." };

  const title = form.title?.trim();
  if (!title) return { ok: false, error: "no_title" };

  const parsed = parseCreative(form);
  if (parsed.error) return { ok: false, error: parsed.error };

  const res = await insertCreative({ title, ...parsed.fields, createdBy: actor });
  if (!res.ok) return res;

  revalidatePath("/[locale]/admin/marketing", "page");
  return { ok: true };
}

/** Save edits to a creative — pause/retire moves live here too. */
export async function updateCreative(id: string, form: CreativeForm): Promise<MarketingResult> {
  const actor = await requireAdminActor();
  if (!actor) return { ok: false, error: "Not authorised." };
  if (!id?.trim()) return { ok: false, error: "not_found" };

  const title = form.title?.trim();
  if (!title) return { ok: false, error: "no_title" };

  const parsed = parseCreative(form);
  if (parsed.error) return { ok: false, error: parsed.error };

  const res = await updateCreativeRecord(id, { title, ...parsed.fields });
  if (!res.ok) return res;

  revalidatePath("/[locale]/admin/marketing", "page");
  return { ok: true };
}

/** Remove a creative. The client confirms first — there is no undo. */
export async function deleteCreative(id: string): Promise<MarketingResult> {
  const actor = await requireAdminActor();
  if (!actor) return { ok: false, error: "Not authorised." };
  if (!id?.trim()) return { ok: false, error: "not_found" };

  const res = await deleteCreativeRecord(id);
  if (res.ok) revalidatePath("/[locale]/admin/marketing", "page");
  return res;
}

/** UAH amounts up to ten million — past that it's a typo, not a budget. */
const MAX_AMOUNT = 10_000_000;
const MAX_COUNT = 10_000_000;

/** "" → null (not measured). "0" → 0 (measured, zero). Whole numbers only. */
function parseCount(raw: string): number | null | "invalid" {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0 || n > MAX_COUNT) return "invalid";
  return n;
}

function parseAmount(raw: string, required: boolean): number | null | "invalid" {
  const s = String(raw ?? "").trim().replace(",", ".");
  if (!s) return required ? "invalid" : null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0 || n > MAX_AMOUNT) return "invalid";
  return Math.round(n * 100) / 100;
}

type SpendForm = {
  channel?: string;
  month?: string;
  campaign: string;
  amountUah: string;
  amountEur: string;
  clicks: string;
  ordersAttributed: string;
  note: string;
};

function parseSpendEditable(form: SpendForm) {
  const amountUah = parseAmount(form.amountUah, true);
  if (amountUah === "invalid" || amountUah === null) return { error: "bad_amount" as const };

  const amountEur = parseAmount(form.amountEur, false);
  if (amountEur === "invalid") return { error: "bad_amount" as const };

  const clicks = parseCount(form.clicks);
  if (clicks === "invalid") return { error: "bad_number" as const };

  const ordersAttributed = parseCount(form.ordersAttributed);
  if (ordersAttributed === "invalid") return { error: "bad_number" as const };

  return {
    error: null,
    fields: {
      campaign: form.campaign?.trim() || null,
      amountUah,
      amountEur,
      clicks,
      ordersAttributed,
      note: form.note?.trim() || null,
    },
  };
}

/** Record spend for a channel and month. */
export async function addAdSpend(form: SpendForm): Promise<MarketingResult> {
  const actor = await requireAdminActor();
  if (!actor) return { ok: false, error: "Not authorised." };

  const channel = String(form.channel ?? "");
  if (!isMarketingChannel(channel)) return { ok: false, error: "bad_channel" };

  const month = String(form.month ?? "").trim();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return { ok: false, error: "bad_month" };

  const parsed = parseSpendEditable(form);
  if (parsed.error) return { ok: false, error: parsed.error };

  const res = await insertAdSpend({ channel, month, ...parsed.fields, createdBy: actor });
  if (!res.ok) return res;

  revalidatePath("/[locale]/admin/marketing", "page");
  return { ok: true };
}

/** Update amounts and results — the numbers that arrive after the month does. */
export async function updateAdSpend(id: string, form: SpendForm): Promise<MarketingResult> {
  const actor = await requireAdminActor();
  if (!actor) return { ok: false, error: "Not authorised." };
  if (!id?.trim()) return { ok: false, error: "not_found" };

  const parsed = parseSpendEditable(form);
  if (parsed.error) return { ok: false, error: parsed.error };

  const res = await updateAdSpendRecord(id, parsed.fields);
  if (!res.ok) return res;

  revalidatePath("/[locale]/admin/marketing", "page");
  return { ok: true };
}

/** Remove a spend row entered in error. The client confirms first. */
export async function deleteAdSpend(id: string): Promise<MarketingResult> {
  const actor = await requireAdminActor();
  if (!actor) return { ok: false, error: "Not authorised." };
  if (!id?.trim()) return { ok: false, error: "not_found" };

  const res = await deleteAdSpendRecord(id);
  if (res.ok) revalidatePath("/[locale]/admin/marketing", "page");
  return res;
}
