import { requireAdminPage } from "@/lib/admin-guard";
import { fetchStock } from "@/lib/stock-admin";
import { stockLevel } from "@/lib/stock-display";
import { fetchPartners } from "@/lib/partners-admin";
import { fetchAllRequests } from "@/lib/wholesale-portal";
import { isOpenRequest } from "@/lib/wholesale-display";
import { followUpDue } from "@/lib/partners-display";
import { quietPartners } from "@/lib/followup-display";
import { fetchAgentRuns } from "@/lib/agent-runs";
import OfficeMap, { type MapAgent, type MapRoom, type RoomTone } from "@/components/admin/OfficeMap";

/* ---------------------------------------------------------------------------
   The ops map — the department floor, now on its own page.

   It was the admin's home page until 1 October 2026, when the console went
   white and its home became a plain overview of what needs doing. The map
   moved here, in the Advisors section, rather than going away: it is where
   the agents are seen at work, and Mario asked for it to stay. Its rooms now
   carry only the sections kept in the menu (see ConsoleShell's SECTIONS); the
   finance, marketing and projects rooms became Margin, Strategist and a
   doorway back to the overview, and the savings coach left with Projects.

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
  const { email } = await requireAdminPage(locale, "/admin/ops");

  const uk = locale === "uk";
  const [items, partnersRead, briefRuns, planRuns, marginRuns, wholesaleRequests] = await Promise.all([
    fetchStock(),
    fetchPartners(),
    fetchAgentRuns("weekly_brief", 1),
    fetchAgentRuns("marketing_strategist", 1),
    fetchAgentRuns("cost_margin_guard", 1),
    fetchAllRequests(200),
  ]);

  const shortDate = (iso: string) =>
    new Date(iso).toLocaleDateString(uk ? "uk-UA" : "en-GB", {
      timeZone: "Europe/Kyiv",
      day: "numeric",
      month: "short",
    });

  const needsAttention =
    items === null ? null : items.filter((i) => stockLevel(i) !== "ok").length;

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

  /* ---- room stats ---- */

  const stockStat =
    needsAttention === null
      ? { text: "?", tone: "idle" as RoomTone }
      : needsAttention === 0
        ? { text: "OK", tone: "ok" as RoomTone }
        : { text: uk ? `${needsAttention} низько` : `${needsAttention} low`, tone: "alert" as RoomTone };

  const pendingAccounts =
    partnersRead === null
      ? null
      : partnersRead.partners.filter((p) => p.hasLogin && p.accountStatus === "pending").length;
  const openRequests = (wholesaleRequests ?? []).filter((r) => isOpenRequest(r.status)).length;

  /* A partner waiting to be let in, or a request nobody has answered, is
     somebody blocked on us — that outranks a follow-up we chose to schedule. */
  const wholesaleStat =
    pendingAccounts
      ? { text: uk ? `${pendingAccounts} на схвалення` : `${pendingAccounts} to approve`, tone: "warn" as RoomTone }
      : openRequests
        ? { text: uk ? `${openRequests} запитів` : `${openRequests} requests`, tone: "warn" as RoomTone }
        : dueFollowUps === null
      ? { text: "?", tone: "idle" as RoomTone }
      : dueFollowUps > 0
        ? { text: uk ? `${dueFollowUps} сьогодні` : `${dueFollowUps} due`, tone: "warn" as RoomTone }
        : quietCount
          ? { text: uk ? `${quietCount} мовчать` : `${quietCount} quiet`, tone: "warn" as RoomTone }
          : { text: "OK", tone: "ok" as RoomTone };

  const strategyStat = latestPlan
    ? { text: shortDate(latestPlan.createdAt), tone: "ok" as RoomTone }
    : { text: uk ? "без плану" : "no plan", tone: "idle" as RoomTone };

  const marginStat = latestMargin
    ? { text: shortDate(latestMargin.createdAt), tone: "ok" as RoomTone }
    : { text: uk ? "без звіту" : "no report", tone: "idle" as RoomTone };

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
      id: "strategy",
      title: uk ? "СТРАТЕГІЯ" : "STRATEGY",
      href: p("/strategist"),
      stat: strategyStat,
      chips: [{ label: uk ? "Стратег" : "Strategist", href: p("/strategist") }],
    },
    {
      id: "stock",
      title: uk ? "СКЛАД" : "STOCK",
      href: p("/stock"),
      stat: stockStat,
      chips: [
        { label: uk ? "Залишки" : "Stock", href: p("/stock") },
        { label: uk ? "Радник" : "Advisor", href: p("/advisor") },
      ],
    },
    {
      id: "wholesale",
      title: uk ? "ОПТ" : "WHOLESALE",
      href: p("/partners"),
      stat: wholesaleStat,
      chips: [
        { label: uk ? "Партнери" : "Partners", href: p("/partners") },
        { label: uk ? "Запити" : "Requests", href: p("/wholesale") },
        { label: uk ? "Прайси" : "Price books", href: p("/prices") },
      ],
    },
    {
      id: "costs",
      title: uk ? "ВИТРАТИ" : "SUPPLIERS & COSTS",
      href: p("/costs"),
      chips: [
        { label: uk ? "Витрати" : "Costs", href: p("/costs") },
        { label: uk ? "Постачальники" : "Suppliers", href: p("/suppliers") },
      ],
    },
    {
      id: "margin",
      title: uk ? "МАРЖА" : "MARGIN",
      href: p("/margin"),
      stat: marginStat,
      chips: [{ label: uk ? "Вартість і маржа" : "Cost & Margin Guard", href: p("/margin") }],
    },
    {
      // The grid has eight cells around the core and seven kept departments;
      // the eighth is the way back to the overview rather than an empty room.
      id: "overview",
      title: uk ? "ОГЛЯД" : "OVERVIEW",
      href: p(""),
      chips: [{ label: uk ? "Що чекає" : "What needs doing", href: p("") }],
    },
  ];

  const agents: MapAgent[] = [
    {
      id: "advisor",
      roomId: "stock",
      color: "#2E9D5E",
      label: `${uk ? "Радник" : "Advisor"} · ${stockStat.text}`,
    },
    {
      id: "followup",
      roomId: "wholesale",
      color: "#2C9CBF",
      label: `${uk ? "Листи" : "Follow-up"} · ${
        quietCount === null ? "?" : quietCount === 0 ? "OK" : uk ? `${quietCount} мовчать` : `${quietCount} quiet`
      }`,
    },
    {
      id: "strategist",
      roomId: "strategy",
      // Dusty rose: an agent identity, kept clear of the brand orange and of
      // every status light.
      color: "#C77D98",
      label: `${uk ? "Стратег" : "Strategist"} · ${strategyStat.text}`,
    },
    {
      id: "brief",
      roomId: "command",
      // Was #e8e6df, a near-white that read on the dark floor and vanishes on
      // white. A quiet slate keeps it an identity without becoming a status.
      color: "#4B4F58",
      label: `${uk ? "Бриф" : "Brief"} · ${latestBrief ? shortDate(latestBrief.createdAt) : "—"}`,
    },
    {
      id: "margin",
      roomId: "margin",
      // Grey-blue on purpose: this figure reports on health, so it must not
      // BE a health colour, and the accent belongs to brand and system.
      color: "#7D8BA0",
      label: `${uk ? "Маржа" : "Margin"} · ${marginStat.text}`,
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
      tag: "wholesale",
      level: pendingAccounts || openRequests ? "WARN" : "OK",
      tone: partnersRead === null ? "idle" : pendingAccounts || openRequests ? "warn" : "ok",
      text:
        partnersRead === null
          ? uk ? "Партнери недоступні" : "Partners unavailable"
          : pendingAccounts
            ? uk ? `${pendingAccounts} на схвалення` : `${pendingAccounts} waiting for approval`
            : openRequests
              ? uk ? `${openRequests} відкритих запитів` : `${openRequests} open request${openRequests === 1 ? "" : "s"}`
              : uk ? "Нічого не чекає" : "Nothing waiting",
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
      tag: "margin-guard",
      level: latestMargin ? "INFO" : "IDLE",
      tone: latestMargin ? "ok" : "idle",
      text:
        marginRuns === null
          ? uk ? "Журнал недоступний" : "Log unavailable"
          : latestMargin === null
            ? uk ? "Ще жодного звіту" : "No reports yet"
            : `${uk ? "Останній звіт" : "Latest report"}: ${shortDate(latestMargin.createdAt)}`,
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

      {/* thb-map scopes the map's own values (the data-line cyan, the core
          halo) to this block — see the note in globals.css. */}
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
