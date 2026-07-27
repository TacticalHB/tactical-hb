import type { ChannelMonth, FinanceMonth, ProductMonth } from "@/lib/finance-display";

/* ---------------------------------------------------------------------------
   The Cost & Margin Guard (plan §6.2). Pure and I/O-free: lib/margin-admin.ts
   gathers the rows, this half decides what they mean, and the result is stored
   language-neutral in agent_runs so one run reads in both languages.

   WHAT IT MAY DO: describe. §6.2 is explicit — "does not change prices
   automatically; flags issues for human decision". There is no price in this
   file, no write behind it, and no threshold here that could move one. The
   worst it can do is be wrong on a page.

   WHAT IT REFUSES TO DO: report a margin it cannot stand behind. Every figure
   derived from a partial cost is carried as null and counted in uncostedLines,
   because a margin computed over a silent zero is flattery — the same rule
   0018 wrote into the views this reads.

   THRESHOLDS ARE JUDGEMENT, NOT PHYSICS. The four constants below are the
   whole opinion of this agent, and each is one line to change.
--------------------------------------------------------------------------- */

/** Below this gross %, a product is thin enough to look at. */
const THIN_PCT = 25;
/** At or above this, it is genuinely healthy. */
const STRONG_PCT = 50;
/** A fall of this many percentage points against the trailing average is a collapse. */
const COLLAPSE_POINTS = 10;
/** …but only when enough sold that the number means something. */
const COLLAPSE_MIN_UNITS = 3;
/** How many prior months the trailing average is taken over. */
export const TRAILING_MONTHS = 3;

export type MarginVerdict = "negative" | "thin" | "ok" | "strong" | "unknown";

export function verdictFromPct(pct: number | null): MarginVerdict {
  if (pct === null) return "unknown";
  if (pct < 0) return "negative";
  if (pct < THIN_PCT) return "thin";
  if (pct < STRONG_PCT) return "ok";
  return "strong";
}

export function marginVerdictLabel(v: MarginVerdict, uk: boolean): string {
  const labels: Record<MarginVerdict, [en: string, uk: string]> = {
    negative: ["Below cost", "Нижче собівартості"],
    thin: ["Thin", "Тонка"],
    ok: ["OK", "Норма"],
    strong: ["Strong", "Сильна"],
    unknown: ["Unknown", "Невідомо"],
  };
  return labels[v][uk ? 1 : 0];
}

export function marginVerdictTone(v: MarginVerdict): { bg: string; fg: string } {
  switch (v) {
    case "strong":
      return { bg: "var(--console-ok-soft)", fg: "var(--console-ok)" };
    case "ok":
      return { bg: "var(--console-panel-2)", fg: "var(--console-muted)" };
    case "thin":
      return { bg: "var(--console-warn-soft)", fg: "var(--console-warn)" };
    case "negative":
      return { bg: "var(--console-alert-soft)", fg: "var(--console-alert)" };
    default:
      return { bg: "var(--console-panel-2)", fg: "var(--console-faint)" };
  }
}

/* ---------------------------------------------------------------------------
   The stored shape.
--------------------------------------------------------------------------- */

export type ProductMargin = {
  sku: string;
  nameEn: string;
  nameUk: string;
  units: number;
  revenueUah: number | null;
  cogsUah: number | null;
  grossUah: number | null;
  grossPct: number | null;
  uncostedLines: number;
  verdict: MarginVerdict;
  /** Mean gross % over the trailing months that had a figure. */
  trailingPct: number | null;
  /** trailingPct − grossPct, positive when this month is worse. */
  dropPoints: number | null;
};

export type ChannelMargin = {
  channel: "retail" | "wholesale";
  ordersCount: number;
  units: number;
  revenueUah: number | null;
  shippingChargedUah: number;
  cogsUah: number | null;
  /** revenue + shipping − cogs. GROSS: opex is not attributable to a channel. */
  grossUah: number | null;
  grossPct: number | null;
  uncostedLines: number;
  verdict: MarginVerdict;
};

export type MarginAlert =
  | { type: "below_cost"; sku: string; nameEn: string; nameUk: string; grossUah: number; grossPct: number }
  | { type: "thin"; sku: string; nameEn: string; nameUk: string; grossPct: number; units: number }
  | {
      type: "collapse";
      sku: string;
      nameEn: string;
      nameUk: string;
      grossPct: number;
      trailingPct: number;
      dropPoints: number;
      units: number;
    }
  | { type: "channel_below_cost"; channel: "retail" | "wholesale"; grossUah: number }
  | { type: "month_loss"; marginUah: number }
  | { type: "ads_exceed_gross"; adSpendUah: number; grossUah: number };

/** Things that make the report less than complete. Rendered as caveats,
    never as failures — an incomplete answer is still worth reading. */
export type MarginNote =
  | "no_month_data"
  | "no_costs_at_all"
  | "some_uncosted"
  | "no_fees_logged"
  | "no_wholesale"
  | "short_history"
  | "unpriced_orders";

export function marginNoteLabel(n: MarginNote, uk: boolean): string {
  const labels: Record<MarginNote, [en: string, uk: string]> = {
    no_month_data: [
      "There were no orders and no costs in this month at all, so there is nothing to judge — an empty report, not a clean bill of health.",
      "Цього місяця не було ані замовлень, ані витрат — оцінювати нічого. Це порожній звіт, а не підтвердження, що все гаразд.",
    ],
    no_costs_at_all: [
      "No unit costs are entered, so no margin here is real yet. Enter them in Costs, dated on or before the orders.",
      "Собівартість не внесена — жодна маржа тут поки не справжня. Внесіть її у «Витрати» з датою не пізнішою за замовлення.",
    ],
    some_uncosted: [
      "Some lines have no unit cost. Their revenue is counted; their cost is not, so those products look better than they are.",
      "Для частини позицій немає собівартості. Їхній дохід враховано, а витрати — ні, тож вони виглядають краще, ніж є.",
    ],
    no_fees_logged: [
      "No payment fees are logged for this month, so every margin here is gross of acquiring. Enter the Monobank invoice in Costs under Fees.",
      "Комісії за цей місяць не внесені, тож уся маржа тут — без еквайрингу. Внесіть рахунок Monobank у «Витрати», категорія «Комісії».",
    ],
    no_wholesale: [
      "No wholesale orders this month — the channel split is retail only.",
      "Цього місяця оптових замовлень не було — поділ за каналами лише роздріб.",
    ],
    short_history: [
      "Not enough history for a trailing average yet, so collapses cannot be detected — only levels.",
      "Історії ще замало для середнього — обвали поки не виявляються, лише рівні.",
    ],
    unpriced_orders: [
      "Some orders have no UAH amount and are counted but not summed.",
      "Деякі замовлення не мають суми в гривні — їх пораховано, але не додано.",
    ],
  };
  return labels[n][uk ? 1 : 0];
}

export type MarginReport = {
  /** The month reported on — the last FULL month, never the running one. */
  month: string;
  generatedOn: string;
  products: ProductMargin[];
  channels: ChannelMargin[];
  totals: {
    revenueUah: number | null;
    shippingChargedUah: number;
    cogsUah: number | null;
    opexUah: number | null;
    marginUah: number;
    feesUah: number | null;
    adSpendUah: number | null;
    uncostedLines: number;
    unpricedOrders: number;
  };
  alerts: MarginAlert[];
  notes: MarginNote[];
};

/** The stored-run guard: an older run must not crash a newer page. */
export function isMarginReport(v: unknown): v is MarginReport {
  if (typeof v !== "object" || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.month === "string" &&
    typeof r.generatedOn === "string" &&
    Array.isArray(r.products) &&
    Array.isArray(r.channels) &&
    Array.isArray(r.alerts) &&
    Array.isArray(r.notes) &&
    typeof r.totals === "object" &&
    r.totals !== null
  );
}

/* ---------------------------------------------------------------------------
   The arithmetic.
--------------------------------------------------------------------------- */

/** Gross margin as a percentage of revenue. Null in, null out — and null when
    revenue is zero, because a percentage of nothing is not zero, it is
    meaningless. */
export function grossPct(grossUah: number | null, revenueUah: number | null): number | null {
  if (grossUah === null || revenueUah === null || revenueUah === 0) return null;
  return Math.round((grossUah / revenueUah) * 1000) / 10;
}

/** The month before this one. '2026-01' → '2025-12'. */
export function monthBefore(month: string): string {
  const y = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

export function buildMarginReport(input: {
  month: string;
  generatedOn: string;
  /** The reported month's per-sku rows. */
  products: ProductMonth[];
  /** Prior months, newest first, for the trailing average. */
  trailing: ProductMonth[][];
  channels: ChannelMonth[];
  monthTotals: FinanceMonth | null;
  feesUah: number | null;
  adSpendUah: number | null;
  /** sku → bilingual name, from stock_items. Falls back to the snapshot. */
  names: Record<string, { en: string; uk: string }>;
}): MarginReport {
  const { month, generatedOn, products, trailing, channels, monthTotals, names } = input;

  /* --- trailing gross % per sku, over the months that could say --- */
  const trailingPctBySku = new Map<string, number>();
  {
    const sums = new Map<string, { total: number; n: number }>();
    for (const monthRows of trailing) {
      for (const p of monthRows) {
        const pct = grossPct(
          p.revenueUah !== null && p.cogsUah !== null ? p.revenueUah - p.cogsUah : null,
          p.revenueUah
        );
        // Only months whose costs were fully known may shape the baseline —
        // otherwise the average is a mix of true and flattering figures.
        if (pct === null || p.uncostedLines > 0) continue;
        const acc = sums.get(p.sku) ?? { total: 0, n: 0 };
        acc.total += pct;
        acc.n += 1;
        sums.set(p.sku, acc);
      }
    }
    for (const [sku, acc] of sums) {
      trailingPctBySku.set(sku, Math.round((acc.total / acc.n) * 10) / 10);
    }
  }

  const productMargins: ProductMargin[] = products.map((p) => {
    const gross = p.revenueUah !== null && p.cogsUah !== null ? p.revenueUah - p.cogsUah : null;
    const pct = grossPct(gross, p.revenueUah);
    const trailingPct = trailingPctBySku.get(p.sku) ?? null;
    const name = names[p.sku];
    return {
      sku: p.sku,
      nameEn: name?.en ?? p.productName,
      nameUk: name?.uk ?? p.productName,
      units: p.units,
      revenueUah: p.revenueUah,
      cogsUah: p.cogsUah,
      grossUah: gross,
      grossPct: pct,
      uncostedLines: p.uncostedLines,
      // A product with uncosted lines has no honest verdict, whatever the
      // arithmetic produced from the lines that were costed.
      verdict: p.uncostedLines > 0 ? "unknown" : verdictFromPct(pct),
      trailingPct,
      dropPoints:
        pct !== null && trailingPct !== null ? Math.round((trailingPct - pct) * 10) / 10 : null,
    };
  });

  productMargins.sort((a, b) => (b.revenueUah ?? 0) - (a.revenueUah ?? 0));

  const channelMargins: ChannelMargin[] = channels.map((c) => {
    const gross =
      c.revenueUah !== null && c.cogsUah !== null
        ? c.revenueUah + c.shippingChargedUah - c.cogsUah
        : null;
    const base = c.revenueUah === null ? null : c.revenueUah + c.shippingChargedUah;
    const pct = grossPct(gross, base);
    return {
      channel: c.channel,
      ordersCount: c.ordersCount,
      units: c.units,
      revenueUah: c.revenueUah,
      shippingChargedUah: c.shippingChargedUah,
      cogsUah: c.cogsUah,
      grossUah: gross,
      grossPct: pct,
      uncostedLines: c.uncostedLines,
      verdict: c.uncostedLines > 0 ? "unknown" : verdictFromPct(pct),
    };
  });

  /* --- alerts, worst first --- */
  const alerts: MarginAlert[] = [];

  for (const p of productMargins) {
    if (p.uncostedLines > 0) continue; // nothing here is known well enough to alarm about
    if (p.grossUah !== null && p.grossPct !== null && p.grossUah < 0) {
      alerts.push({
        type: "below_cost",
        sku: p.sku,
        nameEn: p.nameEn,
        nameUk: p.nameUk,
        grossUah: p.grossUah,
        grossPct: p.grossPct,
      });
      // Selling below cost is the whole story — a "thin" or "collapsed"
      // line underneath it would only dilute the one that matters.
      continue;
    }
    if (
      p.grossPct !== null &&
      p.trailingPct !== null &&
      p.dropPoints !== null &&
      p.dropPoints >= COLLAPSE_POINTS &&
      p.units >= COLLAPSE_MIN_UNITS
    ) {
      alerts.push({
        type: "collapse",
        sku: p.sku,
        nameEn: p.nameEn,
        nameUk: p.nameUk,
        grossPct: p.grossPct,
        trailingPct: p.trailingPct,
        dropPoints: p.dropPoints,
        units: p.units,
      });
    }
    if (p.grossPct !== null && p.grossPct >= 0 && p.grossPct < THIN_PCT) {
      alerts.push({
        type: "thin",
        sku: p.sku,
        nameEn: p.nameEn,
        nameUk: p.nameUk,
        grossPct: p.grossPct,
        units: p.units,
      });
    }
  }

  for (const c of channelMargins) {
    if (c.uncostedLines === 0 && c.grossUah !== null && c.grossUah < 0) {
      alerts.push({ type: "channel_below_cost", channel: c.channel, grossUah: c.grossUah });
    }
  }

  if (monthTotals !== null && monthTotals.marginUah < 0) {
    alerts.push({ type: "month_loss", marginUah: monthTotals.marginUah });
  }

  const totalGross = channelMargins.reduce(
    (a, c) => (c.grossUah === null ? a : a + c.grossUah),
    0
  );
  if (input.adSpendUah !== null && input.adSpendUah > 0 && totalGross > 0 && input.adSpendUah > totalGross) {
    alerts.push({ type: "ads_exceed_gross", adSpendUah: input.adSpendUah, grossUah: totalGross });
  }

  const rank: Record<MarginAlert["type"], number> = {
    below_cost: 0,
    channel_below_cost: 1,
    month_loss: 2,
    collapse: 3,
    ads_exceed_gross: 4,
    thin: 5,
  };
  alerts.sort((a, b) => rank[a.type] - rank[b.type]);

  /* --- caveats --- */
  const notes: MarginNote[] = [];
  const uncostedLines = products.reduce((a, p) => a + p.uncostedLines, 0);
  const costedAny = products.some((p) => p.cogsUah !== null);

  // A month with nothing in it gets ONE note and no others. "No fees logged"
  // and "no wholesale orders" are true of an empty month and useless about it,
  // and a stack of caveats would read as a list of problems where the only
  // fact is that the month is empty — which an empty alerts panel would
  // otherwise let pass as a clean bill of health.
  const emptyMonth = monthTotals === null && products.length === 0;

  if (emptyMonth) {
    notes.push("no_month_data");
  } else {
    if (products.length > 0 && !costedAny) notes.push("no_costs_at_all");
    else if (uncostedLines > 0) notes.push("some_uncosted");
    if (input.feesUah === null || input.feesUah === 0) notes.push("no_fees_logged");
    if (!channelMargins.some((c) => c.channel === "wholesale")) notes.push("no_wholesale");
    if (trailingPctBySku.size === 0) notes.push("short_history");
    if ((monthTotals?.unpricedOrders ?? 0) > 0) notes.push("unpriced_orders");
  }

  return {
    month,
    generatedOn,
    products: productMargins,
    channels: channelMargins,
    totals: {
      revenueUah: monthTotals?.revenueUah ?? null,
      shippingChargedUah: monthTotals?.shippingChargedUah ?? 0,
      cogsUah: monthTotals?.cogsUah ?? null,
      opexUah: monthTotals?.opexUah ?? null,
      marginUah: monthTotals?.marginUah ?? 0,
      feesUah: input.feesUah,
      adSpendUah: input.adSpendUah,
      uncostedLines,
      unpricedOrders: monthTotals?.unpricedOrders ?? 0,
    },
    alerts,
    notes,
  };
}

/** Named for the SALES channel, not the marketing one — marketing-display
    already exports a channelLabel for Meta/Reddit/organic, and a page that
    showed both would import two functions with one name. */
export function salesChannelLabel(c: "retail" | "wholesale", uk: boolean): string {
  if (c === "retail") return uk ? "Роздріб" : "Retail";
  return uk ? "Опт" : "Wholesale";
}

/**
 * One alert, in words.
 *
 * Lives here rather than in the margin page because the Weekly Brief carries
 * the same alerts, and two renderings of one alert are two chances to word
 * the same fact differently — which is how a founder ends up believing the
 * page and the email disagree.
 */
export function marginAlertText(a: MarginAlert, uk: boolean): string {
  const money = (n: number) => `₴${Math.round(n).toLocaleString("uk-UA")}`;
  const pct = (n: number) => `${n.toFixed(1)}%`;

  switch (a.type) {
    case "below_cost":
      return uk
        ? `${a.nameUk} продається нижче собівартості — ${money(a.grossUah)} (${pct(a.grossPct)}).`
        : `${a.nameEn} is selling below cost — ${money(a.grossUah)} (${pct(a.grossPct)}).`;
    case "thin":
      return uk
        ? `${a.nameUk}: маржа ${pct(a.grossPct)} на ${a.units} шт.`
        : `${a.nameEn}: ${pct(a.grossPct)} margin on ${a.units} units.`;
    case "collapse":
      return uk
        ? `${a.nameUk}: маржа впала з ${pct(a.trailingPct)} до ${pct(a.grossPct)} — на ${a.dropPoints} п., ${a.units} шт.`
        : `${a.nameEn}: margin fell from ${pct(a.trailingPct)} to ${pct(a.grossPct)} — ${a.dropPoints} points, on ${a.units} units.`;
    case "channel_below_cost":
      return uk
        ? `Канал «${salesChannelLabel(a.channel, uk)}» у мінусі: ${money(a.grossUah)}.`
        : `${salesChannelLabel(a.channel, uk)} is under water: ${money(a.grossUah)}.`;
    case "month_loss":
      return uk
        ? `Місяць закрито зі збитком ${money(a.marginUah)} після всіх витрат.`
        : `The month closed at a loss of ${money(a.marginUah)} after all costs.`;
    case "ads_exceed_gross":
      return uk
        ? `Реклама (${money(a.adSpendUah)}) перевищує валову маржу (${money(a.grossUah)}).`
        : `Ad spend (${money(a.adSpendUah)}) exceeds gross margin (${money(a.grossUah)}).`;
  }
}

/** Alerts that mean money is actually being lost, not merely thin. */
export function isCriticalAlert(a: MarginAlert): boolean {
  return a.type === "below_cost" || a.type === "channel_below_cost" || a.type === "month_loss";
}
