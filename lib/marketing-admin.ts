import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isCreativeKind,
  isCreativeStatus,
  isMarketingChannel,
  type AdSpendEntry,
  type Creative,
  type CreativeKind,
  type CreativeStatus,
  type MarketingChannel,
} from "@/lib/marketing-display";

/* ---------------------------------------------------------------------------
   Reading and writing the marketing memory (0020) for /admin/marketing.

   Service-role for the same reason as stock and costs: both tables have RLS
   on with no policies, so nothing reaches them through a browser key.
   Authorisation is the caller's job — every action re-checks for itself.

   These are the founder's records about marketing. The Marketing Strategist
   READS them (lib/strategist-admin.ts) and never writes here: a creative's
   status moves only through the actions in app/actions/marketing.ts, i.e.
   only by an admin pressing a button.
--------------------------------------------------------------------------- */

function channelList(v: unknown): MarketingChannel[] {
  if (!Array.isArray(v)) return [];
  return v.map(String).filter(isMarketingChannel);
}

export async function fetchCreatives(limit = 300): Promise<Creative[] | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("marketing_creatives")
      .select("id, title, kind, url, channels, product_sku, status, notes, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[admin/marketing] creatives read failed:", error.code, error.message);
      return null;
    }

    return (data ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      const kind = String(row.kind);
      const status = String(row.status);
      return {
        id: String(row.id),
        title: String(row.title),
        kind: (isCreativeKind(kind) ? kind : "other") as CreativeKind,
        url: (row.url as string | null) ?? null,
        channels: channelList(row.channels),
        productSku: (row.product_sku as string | null) ?? null,
        status: (isCreativeStatus(status) ? status : "active") as CreativeStatus,
        notes: (row.notes as string | null) ?? null,
        createdAt: String(row.created_at),
      };
    });
  } catch (e) {
    console.error("[admin/marketing] creatives read threw:", e);
    return null;
  }
}

export type CreativeFields = {
  title: string;
  kind: CreativeKind;
  url: string | null;
  channels: MarketingChannel[];
  productSku: string | null;
  status: CreativeStatus;
  notes: string | null;
};

type WriteResult = { ok: true } | { ok: false; error: string };

/** 23503 is Postgres for "that sku doesn't exist" — phrased for the form. */
function mapWriteError(code: string | undefined, message: string): string {
  if (code === "23503") return "bad_sku";
  return message;
}

export async function insertCreative(
  fields: CreativeFields & { createdBy: string }
): Promise<WriteResult> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("marketing_creatives").insert({
      title: fields.title,
      kind: fields.kind,
      url: fields.url,
      channels: fields.channels,
      product_sku: fields.productSku,
      status: fields.status,
      notes: fields.notes,
      created_by: fields.createdBy,
    });

    if (error) {
      console.error("[admin/marketing] creative insert failed:", error.code, error.message);
      return { ok: false, error: mapWriteError(error.code, error.message) };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save the creative." };
  }
}

export async function updateCreativeRecord(id: string, fields: CreativeFields): Promise<WriteResult> {
  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("marketing_creatives")
      .update({
        title: fields.title,
        kind: fields.kind,
        url: fields.url,
        channels: fields.channels,
        product_sku: fields.productSku,
        status: fields.status,
        notes: fields.notes,
      })
      .eq("id", id);

    if (error) {
      console.error("[admin/marketing] creative update failed:", error.code, error.message);
      return { ok: false, error: mapWriteError(error.code, error.message) };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save the creative." };
  }
}

export async function deleteCreativeRecord(id: string): Promise<WriteResult> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("marketing_creatives").delete().eq("id", id);

    if (error) {
      console.error("[admin/marketing] creative delete failed:", error.code, error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not delete the creative." };
  }
}

/** Spend rows, newest month first. Covers the strategist's trailing window. */
export async function fetchAdSpend(limit = 300): Promise<AdSpendEntry[] | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("ad_spend")
      .select("id, channel, month, campaign, amount_uah, amount_eur, clicks, orders_attributed, note")
      .order("month", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[admin/marketing] spend read failed:", error.code, error.message);
      return null;
    }

    return (data ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      const channel = String(row.channel);
      return {
        id: String(row.id),
        channel: (isMarketingChannel(channel) ? channel : "other") as MarketingChannel,
        month: String(row.month),
        campaign: (row.campaign as string | null) ?? null,
        amountUah: Number(row.amount_uah),
        amountEur: row.amount_eur === null ? null : Number(row.amount_eur),
        clicks: row.clicks === null ? null : Number(row.clicks),
        ordersAttributed: row.orders_attributed === null ? null : Number(row.orders_attributed),
        note: (row.note as string | null) ?? null,
      };
    });
  } catch (e) {
    console.error("[admin/marketing] spend read threw:", e);
    return null;
  }
}

export type AdSpendFields = {
  channel: MarketingChannel;
  month: string;
  campaign: string | null;
  amountUah: number;
  amountEur: number | null;
  clicks: number | null;
  ordersAttributed: number | null;
  note: string | null;
};

export async function insertAdSpend(
  fields: AdSpendFields & { createdBy: string }
): Promise<WriteResult> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("ad_spend").insert({
      channel: fields.channel,
      month: fields.month,
      campaign: fields.campaign,
      amount_uah: fields.amountUah,
      amount_eur: fields.amountEur,
      clicks: fields.clicks,
      orders_attributed: fields.ordersAttributed,
      note: fields.note,
      created_by: fields.createdBy,
    });

    if (error) {
      console.error("[admin/marketing] spend insert failed:", error.code, error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save the spend." };
  }
}

/** Amounts and results only — a wrong month or channel is a delete-and-redo,
    which keeps this surface (and its ways to go wrong) small. */
export async function updateAdSpendRecord(
  id: string,
  fields: Pick<AdSpendFields, "campaign" | "amountUah" | "amountEur" | "clicks" | "ordersAttributed" | "note">
): Promise<WriteResult> {
  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("ad_spend")
      .update({
        campaign: fields.campaign,
        amount_uah: fields.amountUah,
        amount_eur: fields.amountEur,
        clicks: fields.clicks,
        orders_attributed: fields.ordersAttributed,
        note: fields.note,
      })
      .eq("id", id);

    if (error) {
      console.error("[admin/marketing] spend update failed:", error.code, error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save the spend." };
  }
}

export async function deleteAdSpendRecord(id: string): Promise<WriteResult> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("ad_spend").delete().eq("id", id);

    if (error) {
      console.error("[admin/marketing] spend delete failed:", error.code, error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not delete the spend." };
  }
}
