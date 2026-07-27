import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-guard";
import { fetchAgentRuns } from "@/lib/agent-runs";
import { isBriefData, briefUah, weekDelta, type BriefData } from "@/lib/brief-display";
import { advisorStatusLabel } from "@/lib/advisor-display";
import { channelLabel } from "@/lib/marketing-display";
import { verdictLabel, verdictTone } from "@/lib/projects-display";
import GenerateBriefButton from "@/components/admin/GenerateBriefButton";

/* ---------------------------------------------------------------------------
   Admin: the Weekly Commander Brief — the plan's two-minute test (§10) on
   one page.

   WHAT RENDERS HERE IS THE RECORD, not a live computation: the latest row
   from agent_runs, exactly as it was generated (Monday's cron, or the
   button). A brief that silently recomputed on every view would make the
   audit log a decoration — the founder would never be reading what was
   logged. Freshness is one click away, and honestly labelled with its
   generation date.
--------------------------------------------------------------------------- */

export const dynamic = "force-dynamic";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg px-6 py-5" style={{ border: "1px solid var(--border)", background: "#fff" }}>
      <h2 className="text-[13px] font-medium tracking-[0.12em] uppercase mb-3" style={{ color: "#8a8a8d" }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function StockList({
  title,
  lines,
  uk,
  tone,
}: {
  title: string;
  lines: { sku: string; nameEn: string; nameUk: string; onHand: number }[];
  uk: boolean;
  tone: string;
}) {
  if (lines.length === 0) return null;
  return (
    <div className="mb-3">
      <div className="text-[13px] font-medium mb-1" style={{ color: tone }}>
        {title}
      </div>
      <ul className="text-[14px]" style={{ color: "#3a3a3c" }}>
        {lines.map((l) => (
          <li key={l.sku} className="py-0.5">
            {uk ? l.nameUk : l.nameEn} — {l.onHand} {uk ? "на складі" : "on hand"}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Brief({ data, uk, locale }: { data: BriefData; uk: boolean; locale: string }) {
  const m = data.monthToDate;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section title={uk ? `Тиждень ${data.week.from} — ${data.week.to}` : `Week ${data.week.from} — ${data.week.to}`}>
        <div className="text-[22px] font-semibold mb-1" style={{ color: "#111" }}>
          {briefUah(data.week.revenueUah)}
          <span className="text-[14px] font-normal ml-2" style={{ color: "#707072" }}>
            {weekDelta(data.week.revenueUah, data.week.prevRevenueUah)}{" "}
            {uk ? "до попереднього тижня" : "vs previous week"}
          </span>
        </div>
        <p className="text-[14px]" style={{ color: "#3a3a3c" }}>
          {data.week.orders} {uk ? "замовлень" : "orders"}
          {data.week.unpriced > 0 &&
            ` · ${data.week.unpriced} ${uk ? "без суми" : "unpriced"}`}
          {" · "}
          {uk ? "минулого тижня" : "previous week"}: {briefUah(data.week.prevRevenueUah)},{" "}
          {data.week.prevOrders} {uk ? "замовлень" : "orders"}
        </p>
      </Section>

      <Section title={uk ? "Місяць наростаючим підсумком" : "Month to date"}>
        {m === null ? (
          <p className="text-[14px]" style={{ color: "#707072" }}>
            {uk ? "Цього місяця ще нічого не записано." : "Nothing recorded this month yet."}
          </p>
        ) : (
          <>
            <div className="text-[22px] font-semibold mb-1" style={{ color: m.marginUah < 0 ? "#96322c" : "#111" }}>
              {briefUah(m.marginUah)}
              <span className="text-[14px] font-normal ml-2" style={{ color: "#707072" }}>
                {uk ? "маржа" : "margin"} · {m.month}
              </span>
            </div>
            <p className="text-[14px]" style={{ color: "#3a3a3c" }}>
              {uk ? "Дохід" : "Revenue"} {briefUah(m.revenueUah)} · {uk ? "Собівартість" : "COGS"}{" "}
              {briefUah(m.cogsUah)} · {uk ? "Витрати" : "Opex"} {briefUah(m.opexUah)}
            </p>
            {(m.uncostedLines > 0 || m.unpricedOrders > 0) && (
              <p className="text-[13px] mt-1" style={{ color: "#8a5d16" }}>
                {uk
                  ? `Неповні дані: ${m.uncostedLines} рядків без собівартості, ${m.unpricedOrders} замовлень без суми.`
                  : `Incomplete data: ${m.uncostedLines} uncosted lines, ${m.unpricedOrders} unpriced orders.`}
              </p>
            )}
          </>
        )}
      </Section>

      <Section title={uk ? "Склад" : "Stock"}>
        <StockList
          title={advisorStatusLabel("critical", uk)}
          lines={data.stock.critical}
          uk={uk}
          tone="#96322c"
        />
        <StockList title={advisorStatusLabel("low", uk)} lines={data.stock.low} uk={uk} tone="#8a5d16" />
        <StockList
          title={advisorStatusLabel("overstock", uk)}
          lines={data.stock.overstock}
          uk={uk}
          tone="#3d5a73"
        />
        {data.stock.suggestions.length > 0 ? (
          <div>
            <div className="text-[13px] font-medium mb-1" style={{ color: "#111" }}>
              {uk ? "Радник пропонує виготовити" : "Advisor suggests making"}
            </div>
            <ul className="text-[14px]" style={{ color: "#3a3a3c" }}>
              {data.stock.suggestions.map((s) => (
                <li key={s.sku} className="py-0.5">
                  <strong>{s.suggested}</strong> — {uk ? s.nameUk : s.nameEn}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          data.stock.critical.length === 0 &&
          data.stock.low.length === 0 && (
            <p className="text-[14px]" style={{ color: "#707072" }}>
              {uk ? "Полиці в нормі." : "Shelves are fine."}
            </p>
          )
        )}
        <p className="text-[13px] mt-3" style={{ color: "#8a8a8d" }}>
          <Link href={`/${locale}/admin/advisor`} className="underline underline-offset-2">
            {uk ? "Повна таблиця радника" : "Full advisor table"}
          </Link>
        </p>
      </Section>

      <Section title={uk ? "Гурт" : "Wholesale"}>
        <p className="text-[14px] mb-2" style={{ color: "#3a3a3c" }}>
          {uk ? "Нагадувань на сьогодні" : "Follow-ups due"}: <strong>{data.wholesale.dueFollowUps}</strong>
        </p>
        {data.wholesale.quiet.length > 0 ? (
          <ul className="text-[14px]" style={{ color: "#3a3a3c" }}>
            {data.wholesale.quiet.map((q) => (
              <li key={q.company} className="py-0.5">
                {q.company} — {uk ? `тиша ${q.daysQuiet} дн` : `quiet ${q.daysQuiet} days`}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[14px]" style={{ color: "#707072" }}>
            {uk ? "Ніхто не затих." : "Nobody has gone quiet."}
          </p>
        )}
        <p className="text-[13px] mt-3" style={{ color: "#8a8a8d" }}>
          <Link href={`/${locale}/admin/followups`} className="underline underline-offset-2">
            {uk ? "Чернетки листів" : "Follow-up drafts"}
          </Link>
        </p>
      </Section>

      {data.topProducts.length > 0 && (
        <div className="lg:col-span-2">
          <Section title={uk ? "Продажі тижня" : "This week's sellers"}>
            <ul className="text-[14px]" style={{ color: "#3a3a3c" }}>
              {data.topProducts.map((p) => (
                <li key={p.sku} className="py-0.5">
                  {p.name} — {p.units} {uk ? "шт" : "pcs"}
                  {p.revenueUah !== null && ` · ${briefUah(p.revenueUah)}`}
                </li>
              ))}
            </ul>
          </Section>
        </div>
      )}

      {/* Phase D sections — optional: older stored runs simply lack them. */}
      {data.projects !== undefined && data.projects.length > 0 && (
        <Section title={uk ? "Накопичення на проєкти" : "Project savings"}>
          <ul className="text-[14px]" style={{ color: "#3a3a3c" }}>
            {data.projects.map((p) => {
              const tone = verdictTone(p.verdict);
              return (
                <li key={p.name} className="py-1 flex flex-wrap items-baseline gap-x-3">
                  <span style={{ color: "#111" }}>{p.name}</span>
                  <span className="tabular-nums">
                    {briefUah(p.savedUah)}
                    {p.targetBudgetUah !== null && (
                      <span style={{ color: "#a3a3a6" }}>
                        {" "}
                        / {briefUah(p.targetBudgetUah)}
                        {p.progressPct !== null && ` · ${p.progressPct}%`}
                      </span>
                    )}
                  </span>
                  <span
                    className="text-[11px] tracking-[0.1em] uppercase px-2 py-0.5 rounded"
                    style={{ background: tone.bg, color: tone.fg }}
                  >
                    {verdictLabel(p.verdict, uk)}
                  </span>
                  {p.neededPerMonthUah !== null && (
                    <span className="text-[13px] tabular-nums" style={{ color: "#707072" }}>
                      {uk ? "потрібно" : "needs"} {briefUah(p.neededPerMonthUah)}/{uk ? "міс" : "mo"}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="text-[13px] mt-3" style={{ color: "#8a8a8d" }}>
            <Link href={`/${locale}/admin/projects`} className="underline underline-offset-2">
              {uk ? "Проєкти та виставки" : "Projects & exhibitions"}
            </Link>
          </p>
        </Section>
      )}

      {data.adSpend !== undefined && (
        <Section title={uk ? "Реклама цього місяця" : "This month's ad spend"}>
          {data.adSpend.byChannel.length === 0 ? (
            <p className="text-[14px]" style={{ color: "#707072" }}>
              {uk
                ? `За ${data.adSpend.month} ще нічого не записано.`
                : `Nothing recorded for ${data.adSpend.month} yet.`}
            </p>
          ) : (
            <>
              <div className="text-[22px] font-semibold mb-1" style={{ color: "#111" }}>
                {briefUah(data.adSpend.totalUah)}
                <span className="text-[14px] font-normal ml-2" style={{ color: "#707072" }}>
                  {data.adSpend.month}
                </span>
              </div>
              <p className="text-[14px]" style={{ color: "#3a3a3c" }}>
                {data.adSpend.byChannel
                  .map((c) => `${channelLabel(c.channel, uk)} ${briefUah(c.amountUah)}`)
                  .join(" · ")}
              </p>
            </>
          )}
          <p className="text-[13px] mt-3" style={{ color: "#8a8a8d" }}>
            <Link href={`/${locale}/admin/strategist`} className="underline underline-offset-2">
              {uk ? "План стратега" : "Strategist's plan"}
            </Link>
          </p>
        </Section>
      )}
    </div>
  );
}

export default async function AdminBriefPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAdminPage(locale, "/admin/brief");

  const uk = locale === "uk";
  const runs = await fetchAgentRuns("weekly_brief", 8);
  const latest = runs?.[0] ?? null;
  const data = latest !== null && isBriefData(latest.output) ? latest.output : null;

  return (
    <div className="min-h-screen pt-10 pb-24" style={{ background: "#f7f6f4" }}>
      <div className="page-container">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold mb-1" style={{ color: "#111" }}>
            {uk ? "Тижневий бриф" : "Weekly Brief"}
          </h1>
          <p className="text-[14.5px] mb-4" style={{ color: "#707072" }}>
            {runs === null
              ? uk
                ? "Не вдалося прочитати журнал агентів."
                : "Couldn't read the agent log."
              : latest === null
                ? uk
                  ? "Ще жодного брифу. Щопонеділка ввечері він формується сам."
                  : "No briefs yet. One writes itself every Monday evening."
                : `${uk ? "Сформовано" : "Generated"} ${new Date(latest.createdAt).toLocaleString(uk ? "uk-UA" : "en-GB", { timeZone: "Europe/Kyiv", dateStyle: "medium", timeStyle: "short" })} · ${latest.trigger === "cron" ? (uk ? "автоматично" : "scheduled") : latest.createdBy}`}
          </p>
          <GenerateBriefButton uk={uk} />
        </header>

        {runs === null && (
          <div
            className="rounded-lg px-5 py-4 text-[14px]"
            style={{ border: "1px solid #e6d4d2", background: "#fdf6f5", color: "#96322c" }}
          >
            {uk
              ? "Перевірте, чи виконано міграцію 0019_agents.sql у Supabase, та чи задано SUPABASE_SERVICE_ROLE_KEY."
              : "Check that migration 0019_agents.sql has been run in Supabase, and that SUPABASE_SERVICE_ROLE_KEY is set."}
          </div>
        )}

        {latest !== null && data === null && (
          <p className="text-[14.5px] mb-6" style={{ color: "#707072" }}>
            {uk
              ? "Останній запис створено старішою версією брифу і він не читається — сформуйте новий."
              : "The latest run was generated by an earlier version of the brief and can't be rendered — generate a fresh one."}
          </p>
        )}

        {data !== null && <Brief data={data} uk={uk} locale={locale} />}

        {runs !== null && runs.length > 1 && (
          <div className="mt-8">
            <h2 className="text-[13px] font-medium tracking-[0.12em] uppercase mb-2" style={{ color: "#8a8a8d" }}>
              {uk ? "Попередні запуски" : "Previous runs"}
            </h2>
            <ul className="text-[13.5px]" style={{ color: "#707072" }}>
              {runs.slice(1).map((r) => (
                <li key={r.id} className="py-0.5">
                  {new Date(r.createdAt).toLocaleString(uk ? "uk-UA" : "en-GB", {
                    timeZone: "Europe/Kyiv",
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}{" "}
                  · {r.trigger === "cron" ? (uk ? "автоматично" : "scheduled") : r.createdBy}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
