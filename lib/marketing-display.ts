/* ---------------------------------------------------------------------------
   The vocabulary of marketing: channels, creative kinds and statuses, the
   shapes of a creative and a spend row.

   Pure — no database, no server-only import — because the add forms are
   client components and need the same lists the queries validate against.
   One list, not two that drift. The reads and writes live in
   lib/marketing-admin.ts, which IS server-only. Same split as costs.
--------------------------------------------------------------------------- */

/** One channel list for creatives AND spend (0020). 'organic' and 'email'
    are legitimate creative tags; as spend rows they are unusual but legal. */
export const MARKETING_CHANNELS = [
  "meta",
  "instagram",
  "reddit",
  "tiktok",
  "google",
  "email",
  "organic",
  "other",
] as const;

export type MarketingChannel = (typeof MARKETING_CHANNELS)[number];

export function isMarketingChannel(v: string): v is MarketingChannel {
  return (MARKETING_CHANNELS as readonly string[]).includes(v);
}

export function channelLabel(c: MarketingChannel, uk: boolean): string {
  const labels: Record<MarketingChannel, [en: string, uk: string]> = {
    meta: ["Meta", "Meta"],
    instagram: ["Instagram", "Instagram"],
    reddit: ["Reddit", "Reddit"],
    tiktok: ["TikTok", "TikTok"],
    google: ["Google", "Google"],
    email: ["Email", "Email"],
    organic: ["Organic", "Органіка"],
    other: ["Other", "Інше"],
  };
  return labels[c][uk ? 1 : 0];
}

export const CREATIVE_KINDS = ["image", "video", "copy", "other"] as const;
export type CreativeKind = (typeof CREATIVE_KINDS)[number];

export function isCreativeKind(v: string): v is CreativeKind {
  return (CREATIVE_KINDS as readonly string[]).includes(v);
}

export function kindLabel(k: CreativeKind, uk: boolean): string {
  const labels: Record<CreativeKind, [en: string, uk: string]> = {
    image: ["Image", "Зображення"],
    video: ["Video", "Відео"],
    copy: ["Copy", "Текст"],
    other: ["Other", "Інше"],
  };
  return labels[k][uk ? 1 : 0];
}

export const CREATIVE_STATUSES = ["active", "paused", "retired"] as const;
export type CreativeStatus = (typeof CREATIVE_STATUSES)[number];

export function isCreativeStatus(v: string): v is CreativeStatus {
  return (CREATIVE_STATUSES as readonly string[]).includes(v);
}

export function creativeStatusLabel(s: CreativeStatus, uk: boolean): string {
  const labels: Record<CreativeStatus, [en: string, uk: string]> = {
    active: ["Active", "Активний"],
    paused: ["Paused", "Пауза"],
    retired: ["Retired", "Архів"],
  };
  return labels[s][uk ? 1 : 0];
}

/** Chip colours, matching the admin palette. */
export function creativeStatusTone(s: CreativeStatus): { bg: string; fg: string } {
  switch (s) {
    case "active":
      return { bg: "var(--console-ok-soft)", fg: "var(--console-ok)" };
    case "paused":
      return { bg: "var(--console-warn-soft)", fg: "var(--console-warn)" };
    default:
      return { bg: "var(--console-panel-2)", fg: "var(--console-muted)" };
  }
}

export type Creative = {
  id: string;
  title: string;
  kind: CreativeKind;
  url: string | null;
  channels: MarketingChannel[];
  productSku: string | null;
  status: CreativeStatus;
  notes: string | null;
  createdAt: string;
};

export type AdSpendEntry = {
  id: string;
  channel: MarketingChannel;
  /** YYYY-MM, the founder's judgement of which month the spend belongs to. */
  month: string;
  campaign: string | null;
  amountUah: number;
  amountEur: number | null;
  /** Entered results. Null = not measured; 0 = measured and zero. */
  clicks: number | null;
  ordersAttributed: number | null;
  note: string | null;
};

/** Library order: what's in play first, the archive last, newest within. */
export function byCreativeRelevance(a: Creative, b: Creative): number {
  const rank: Record<CreativeStatus, number> = { active: 0, paused: 1, retired: 2 };
  const d = rank[a.status] - rank[b.status];
  if (d !== 0) return d;
  return b.createdAt.localeCompare(a.createdAt);
}

/** Per-channel totals for one month, biggest first, with the month's sum. */
export function spendTotals(
  entries: AdSpendEntry[],
  month: string
): { totalUah: number; byChannel: { channel: MarketingChannel; amountUah: number }[] } {
  const map = new Map<MarketingChannel, number>();
  let total = 0;
  for (const e of entries) {
    if (e.month !== month) continue;
    total += e.amountUah;
    map.set(e.channel, (map.get(e.channel) ?? 0) + e.amountUah);
  }
  return {
    totalUah: total,
    byChannel: [...map.entries()]
      .map(([channel, amountUah]) => ({ channel, amountUah }))
      .sort((a, b) => b.amountUah - a.amountUah),
  };
}
