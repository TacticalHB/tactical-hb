import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_EMAIL } from "@/lib/contact-info";
import { esc, sendMail } from "@/lib/email";
import { fetchAdvisorRows, kyivDate } from "@/lib/advisor-admin";
import { fetchFinanceMonths } from "@/lib/finance-admin";
import { fetchPartners } from "@/lib/partners-admin";
import { followUpDue } from "@/lib/partners-display";
import { quietPartners, type FollowUpCandidate } from "@/lib/followup-display";
import { logAgentRun, type AgentTrigger } from "@/lib/agent-runs";
import { briefUah, weekDelta, type BriefData } from "@/lib/brief-display";
import type { AdvisorRow } from "@/lib/advisor-display";

/* ---------------------------------------------------------------------------
   The Weekly Commander Brief — the plan's one-page situation report (§6.5),
   built by reading what the other modules already know: orders for the week's
   money, finance_monthly for the month, the Stock Advisor for the shelf, the
   Follow-up Agent for who has gone quiet.

   ALL OR NOTHING. A brief whose stock section silently failed would read as
   "stock is fine", which is the one thing a failed read must never say. If
   any core input is unreadable the build returns null and the caller reports
   that, honestly, instead of a half-true page.

   SUMMARY ONLY (§6.5): building a brief changes no record. The run is logged
   to agent_runs, and the Monday cron mails the result to the shop's own
   address — internal mail, the same channel and the same justification as
   the low-stock alert. No customer or partner is ever contacted from here.
--------------------------------------------------------------------------- */

/** The same allowlist the finance views count (0018). */
const COUNTABLE = ["paid", "processing", "shipped", "delivered"];

/** How many lines each brief list carries — a briefing, not a ledger. */
const TOP_PRODUCTS = 5;
const MAX_SUGGESTIONS = 8;
const MAX_QUIET = 8;

export type BriefBuild = {
  brief: BriefData;
  /** The full advisor table, for the stock_advisor audit row. */
  advisorRows: AdvisorRow[];
  /** The full quiet list, for the wholesale_followup audit row. */
  quiet: FollowUpCandidate[];
};

export async function buildBrief(): Promise<BriefBuild | null> {
  try {
    const admin = createAdminClient();

    const today = kyivDate(0);
    const weekFrom = kyivDate(6); // trailing 7 Kyiv days, inclusive
    const prevFrom = kyivDate(13);

    // 15 UTC days reaches every order the 14 Kyiv days could contain.
    const sinceUtc = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();

    const [ordersRes, advisorRows, months, partnersRead, linesRes] = await Promise.all([
      admin
        .from("orders")
        .select("created_at, amount_uah, status")
        .in("status", COUNTABLE)
        .gte("created_at", sinceUtc),
      fetchAdvisorRows(),
      fetchFinanceMonths(3),
      fetchPartners(),
      admin
        .from("order_line_finance")
        .select("sku, product_name, qty, line_revenue_uah, ordered_on")
        .gte("ordered_on", weekFrom),
    ]);

    if (ordersRes.error || advisorRows === null || months === null || partnersRead === null || linesRes.error) {
      if (ordersRes.error) console.error("[brief] orders read failed:", ordersRes.error.message);
      if (linesRes.error) console.error("[brief] lines read failed:", linesRes.error.message);
      console.error("[brief] a core input was unreadable — not building a half-true brief");
      return null;
    }

    // --- The week's money, on the founder's clock -------------------------
    const toKyiv = (iso: string) =>
      new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Kyiv" }).format(new Date(iso));

    const week = { revenueUah: 0, orders: 0, unpriced: 0 };
    const prev = { revenueUah: 0, orders: 0 };
    for (const r of ordersRes.data ?? []) {
      const day = toKyiv(String(r.created_at));
      const amount = r.amount_uah === null ? null : Number(r.amount_uah);
      if (day >= weekFrom && day <= today) {
        week.orders += 1;
        if (amount === null) week.unpriced += 1;
        else week.revenueUah += amount;
      } else if (day >= prevFrom && day < weekFrom) {
        prev.orders += 1;
        if (amount !== null) prev.revenueUah += amount;
      }
    }

    // --- Best sellers of the week ----------------------------------------
    const bySku = new Map<string, { name: string; units: number; revenue: number; priced: boolean }>();
    for (const r of linesRes.data ?? []) {
      const sku = String(r.sku);
      const entry = bySku.get(sku) ?? { name: String(r.product_name ?? sku), units: 0, revenue: 0, priced: false };
      entry.units += Number(r.qty) || 0;
      if (r.line_revenue_uah !== null) {
        entry.revenue += Number(r.line_revenue_uah);
        entry.priced = true;
      }
      bySku.set(sku, entry);
    }
    const topProducts = [...bySku.entries()]
      .map(([sku, e]) => ({
        sku,
        name: e.name,
        units: e.units,
        revenueUah: e.priced ? e.revenue : null,
      }))
      .sort((a, b) => (b.revenueUah ?? 0) - (a.revenueUah ?? 0))
      .slice(0, TOP_PRODUCTS);

    // --- The shelf, as the advisor sees it --------------------------------
    const line = (r: AdvisorRow) => ({ sku: r.sku, nameEn: r.nameEn, nameUk: r.nameUk, onHand: r.onHand });
    const suggestions = advisorRows
      .filter((r) => r.suggested > 0)
      .sort((a, b) => b.suggested - a.suggested)
      .slice(0, MAX_SUGGESTIONS)
      .map((r) => ({ sku: r.sku, nameEn: r.nameEn, nameUk: r.nameUk, suggested: r.suggested, status: r.status }));

    // --- Wholesale --------------------------------------------------------
    const quiet = quietPartners(partnersRead.partners, today);
    const dueFollowUps = partnersRead.partners.filter((p) => followUpDue(p, today)).length;

    const thisMonth = months.find((m) => m.month === today.slice(0, 7)) ?? null;

    const brief: BriefData = {
      generatedOn: today,
      week: {
        from: weekFrom,
        to: today,
        revenueUah: week.revenueUah,
        orders: week.orders,
        unpriced: week.unpriced,
        prevRevenueUah: prev.revenueUah,
        prevOrders: prev.orders,
      },
      monthToDate: thisMonth && {
        month: thisMonth.month,
        ordersCount: thisMonth.ordersCount,
        revenueUah: thisMonth.revenueUah,
        cogsUah: thisMonth.cogsUah,
        opexUah: thisMonth.opexUah,
        marginUah: thisMonth.marginUah,
        uncostedLines: thisMonth.uncostedLines,
        unpricedOrders: thisMonth.unpricedOrders,
      },
      topProducts,
      stock: {
        critical: advisorRows.filter((r) => r.status === "critical").map(line),
        low: advisorRows.filter((r) => r.status === "low").map(line),
        overstock: advisorRows.filter((r) => r.status === "overstock").map(line),
        suggestions,
      },
      wholesale: {
        dueFollowUps,
        quiet: quiet
          .slice(0, MAX_QUIET)
          .map((c) => ({ company: c.partner.company, daysQuiet: c.daysQuiet, status: c.partner.status })),
      },
    };

    return { brief, advisorRows, quiet };
  } catch (e) {
    console.error("[brief] build threw:", e);
    return null;
  }
}

export type BriefRunResult = {
  ok: boolean;
  /** How many of the three audit rows landed in agent_runs. */
  logged: number;
  emailed: boolean;
  error?: string;
};

/**
 * Build, log, and (for the Monday cron) mail the brief. One call, three
 * audit rows — the advisor's table, the follow-up list, and the brief itself
 * — so each agent's history reads on its own (§6.7). Logging trouble (0019
 * not yet run, most likely) is reported, and the mail still goes: a lost
 * photograph must not also lose the briefing.
 */
export async function runWeeklyBrief(opts: {
  trigger: AgentTrigger;
  createdBy: string;
  sendEmail: boolean;
}): Promise<BriefRunResult> {
  const built = await buildBrief();
  if (built === null) {
    return { ok: false, logged: 0, emailed: false, error: "A core input was unreadable." };
  }

  const { brief, advisorRows, quiet } = built;
  const meta = { trigger: opts.trigger, createdBy: opts.createdBy };

  let logged = 0;
  const logs = await Promise.all([
    logAgentRun({ ...meta, agent: "stock_advisor", output: { rows: advisorRows } }),
    logAgentRun({
      ...meta,
      agent: "wholesale_followup",
      output: {
        candidates: quiet.map((c) => ({
          company: c.partner.company,
          status: c.partner.status,
          daysQuiet: c.daysQuiet,
          alreadyScheduled: c.alreadyScheduled,
        })),
      },
    }),
    logAgentRun({ ...meta, agent: "weekly_brief", output: brief }),
  ]);
  for (const l of logs) if (l.ok) logged += 1;

  let emailed = false;
  if (opts.sendEmail) {
    emailed = await sendBriefMail(brief);
  }

  return {
    ok: true,
    logged,
    emailed,
    error: logged < 3 ? "Some runs were not logged — has migration 0019 been run?" : undefined,
  };
}

/* ---------------------------------------------------------------------------
   The Monday mail. Internal, to the shop's own address, English labels like
   the stock alert — the full bilingual rendering lives at /admin/brief,
   which the mail links to.
--------------------------------------------------------------------------- */
async function sendBriefMail(brief: BriefData): Promise<boolean> {
  const siteUrl = (process.env.SITE_URL || "https://tactical-hb.com").replace(/\/$/, "");
  const delta = weekDelta(brief.week.revenueUah, brief.week.prevRevenueUah);

  const criticalNames = brief.stock.critical.map((l) => `${l.nameEn} (${l.onHand})`);
  const suggestionLines = brief.stock.suggestions.map((s) => `make ${s.suggested} — ${s.nameEn}`);
  const quietLines = brief.wholesale.quiet.map((q) => `${q.company} — quiet ${q.daysQuiet} days`);
  const productLines = brief.topProducts.map(
    (p) => `${p.name}: ${p.units} pcs${p.revenueUah !== null ? `, ${briefUah(p.revenueUah)}` : ""}`
  );

  const textBlock = (title: string, lines: string[]) =>
    lines.length ? [``, `${title}:`, ...lines.map((l) => `  ${l}`)] : [];

  const text = [
    `Week ${brief.week.from} — ${brief.week.to}`,
    `Revenue ${briefUah(brief.week.revenueUah)} (${delta} vs previous week), ${brief.week.orders} orders`,
    brief.monthToDate
      ? `Month so far: revenue ${briefUah(brief.monthToDate.revenueUah)}, margin ${briefUah(brief.monthToDate.marginUah)}`
      : `Month so far: nothing recorded yet`,
    ...textBlock("Critical stock", criticalNames),
    ...textBlock("Advisor suggests", suggestionLines),
    ...textBlock("Top products", productLines),
    ...textBlock("Wholesale gone quiet", quietLines),
    ``,
    `Follow-ups due: ${brief.wholesale.dueFollowUps}`,
    ``,
    `${siteUrl}/uk/admin/brief`,
  ].join("\n");

  const htmlList = (title: string, lines: string[], tone?: string) =>
    lines.length
      ? `<p style="margin:14px 0 4px"><strong>${esc(title)}</strong></p>
         <ul style="margin:0;padding-left:18px;${tone ? `color:${tone}` : ""}">${lines
           .map((l) => `<li style="padding:1px 0">${esc(l)}</li>`)
           .join("")}</ul>`
      : "";

  const result = await sendMail({
    to: ADMIN_EMAIL,
    subject: `BRIEF — week to ${brief.week.to} — ${briefUah(brief.week.revenueUah)} — Tactical HB`,
    text,
    html: `
      <div style="font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.6;color:#111">
        <p style="margin:0 0 2px"><strong>Week ${esc(brief.week.from)} — ${esc(brief.week.to)}</strong></p>
        <p style="margin:0 0 12px">
          Revenue <strong>${esc(briefUah(brief.week.revenueUah))}</strong>
          <span style="color:#707072">(${esc(delta)} vs previous week)</span>
          · ${brief.week.orders} orders<br>
          ${
            brief.monthToDate
              ? `Month so far: revenue ${esc(briefUah(brief.monthToDate.revenueUah))}, margin <strong>${esc(
                  briefUah(brief.monthToDate.marginUah)
                )}</strong>`
              : `Month so far: nothing recorded yet`
          }
        </p>
        ${htmlList("Critical stock", criticalNames, "#96322c")}
        ${htmlList("Advisor suggests", suggestionLines)}
        ${htmlList("Top products", productLines)}
        ${htmlList("Wholesale gone quiet", quietLines)}
        <p style="margin:14px 0 0">Follow-ups due: <strong>${brief.wholesale.dueFollowUps}</strong></p>
        <p style="margin:14px 0 0"><a href="${siteUrl}/uk/admin/brief" style="color:#111">Open the brief</a></p>
      </div>
    `,
  });

  if (!result.ok) {
    console.error("[brief] email not sent:", result.error);
    return false;
  }
  return true;
}
