import type { AdvisorRow, AdvisorStatus } from "@/lib/advisor-display";
import type {
  AdSpendEntry,
  Creative,
  CreativeKind,
  MarketingChannel,
} from "@/lib/marketing-display";
import type { ProductMonth } from "@/lib/finance-display";

/* ---------------------------------------------------------------------------
   The Marketing Strategist's judgement (plan §6.4). Pure and I/O-free, like
   every *-display module: lib/strategist-admin.ts gathers the inputs; this
   half decides what they mean, and its output is the JSON stored in
   agent_runs and rendered by /admin/strategist.

   EVERYTHING HERE IS A PLAN. The strategist spends nothing, posts nothing,
   pauses nothing: there is no ad-platform integration anywhere in the
   codebase, and the only table an agent run touches is agent_runs. Budget
   figures below are SUGGESTIONS for the founder to take to Meta's own
   interface — or to ignore.

   HONESTY RULES, in order of importance:
   1. Never push what cannot be sold: Critical and Low lines are excluded
      from every push list and flagged for avoidance (§6.4 — "do not
      advertise empty items heavily"). Overstock is pushed FIRST — that is
      money already sleeping on a shelf.
   2. Only entered results count. ordersPerKUah is computed from the
      founder's own ad_spend entries; null means "not measured" and is
      rendered as exactly that. No invented CTRs, no imagined ROAS.
   3. Unknown stays unknown. A product without costed margin shows "margin
      unknown", not an optimistic blank.

   Stored language-neutral like the brief: names, numbers, codes. The one
   exception is the copy drafts, which carry BOTH languages — copy is the
   deliverable itself, not a label to translate at render time.
--------------------------------------------------------------------------- */

/** With no spend history at all, suggest starting small. */
export const DEFAULT_BUDGET_UAH = 3000;

/** How many months back the strategist reads spend and results. */
export const TRAILING_MONTHS = 3;

/** Channels that take money. 'organic' and 'email' plan content, not budget. */
export const PAID_CHANNELS: MarketingChannel[] = [
  "meta",
  "instagram",
  "reddit",
  "tiktok",
  "google",
];

const PUSH_LIMIT = 5;
const AVOID_LIMIT = 8;
const REUSE_LIMIT = 10;
const COPY_LIMIT = 3;

/** A channel is pause material after this much measured spend with zero
    attributed orders. Below it, the honest verdict is "too early to say". */
const PAUSE_SPEND_FLOOR_UAH = 500;

export type ChannelPlan = {
  channel: MarketingChannel;
  /** Of the paid budget. 0 for organic — its cost is time, not money. */
  sharePct: number;
  budgetUah: number;
  /** Where the share came from: entered results, the default split, or the
      channel being unpaid by nature. */
  basis: "results" | "default" | "organic";
  /** Attributed orders per ₴1000 of trailing spend. Null = not measured. */
  ordersPerKUah: number | null;
  trailingSpendUah: number;
  /** What to feature there — the push list's skus, most urgent first. */
  focusSkus: string[];
};

export type PushItem = {
  sku: string;
  nameEn: string;
  nameUk: string;
  status: Extract<AdvisorStatus, "ok" | "overstock">;
  reason: "overstock" | "seller" | "steady";
  units30: number;
  /** Last full month's revenue − COGS for the sku. Null = not costed. */
  grossMarginUah: number | null;
  hasCreative: boolean;
};

export type AvoidItem = {
  sku: string;
  nameEn: string;
  nameUk: string;
  status: Extract<AdvisorStatus, "critical" | "low">;
};

export type ReuseItem = {
  id: string;
  title: string;
  kind: CreativeKind;
  channels: MarketingChannel[];
  productSku: string | null;
};

export type PauseSuggestion =
  | {
      type: "creative_stock";
      id: string;
      title: string;
      sku: string;
      stockStatus: Extract<AdvisorStatus, "critical" | "low">;
    }
  | {
      type: "channel_no_results";
      channel: MarketingChannel;
      /** Trailing months in which results were measured for the channel. */
      monthsMeasured: number;
      spentUah: number;
    };

export type CopyDraft = {
  sku: string;
  nameEn: string;
  nameUk: string;
  en: { headline: string; body: string };
  uk: { headline: string; body: string };
};

export type PlanNote = "no_spend_history" | "no_results_entered" | "margins_unknown";

export type CampaignPlan = {
  /** The month being planned — always the month after generation. */
  planMonth: string;
  /** Kyiv date the plan was generated. */
  generatedOn: string;

  totalBudgetUah: number;
  budgetBasis: "trailing_spend" | "default";
  /** The months whose spend informed the total, oldest last. */
  trailingMonths: string[];

  channels: ChannelPlan[];
  push: PushItem[];
  avoid: AvoidItem[];
  reuse: ReuseItem[];
  pause: PauseSuggestion[];
  missingCreatives: { sku: string; nameEn: string; nameUk: string }[];
  copy: CopyDraft[];
  notes: PlanNote[];
};

/** "2026-07" → "2026-08". Pure calendar arithmetic, no Date timezone traps. */
export function monthAfter(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

export function monthBefore(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

/** The n months before `ym`, newest first: ("2026-08", 3) → 07, 06, 05. */
export function trailingMonthsOf(ym: string, n: number): string[] {
  const out: string[] = [];
  let cur = ym;
  for (let i = 0; i < n; i++) {
    cur = monthBefore(cur);
    out.push(cur);
  }
  return out;
}

/** Product taglines from the catalogue, passed in so this stays pure. */
export type ProductVoice = { id: string; taglineEn: string; taglineUk: string };

export function buildCampaignPlan(input: {
  planMonth: string;
  generatedOn: string;
  advisorRows: AdvisorRow[];
  /** finance_products_monthly rows for the last FULL month. */
  productMonths: ProductMonth[];
  spend: AdSpendEntry[];
  creatives: Creative[];
  voices: ProductVoice[];
}): CampaignPlan {
  const notes: PlanNote[] = [];
  const trailing = trailingMonthsOf(input.planMonth, TRAILING_MONTHS);

  // --- What the shelf allows --------------------------------------------
  const productRows = input.advisorRows.filter((r) => r.kind === "product");

  const marginBySku = new Map<string, number | null>();
  for (const pm of input.productMonths) {
    const margin =
      pm.revenueUah !== null && pm.cogsUah !== null ? pm.revenueUah - pm.cogsUah : null;
    marginBySku.set(pm.sku, margin);
  }

  const activeCreatives = input.creatives.filter((c) => c.status === "active");
  const hasActiveCreative = (sku: string) =>
    activeCreatives.some((c) => c.productSku === sku);

  const pushable = productRows.filter((r) => r.status === "ok" || r.status === "overstock");
  const push: PushItem[] = pushable
    .map((r) => ({
      sku: r.sku,
      nameEn: r.nameEn,
      nameUk: r.nameUk,
      status: r.status as PushItem["status"],
      reason: (r.status === "overstock"
        ? "overstock"
        : r.units30 > 0
          ? "seller"
          : "steady") as PushItem["reason"],
      units30: r.units30,
      grossMarginUah: marginBySku.get(r.sku) ?? null,
      hasCreative: hasActiveCreative(r.sku),
    }))
    .sort((a, b) => {
      // Overstock first — the shelf is already paid for. Then whatever sells.
      if ((a.reason === "overstock") !== (b.reason === "overstock")) {
        return a.reason === "overstock" ? -1 : 1;
      }
      if (a.units30 !== b.units30) return b.units30 - a.units30;
      return a.sku.localeCompare(b.sku);
    })
    .slice(0, PUSH_LIMIT);

  if (push.length > 0 && push.every((p) => p.grossMarginUah === null)) {
    notes.push("margins_unknown");
  }

  const avoid: AvoidItem[] = productRows
    .filter((r) => r.status === "critical" || r.status === "low")
    .map((r) => ({
      sku: r.sku,
      nameEn: r.nameEn,
      nameUk: r.nameUk,
      status: r.status as AvoidItem["status"],
    }))
    .sort((a, b) => (a.status === b.status ? a.sku.localeCompare(b.sku) : a.status === "critical" ? -1 : 1))
    .slice(0, AVOID_LIMIT);

  // --- What the money said ----------------------------------------------
  const trailingSpend = input.spend.filter((s) => trailing.includes(s.month));

  type ChannelFacts = {
    spentUah: number;
    orders: number;
    monthsMeasured: Set<string>;
  };
  const facts = new Map<MarketingChannel, ChannelFacts>();
  for (const s of trailingSpend) {
    const f = facts.get(s.channel) ?? { spentUah: 0, orders: 0, monthsMeasured: new Set() };
    f.spentUah += s.amountUah;
    if (s.ordersAttributed !== null) {
      f.orders += s.ordersAttributed;
      f.monthsMeasured.add(s.month);
    }
    facts.set(s.channel, f);
  }

  const monthTotals = new Map<string, number>();
  for (const s of trailingSpend) {
    monthTotals.set(s.month, (monthTotals.get(s.month) ?? 0) + s.amountUah);
  }

  // --- The total: what was actually being spent, averaged ----------------
  let totalBudgetUah = DEFAULT_BUDGET_UAH;
  let budgetBasis: CampaignPlan["budgetBasis"] = "default";
  if (monthTotals.size > 0) {
    const sum = [...monthTotals.values()].reduce((a, b) => a + b, 0);
    totalBudgetUah = Math.max(100, Math.round(sum / monthTotals.size / 100) * 100);
    budgetBasis = "trailing_spend";
  } else {
    notes.push("no_spend_history");
  }

  // --- The split ----------------------------------------------------------
  // Candidates: every paid channel that was spent on, plus the plan's two
  // named lanes (§6.4) so a cold start still has an outline to follow.
  const candidates = PAID_CHANNELS.filter(
    (c) => c === "meta" || c === "reddit" || (facts.get(c)?.spentUah ?? 0) > 0
  );

  // A measured channel that swallowed real money and returned nothing is
  // pause material, not a budget line.
  const pause: PauseSuggestion[] = [];
  const deadChannels = new Set<MarketingChannel>();
  for (const c of candidates) {
    const f = facts.get(c);
    if (f && f.monthsMeasured.size >= 2 && f.orders === 0 && f.spentUah >= PAUSE_SPEND_FLOOR_UAH) {
      deadChannels.add(c);
      pause.push({
        type: "channel_no_results",
        channel: c,
        monthsMeasured: f.monthsMeasured.size,
        spentUah: f.spentUah,
      });
    }
  }
  const live = candidates.filter((c) => !deadChannels.has(c));

  const opk = (c: MarketingChannel): number | null => {
    const f = facts.get(c);
    if (!f || f.monthsMeasured.size === 0 || f.spentUah <= 0) return null;
    return Math.round((f.orders / (f.spentUah / 1000)) * 100) / 100;
  };

  const measured = live.filter((c) => opk(c) !== null && (opk(c) as number) > 0);
  const shares = new Map<MarketingChannel, number>();

  if (measured.length > 0) {
    // Weight by what the founder's own numbers say worked; channels without
    // results get half the average measured weight — worth probing, not
    // worth betting on.
    const weights = new Map<MarketingChannel, number>();
    let measuredSum = 0;
    for (const c of measured) {
      const w = opk(c) as number;
      weights.set(c, w);
      measuredSum += w;
    }
    const probeWeight = (measuredSum / measured.length) / 2;
    for (const c of live) if (!weights.has(c)) weights.set(c, probeWeight);

    const total = [...weights.values()].reduce((a, b) => a + b, 0);
    for (const [c, w] of weights) shares.set(c, Math.round((w / total) * 20) * 5);
  } else {
    if (trailingSpend.length > 0) notes.push("no_results_entered");
    // The plan's own default lanes: Meta carries, Reddit probes, anything
    // else already being spent on splits the rest.
    const others = live.filter((c) => c !== "meta" && c !== "reddit");
    if (live.includes("meta")) shares.set("meta", others.length > 0 ? 55 : 70);
    if (live.includes("reddit")) shares.set("reddit", others.length > 0 ? 20 : 30);
    for (const c of others) shares.set(c, Math.floor(25 / others.length / 5) * 5);
  }

  // Rounding drift lands on the biggest share, so the split always says 100.
  const sharedSum = [...shares.values()].reduce((a, b) => a + b, 0);
  if (shares.size > 0 && sharedSum !== 100) {
    const biggest = [...shares.entries()].sort((a, b) => b[1] - a[1])[0][0];
    shares.set(biggest, (shares.get(biggest) ?? 0) + (100 - sharedSum));
  }

  const focusSkus = push.map((p) => p.sku).slice(0, 3);
  const channels: ChannelPlan[] = [...shares.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([channel, sharePct]) => ({
      channel,
      sharePct,
      budgetUah: Math.round((totalBudgetUah * sharePct) / 100 / 50) * 50,
      basis: (measured.some((m) => m === channel) ? "results" : "default") as ChannelPlan["basis"],
      ordersPerKUah: opk(channel),
      trailingSpendUah: Math.round(facts.get(channel)?.spentUah ?? 0),
      focusSkus,
    }));

  // Organic is always on the outline: it costs hours, not hryvnias.
  channels.push({
    channel: "organic",
    sharePct: 0,
    budgetUah: 0,
    basis: "organic",
    ordersPerKUah: null,
    trailingSpendUah: Math.round(facts.get("organic")?.spentUah ?? 0),
    focusSkus,
  });

  // --- The library --------------------------------------------------------
  const pushSkus = new Set(push.map((p) => p.sku));
  const reuse: ReuseItem[] = activeCreatives
    .filter((c) => c.productSku === null || pushSkus.has(c.productSku))
    .slice(0, REUSE_LIMIT)
    .map((c) => ({
      id: c.id,
      title: c.title,
      kind: c.kind,
      channels: c.channels,
      productSku: c.productSku,
    }));

  const stockStatusBySku = new Map(productRows.map((r) => [r.sku, r.status]));
  for (const c of activeCreatives) {
    if (c.productSku === null) continue;
    const st = stockStatusBySku.get(c.productSku);
    if (st === "critical" || st === "low") {
      pause.push({
        type: "creative_stock",
        id: c.id,
        title: c.title,
        sku: c.productSku,
        stockStatus: st,
      });
    }
  }

  const missingCreatives = push
    .filter((p) => !p.hasCreative)
    .map((p) => ({ sku: p.sku, nameEn: p.nameEn, nameUk: p.nameUk }));

  // --- Words to start from ------------------------------------------------
  // Drafts, not campaigns: the founder edits and places them. Built only
  // from the catalogue's own taglines and the true fact of availability —
  // no discounts, no urgency theatre, nothing the shop didn't say itself.
  const voiceById = new Map(input.voices.map((v) => [v.id, v]));
  const copy: CopyDraft[] = push.slice(0, COPY_LIMIT).map((p) => {
    const voice = voiceById.get(p.sku.split("__")[0]);
    const en = [voice?.taglineEn, "In stock and shipping now — tactical-hb.com."]
      .filter(Boolean)
      .join(" ");
    const uk = [voice?.taglineUk, "Є в наявності, відправляємо вже — tactical-hb.com."]
      .filter(Boolean)
      .join(" ");
    return {
      sku: p.sku,
      nameEn: p.nameEn,
      nameUk: p.nameUk,
      en: { headline: p.nameEn, body: en },
      uk: { headline: p.nameUk, body: uk },
    };
  });

  return {
    planMonth: input.planMonth,
    generatedOn: input.generatedOn,
    totalBudgetUah,
    budgetBasis,
    trailingMonths: trailing,
    channels,
    push,
    avoid,
    reuse,
    pause,
    missingCreatives,
    copy,
    notes,
  };
}

/**
 * Is this stored agent_runs.output a plan this code can render? Old runs
 * outlive rewrites; an unreadable one renders as "generated by an earlier
 * version", never as a crash.
 */
export function isCampaignPlan(v: unknown): v is CampaignPlan {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.planMonth === "string" &&
    typeof o.totalBudgetUah === "number" &&
    Array.isArray(o.channels) &&
    Array.isArray(o.push) &&
    Array.isArray(o.avoid) &&
    Array.isArray(o.copy)
  );
}

export function pushReasonLabel(r: PushItem["reason"], uk: boolean): string {
  const labels: Record<PushItem["reason"], [en: string, uk: string]> = {
    overstock: ["overstock — move it", "надлишок — розпродати"],
    seller: ["selling now", "продається зараз"],
    steady: ["in stock, quiet", "є на складі, тихий"],
  };
  return labels[r][uk ? 1 : 0];
}

export function channelBasisLabel(b: ChannelPlan["basis"], uk: boolean): string {
  const labels: Record<ChannelPlan["basis"], [en: string, uk: string]> = {
    results: ["from entered results", "за введеними результатами"],
    default: ["starting split", "стартовий розподіл"],
    organic: ["no budget — time", "без бюджету — час"],
  };
  return labels[b][uk ? 1 : 0];
}

export function planNoteLabel(n: PlanNote, uk: boolean): string {
  const labels: Record<PlanNote, [en: string, uk: string]> = {
    no_spend_history: [
      "No spend history in the trailing months — the total is a starting point, not a forecast.",
      "Немає історії витрат за останні місяці — сума лише відправна точка, не прогноз.",
    ],
    no_results_entered: [
      "Spend exists but no results were entered — add clicks/orders in Marketing to sharpen the split.",
      "Витрати є, але результати не введено — додайте кліки/замовлення в Маркетингу, і розподіл стане точнішим.",
    ],
    margins_unknown: [
      "No pushed product has a costed margin — enter unit costs so profit can steer the plan.",
      "Жоден із товарів не має порахованої маржі — введіть собівартість, щоб план зважав на прибуток.",
    ],
  };
  return labels[n][uk ? 1 : 0];
}
