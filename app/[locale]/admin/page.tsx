import { requireAdminPage } from "@/lib/admin-guard";
import { fetchStock } from "@/lib/stock-admin";
import { formatUah, stockLevel } from "@/lib/stock-display";
import { fetchFinanceMonths } from "@/lib/finance-admin";
import { fetchPartners } from "@/lib/partners-admin";
import { followUpDue } from "@/lib/partners-display";
import { currentPeriod } from "@/lib/costs-display";
import { quietPartners } from "@/lib/followup-display";
import { fetchAgentRuns } from "@/lib/agent-runs";
import { fetchAdSpend } from "@/lib/marketing-admin";
import { spendTotals } from "@/lib/marketing-display";
import { fetchProjects } from "@/lib/projects-admin";
import { coachSummary } from "@/lib/projects-display";
import OfficeMap, { type MapAgent, type MapRoom, type RoomTone } from "@/components/admin/OfficeMap";

/* ---------------------------------------------------------------------------
   Admin home, Phase E: the department map.

   The eight cards grew into the office the plan promised — rooms per
   department, the shared memory in the middle, and the agents from Phases C–D
   walking the floor with their live findings. Underneath, a terminal sitrep
   carries the exact numbers the cards used to show: the two-minute test (plan
   §10) must survive any amount of scenery.

   Reads only. Every figure on screen comes from the same read layer the cards
   used; nothing here mutates and no agent gained a capability by being drawn.
--------------------------------------------------------------------------- */

export const dynamic = "force-dynamic";

type TermLine = { tag: string; level: string; tone: RoomTone; text: string };

/* The accent orange is reserved for brand and system. Health reads green /
   amber / red, so "needs attention" takes the amber light rather than
   borrowing the accent. */
const TONE_COLOR: Record<RoomTone, string> = {
  ok: "var(--console-ok)",
  warn: "var(--console-warn)",
  alert: "var(--console-alert)",
  idle: "var(--console-faint)",
};

export default async function AdminHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { email } = await requireAdminPage(locale, "/admin");

  const uk = locale === "uk";
  const [items, months, partnersRead, briefRuns, adSpendRows, planRuns, projectsRead, marginRuns] =
    await Promise.all([
      fetchStock(),
      fetchFinanceMonths(1),
      fetchPartners(),
      fetchAgentRuns("weekly_brief", 1),
      fetchAdSpend(),
      fetchAgentRuns("marketing_strategist", 1),
      fetchProjects(),
      fetchAgentRuns("cost_margin_guard", 1),
    ]);

  const shortDate = (iso: string) =>
    new Date(iso).toLocaleDateString(uk ? "uk-UA" : "en-GB", {
      timeZone: "Europe/Kyiv",
      day: "numeric",
      month: "short",
    });

  const needsAttention =
    items === null ? null : items.filter((i) => stockLevel(i) !== "ok").length;

  const thisMonth = (months ?? []).find((m) => m.month === currentPeriod()) ?? null;

  const today = new Date().toISOString().slice(0, 10);
  const dueFollowUps =
    partnersRead === null
      ? null
      : partnersRead.partners.filter((p) => followUpDue(p, today)).length;
  const quietCount =
    partnersRead === null ? null : quietPartners(partnersRead.partners, today).length;

  const latestBrief = briefRuns?.[0] ?? null;
  const latestPlan = planRuns?.[0] ?? null;
  const latestMargin = marginRuns?.[0] ?? null;
  const monthSpend = adSpendRows === null ? null : spendTotals(adSpendRows, currentPeriod());
  const savings = projectsRead === null ? null : coachSummary(projectsRead.projects, today, null);

  /* ---- room stats ---- */

  const stockStat =
    needsAttention === null
      ? { text: "?", tone: "idle" as RoomTone }
      : needsAttention === 0
        ? { text: "OK", tone: "ok" as RoomTone }
        : { text: uk ? `${needsAttention} низько` : `${needsAttention} low`, tone: "alert" as RoomTone };

  const financeStat =
    thisMonth === null
      ? { text: uk ? "порожньо" : "empty", tone: "idle" as RoomTone }
      : {
          text: formatUah(thisMonth.marginUah),
          tone: (thisMonth.marginUah < 0 ? "alert" : "ok") as RoomTone,
        };

  const wholesaleStat =
    dueFollowUps === null
      ? { text: "?", tone: "idle" as RoomTone }
      : dueFollowUps > 0
        ? { text: uk ? `${dueFollowUps} сьогодні` : `${dueFollowUps} due`, tone: "warn" as RoomTone }
        : quietCount
          ? { text: uk ? `${quietCount} мовчать` : `${quietCount} quiet`, tone: "warn" as RoomTone }
          : { text: "OK", tone: "ok" as RoomTone };

  const marketingStat =
    monthSpend === null
      ? { text: "?", tone: "idle" as RoomTone }
      : monthSpend.totalUah === 0
        ? { text: uk ? "без витрат" : "no spend", tone: "idle" as RoomTone }
        : { text: formatUah(monthSpend.totalUah), tone: "ok" as RoomTone };

  const projectsStat =
    savings === null || savings.projectsCounted === 0
      ? { text: "—", tone: "idle" as RoomTone }
      : { text: `≈${formatUah(savings.totalNeededPerMonthUah)}/${uk ? "міс" : "mo"}`, tone: "warn" as RoomTone };

  const commandStat =
    latestBrief === null
      ? { text: uk ? "без брифу" : "no brief", tone: "idle" as RoomTone }
      : { text: shortDate(latestBrief.createdAt), tone: "ok" as RoomTone };

  const p = (path: string) => `/${locale}/admin${path}`;

  const rooms: MapRoom[] = [
    {
      id: "command",
      title: uk ? "ШТАБ" : "COMMAND",
      href: p("/brief"),
      stat: commandStat,
      chips: [{ label: uk ? "Тижневий бриф" : "Weekly Brief", href: p("/brief") }],
    },
    {
      id: "orders",
      title: uk ? "ПРОДАЖІ" : "COMMERCE",
      href: p("/orders"),
      chips: [
        { label: uk ? "Замовлення" : "Orders", href: p("/orders") },
        { label: uk ? "Ваучери" : "Vouchers", href: p("/vouchers") },
      ],
    },
    {
      id: "marketing",
      title: uk ? "МАРКЕТИНГ" : "MARKETING",
      href: p("/marketing"),
      stat: marketingStat,
      chips: [
        { label: uk ? "Кампанії" : "Campaigns", href: p("/marketing") },
        { label: uk ? "Стратег" : "Strategist", href: p("/strategist") },
      ],
    },
    {
      id: "stock",
      title: uk ? "СКЛАД" : "STOCK & PRODUCTION",
      href: p("/stock"),
      stat: stockStat,
      chips: [
        { label: uk ? "Залишки" : "Stock", href: p("/stock") },
        { label: uk ? "Радник" : "Advisor", href: p("/advisor") },
      ],
    },
    {
      id: "wholesale",
      title: uk ? "ОПТ" : "WHOLESALE CRM",
      href: p("/partners"),
      stat: wholesaleStat,
      chips: [
        { label: uk ? "Партнери" : "Partners", href: p("/partners") },
        { label: uk ? "Листи" : "Follow-ups", href: p("/followups") },
      ],
    },
    {
      // The 3×3 grid has no free cell (eight rooms plus the core), so the
      // Workshop rides here rather than going unreachable — §5 already gives
      // "machine costs" to Suppliers & Costs.
      id: "costs",
      title: uk ? "ВИТРАТИ" : "SUPPLIERS & COSTS",
      href: p("/costs"),
      chips: [
        { label: uk ? "Витрати" : "Costs", href: p("/costs") },
        { label: uk ? "Постачальники" : "Suppliers", href: p("/suppliers") },
        { label: uk ? "Майстерня" : "Workshop", href: p("/workshop") },
      ],
    },
    {
      id: "finance",
      title: uk ? "ФІНАНСИ" : "FINANCE",
      href: p("/finance"),
      stat: financeStat,
      chips: [
        { label: uk ? "Огляд і CSV" : "Views & CSV", href: p("/finance") },
        { label: uk ? "Маржа" : "Margin", href: p("/margin") },
      ],
    },
    {
      id: "projects",
      title: uk ? "ПРОЄКТИ" : "PROJECTS",
      href: p("/projects"),
      stat: projectsStat,
      chips: [{ label: uk ? "Проєкти та виставки" : "Projects & Exhibitions", href: p("/projects") }],
    },
  ];

  const agents: MapAgent[] = [
    {
      id: "advisor",
      roomId: "stock",
      color: "#4cd48b",
      label: `${uk ? "Радник" : "Advisor"} · ${stockStat.text}`,
    },
    {
      id: "followup",
      roomId: "wholesale",
      color: "#58c4dd",
      label: `${uk ? "Листи" : "Follow-up"} · ${
        quietCount === null ? "?" : quietCount === 0 ? "OK" : uk ? `${quietCount} мовчать` : `${quietCount} quiet`
      }`,
    },
    {
      id: "strategist",
      roomId: "marketing",
      // Dusty rose, not the old brass. These dots are agent identities, so this
      // one has to sit clear of the brand orange as well as of the status
      // lights — a warm tone next to the accent would read as a system marker.
      color: "#D18FA6",
      label: `${uk ? "Стратег" : "Strategist"} · ${latestPlan ? shortDate(latestPlan.createdAt) : "—"}`,
    },
    {
      id: "coach",
      roomId: "projects",
      color: "#b48ce8",
      label: `${uk ? "Коуч" : "Coach"} · ${projectsStat.text}`,
    },
    {
      id: "brief",
      roomId: "command",
      color: "#e8e6df",
      label: `${uk ? "Бриф" : "Brief"} · ${latestBrief ? shortDate(latestBrief.createdAt) : "—"}`,
    },
    {
      // The finance room had no agent until Phase F.
      id: "margin",
      roomId: "finance",
      // Quiet grey-blue on purpose: this figure reports on health, so it must
      // not BE a health colour, and the accent belongs to brand and system.
      color: "#9aa7b8",
      label: `${uk ? "Маржа" : "Margin"} · ${latestMargin ? shortDate(latestMargin.createdAt) : "—"}`,
    },
  ];

  /* ---- terminal sitrep: the old cards' sentences, as a log ---- */

  const lines: TermLine[] = [
    {
      tag: "stock-advisor",
      level: needsAttention ? "WARN" : "OK",
      tone: needsAttention === null ? "idle" : needsAttention ? "alert" : "ok",
      text:
        needsAttention === null
          ? uk ? "Склад недоступний" : "Stock unavailable"
          : needsAttention === 0
            ? uk ? "Все в нормі" : "Everything in stock"
            : uk
              ? `${needsAttention} ${needsAttention === 1 ? "позиція потребує" : "позицій потребують"} уваги`
              : `${needsAttention} ${needsAttention === 1 ? "line needs" : "lines need"} attention`,
    },
    {
      tag: "finance",
      level: thisMonth !== null && thisMonth.marginUah < 0 ? "ALERT" : "INFO",
      tone: thisMonth === null ? "idle" : thisMonth.marginUah < 0 ? "alert" : "ok",
      text:
        months === null
          ? uk ? "Фінанси недоступні" : "Finance unavailable"
          : thisMonth === null
            ? uk ? "Цього місяця ще порожньо" : "Nothing this month yet"
            : `${uk ? "Маржа цього місяця" : "This month's margin"}: ${formatUah(thisMonth.marginUah)}`,
    },
    {
      tag: "wholesale",
      level: dueFollowUps ? "WARN" : "OK",
      tone: dueFollowUps === null ? "idle" : dueFollowUps ? "warn" : "ok",
      text:
        dueFollowUps === null
          ? uk ? "Партнери недоступні" : "Partners unavailable"
          : dueFollowUps === 0
            ? uk ? "Нагадувань немає" : "No follow-ups due"
            : uk
              ? `${dueFollowUps} ${dueFollowUps === 1 ? "нагадування" : "нагадувань"} на сьогодні`
              : `${dueFollowUps} follow-up${dueFollowUps === 1 ? "" : "s"} due`,
    },
    {
      tag: "followup-agent",
      level: quietCount ? "WARN" : "OK",
      tone: quietCount === null ? "idle" : quietCount ? "warn" : "ok",
      text:
        quietCount === null
          ? uk ? "Партнери недоступні" : "Partners unavailable"
          : quietCount === 0
            ? uk ? "Ніхто не мовчить" : "Nobody has gone quiet"
            : uk
              ? `${quietCount} ${quietCount === 1 ? "партнер мовчить" : "партнерів мовчать"} 90+ днів`
              : `${quietCount} quiet for 90+ days`,
    },
    {
      tag: "marketing",
      level: "INFO",
      tone: monthSpend === null ? "idle" : "ok",
      text:
        monthSpend === null
          ? uk ? "Маркетинг недоступний" : "Marketing unavailable"
          : monthSpend.totalUah === 0
            ? uk ? "Цього місяця витрат ще немає" : "No spend recorded this month"
            : `${uk ? "Реклама цього місяця" : "This month's ads"}: ${formatUah(monthSpend.totalUah)}`,
    },
    {
      tag: "strategist",
      level: latestPlan ? "INFO" : "IDLE",
      tone: latestPlan ? "ok" : "idle",
      text:
        planRuns === null
          ? uk ? "Журнал недоступний" : "Log unavailable"
          : latestPlan === null
            ? uk ? "Ще жодного плану" : "No plans yet"
            : `${uk ? "Останній план" : "Latest plan"}: ${shortDate(latestPlan.createdAt)}`,
    },
    {
      tag: "savings-coach",
      level: savings && savings.projectsCounted > 0 ? "INFO" : "IDLE",
      tone: savings && savings.projectsCounted > 0 ? "warn" : "idle",
      text:
        savings === null
          ? uk ? "Проєкти недоступні" : "Projects unavailable"
          : savings.projectsCounted === 0
            ? uk ? "Активних цілей немає" : "No active savings targets"
            : uk
              ? `Потрібно ≈ ${formatUah(savings.totalNeededPerMonthUah)}/міс на ${savings.projectsCounted} проєкти`
              : `Needs ≈ ${formatUah(savings.totalNeededPerMonthUah)}/mo across ${savings.projectsCounted}`,
    },
    {
      tag: "brief",
      level: latestBrief ? "INFO" : "IDLE",
      tone: latestBrief ? "ok" : "idle",
      text:
        briefRuns === null
          ? uk ? "Журнал недоступний" : "Log unavailable"
          : latestBrief === null
            ? uk ? "Ще жодного брифу" : "No briefs yet"
            : `${uk ? "Останній бриф" : "Latest brief"}: ${shortDate(latestBrief.createdAt)}`,
    },
  ];

  const now = new Date().toLocaleString(uk ? "uk-UA" : "en-GB", {
    timeZone: "Europe/Kyiv",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="min-h-screen px-4 sm:px-8 py-8">
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="font-display text-4xl tracking-widest" style={{ color: "var(--console-text)" }}>
            {uk ? "МАПА ОПЕРАЦІЙ" : "OPS MAP"}
          </h1>
          <p className="text-[12px] mt-1" style={{ color: "var(--console-muted)" }}>
            {uk ? "Спільна памʼять · агенти лише радять" : "Shared memory · agents advise, never act"}
          </p>
        </div>
        <p className="text-[12px] tabular-nums" style={{ color: "var(--console-faint)" }}>
          {now} · {email}
        </p>
      </header>

      {/* thb-map swaps in the Phase E palette for this block alone — see the
          note in globals.css. The map is the one screen allowed to be loud. */}
      <div className="thb-map console-card overflow-hidden" style={{ background: "var(--console-bg)" }}>
        <OfficeMap
          rooms={rooms}
          agents={agents}
          coreTitle={uk ? "СПІЛЬНА ПАМʼЯТЬ" : "SHARED MEMORY"}
          coreSub="Supabase"
        />
      </div>

      <section className="console-card mt-6 overflow-hidden">
        <div
          className="px-4 py-2 console-section-label"
          style={{ borderBottom: "1px solid var(--console-border)" }}
        >
          {uk ? "Зведення" : "Sitrep"}
        </div>
        <div className="px-4 py-3 font-mono text-[12.5px] leading-6 overflow-x-auto">
          {lines.map((l) => (
            <div key={l.tag} className="whitespace-nowrap">
              <span style={{ color: TONE_COLOR[l.tone] }}>{l.tag.padEnd(15)}</span>
              <span style={{ color: "var(--console-faint)" }}>[{l.level}] </span>
              <span style={{ color: "var(--console-text)" }}>{l.text}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
