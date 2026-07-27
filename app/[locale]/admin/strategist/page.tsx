import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-guard";
import { fetchAgentRuns } from "@/lib/agent-runs";
import {
  channelBasisLabel,
  isCampaignPlan,
  planNoteLabel,
  pushReasonLabel,
  type CampaignPlan,
} from "@/lib/strategist-display";
import { channelLabel, kindLabel } from "@/lib/marketing-display";
import { advisorStatusLabel, advisorStatusTone } from "@/lib/advisor-display";
import { formatUah } from "@/lib/stock-display";
import { monthLabel } from "@/lib/finance-display";
import GeneratePlanButton from "@/components/admin/GeneratePlanButton";

/* ---------------------------------------------------------------------------
   Admin: the Marketing Strategist (§6.4).

   WHAT RENDERS HERE IS THE RECORD — the latest agent_runs row, exactly as
   generated, same as the Weekly Brief. And the record is ALL the agent ever
   produces: a plan to read, edit, and carry to the ad platforms by hand.
   Nothing on this page (or behind it) can spend a hryvnia, post a creative,
   or pause a campaign. The strategist writes advice; the founder does — or
   doesn't — the marketing.
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

function Plan({ data, uk, locale }: { data: CampaignPlan; uk: boolean; locale: string }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Budget ---------------------------------------------------------- */}
      <div className="lg:col-span-2">
        <Section title={uk ? `Бюджет на ${monthLabel(data.planMonth, uk)}` : `Budget for ${monthLabel(data.planMonth, uk)}`}>
          <div className="text-[22px] font-semibold mb-1" style={{ color: "#111" }}>
            {formatUah(data.totalBudgetUah)}
            <span className="text-[14px] font-normal ml-2" style={{ color: "#707072" }}>
              {data.budgetBasis === "trailing_spend"
                ? uk
                  ? `середнє за ${data.trailingMonths.join(", ")}`
                  : `average of ${data.trailingMonths.join(", ")}`
                : uk
                  ? "відправна точка — історії витрат ще немає"
                  : "a starting point — no spend history yet"}
            </span>
          </div>
          <div className="mt-3 grid gap-1.5">
            {data.channels.map((c) => (
              <div
                key={c.channel}
                className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5 text-[14px]"
                style={{ color: "#3a3a3c" }}
              >
                <span className="w-[90px] font-medium" style={{ color: "#111" }}>
                  {channelLabel(c.channel, uk)}
                </span>
                <span className="w-[100px] tabular-nums">
                  {c.basis === "organic" ? "—" : `${c.sharePct}% · ${formatUah(c.budgetUah)}`}
                </span>
                <span className="text-[13px]" style={{ color: "#8a8a8d" }}>
                  {channelBasisLabel(c.basis, uk)}
                  {c.ordersPerKUah !== null &&
                    ` · ${c.ordersPerKUah} ${uk ? "зам./₴1000" : "orders/₴1000"}`}
                  {c.trailingSpendUah > 0 &&
                    ` · ${uk ? "витрачено" : "spent"} ${formatUah(c.trailingSpendUah)}`}
                </span>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* Push / avoid ----------------------------------------------------- */}
      <Section title={uk ? "Просувати" : "Push"}>
        {data.push.length === 0 ? (
          <p className="text-[14px]" style={{ color: "#707072" }}>
            {uk
              ? "Немає позицій, які можна впевнено рекламувати — все критичне або мало."
              : "Nothing can be pushed with confidence — everything is critical or low."}
          </p>
        ) : (
          <ul className="text-[14px]" style={{ color: "#3a3a3c" }}>
            {data.push.map((p) => (
              <li key={p.sku} className="py-1 flex flex-wrap items-baseline gap-x-3">
                <span className="font-medium" style={{ color: "#111" }}>
                  {uk ? p.nameUk : p.nameEn}
                </span>
                <span className="text-[13px]" style={{ color: "#707072" }}>
                  {pushReasonLabel(p.reason, uk)}
                  {p.units30 > 0 && ` · ${p.units30} ${uk ? "шт за 30 дн" : "pcs in 30 d"}`}
                </span>
                <span className="text-[13px] tabular-nums" style={{ color: p.grossMarginUah !== null && p.grossMarginUah < 0 ? "#96322c" : "#8a8a8d" }}>
                  {p.grossMarginUah === null
                    ? uk
                      ? "маржа невідома"
                      : "margin unknown"
                    : `${uk ? "маржа" : "margin"} ${formatUah(p.grossMarginUah)}`}
                </span>
                {!p.hasCreative && (
                  <span className="text-[12px]" style={{ color: "#8a5d16" }}>
                    {uk ? "немає креативу" : "no creative"}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={uk ? "Не рекламувати" : "Don't advertise"}>
        {data.avoid.length === 0 ? (
          <p className="text-[14px]" style={{ color: "#707072" }}>
            {uk ? "Склад нічого не забороняє." : "The shelf forbids nothing."}
          </p>
        ) : (
          <ul className="text-[14px]" style={{ color: "#3a3a3c" }}>
            {data.avoid.map((a) => {
              const tone = advisorStatusTone(a.status);
              return (
                <li key={a.sku} className="py-1 flex flex-wrap items-baseline gap-x-3">
                  <span style={{ color: "#111" }}>{uk ? a.nameUk : a.nameEn}</span>
                  <span
                    className="text-[11px] tracking-[0.1em] uppercase px-2 py-0.5 rounded"
                    style={{ background: tone.bg, color: tone.fg }}
                  >
                    {advisorStatusLabel(a.status, uk)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-[13px] mt-3" style={{ color: "#8a8a8d" }}>
          {uk
            ? "Реклама порожньої полиці купує розчарування (§6.4)."
            : "Advertising an empty shelf buys disappointment (§6.4)."}
        </p>
      </Section>

      {/* Creatives --------------------------------------------------------- */}
      <Section title={uk ? "Креативи: використати знову" : "Creatives to reuse"}>
        {data.reuse.length === 0 ? (
          <p className="text-[14px]" style={{ color: "#707072" }}>
            {uk ? "Активних креативів ще немає." : "No active creatives yet."}
          </p>
        ) : (
          <ul className="text-[14px]" style={{ color: "#3a3a3c" }}>
            {data.reuse.map((r) => (
              <li key={r.id} className="py-0.5">
                {r.title}
                <span className="text-[13px]" style={{ color: "#8a8a8d" }}>
                  {" "}
                  · {kindLabel(r.kind, uk)}
                  {r.channels.length > 0 &&
                    ` · ${r.channels.map((c) => channelLabel(c, uk)).join(", ")}`}
                </span>
              </li>
            ))}
          </ul>
        )}
        {data.missingCreatives.length > 0 && (
          <p className="text-[13px] mt-3" style={{ color: "#8a5d16" }}>
            {uk ? "Бракує креативів: " : "Missing creatives: "}
            {data.missingCreatives.map((m) => (uk ? m.nameUk : m.nameEn)).join(", ")}
          </p>
        )}
        <p className="text-[13px] mt-3" style={{ color: "#8a8a8d" }}>
          <Link href={`/${locale}/admin/marketing`} className="underline underline-offset-2">
            {uk ? "Бібліотека креативів" : "Creative library"}
          </Link>
        </p>
      </Section>

      <Section title={uk ? "Поставити на паузу" : "Consider pausing"}>
        {data.pause.length === 0 ? (
          <p className="text-[14px]" style={{ color: "#707072" }}>
            {uk ? "Пауз не пропонується." : "Nothing suggests a pause."}
          </p>
        ) : (
          <ul className="text-[14px]" style={{ color: "#3a3a3c" }}>
            {data.pause.map((p, i) => (
              <li key={i} className="py-1">
                {p.type === "creative_stock" ? (
                  <>
                    <span style={{ color: "#111" }}>{p.title}</span>
                    <span className="text-[13px]" style={{ color: "#707072" }}>
                      {" "}
                      —{" "}
                      {uk
                        ? `товар у статусі «${advisorStatusLabel(p.stockStatus, uk)}»`
                        : `its product is ${advisorStatusLabel(p.stockStatus, uk)}`}
                    </span>
                  </>
                ) : (
                  <>
                    <span style={{ color: "#111" }}>{channelLabel(p.channel, uk)}</span>
                    <span className="text-[13px]" style={{ color: "#707072" }}>
                      {" "}
                      —{" "}
                      {uk
                        ? `${formatUah(p.spentUah)} за ${p.monthsMeasured} виміряні місяці, 0 замовлень`
                        : `${formatUah(p.spentUah)} across ${p.monthsMeasured} measured months, 0 orders`}
                    </span>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="text-[13px] mt-3" style={{ color: "#8a8a8d" }}>
          {uk
            ? "Лише пропозиція — пауза виконується руками, тут або на платформі."
            : "A suggestion only — pausing happens by hand, here or on the platform."}
        </p>
      </Section>

      {/* Copy drafts -------------------------------------------------------- */}
      <div className="lg:col-span-2">
        <Section title={uk ? "Чернетки текстів" : "Copy drafts"}>
          {data.copy.length === 0 ? (
            <p className="text-[14px]" style={{ color: "#707072" }}>
              {uk ? "Немає що просувати — немає і текстів." : "Nothing to push, so nothing to say."}
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {data.copy.map((c) => (
                <div
                  key={c.sku}
                  className="rounded px-4 py-3 text-[13.5px]"
                  style={{ border: "1px solid var(--border)", background: "#fafaf9" }}
                >
                  <div className="font-medium mb-1" style={{ color: "#111" }}>
                    {c.en.headline}
                  </div>
                  <p style={{ color: "#3a3a3c" }}>{c.en.body}</p>
                  <div className="font-medium mt-3 mb-1" style={{ color: "#111" }}>
                    {c.uk.headline}
                  </div>
                  <p style={{ color: "#3a3a3c" }}>{c.uk.body}</p>
                </div>
              ))}
            </div>
          )}
          <p className="text-[13px] mt-3" style={{ color: "#8a8a8d" }}>
            {uk
              ? "Скопіюйте, відредагуйте, розмістіть самі — система нічого не публікує."
              : "Copy, edit, place them yourself — the system publishes nothing."}
          </p>
        </Section>
      </div>

      {data.notes.length > 0 && (
        <div className="lg:col-span-2">
          <div
            className="rounded-lg px-5 py-4 text-[13.5px]"
            style={{ border: "1px solid #ecdfc4", background: "#fdf9f0", color: "#8a5d16" }}
          >
            {data.notes.map((n) => (
              <p key={n} className="py-0.5">
                {planNoteLabel(n, uk)}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default async function AdminStrategistPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAdminPage(locale, "/admin/strategist");

  const uk = locale === "uk";
  const runs = await fetchAgentRuns("marketing_strategist", 8);
  const latest = runs?.[0] ?? null;
  const data = latest !== null && isCampaignPlan(latest.output) ? latest.output : null;

  return (
    <div className="min-h-screen pt-28 pb-24" style={{ background: "#f7f6f4" }}>
      <div className="page-container">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold mb-1" style={{ color: "#111" }}>
            {uk ? "Маркетинг-стратег" : "Marketing Strategist"}
          </h1>
          <p className="text-[14.5px] mb-4" style={{ color: "#707072" }}>
            {runs === null
              ? uk
                ? "Не вдалося прочитати журнал агентів."
                : "Couldn't read the agent log."
              : latest === null
                ? uk
                  ? "Ще жодного плану. Складіть перший — він лише читає і пропонує."
                  : "No plans yet. Draft the first — it only reads and suggests."
                : `${uk ? "Складено" : "Drafted"} ${new Date(latest.createdAt).toLocaleString(
                    uk ? "uk-UA" : "en-GB",
                    { timeZone: "Europe/Kyiv", dateStyle: "medium", timeStyle: "short" }
                  )} · ${latest.trigger === "cron" ? (uk ? "автоматично" : "scheduled") : latest.createdBy}`}
          </p>
          <GeneratePlanButton uk={uk} />
        </header>

        {runs === null && (
          <div
            className="rounded-lg px-5 py-4 text-[14px]"
            style={{ border: "1px solid #e6d4d2", background: "#fdf6f5", color: "#96322c" }}
          >
            {uk
              ? "Перевірте, чи виконано міграції 0019 та 0020 у Supabase, та чи задано SUPABASE_SERVICE_ROLE_KEY."
              : "Check that migrations 0019 and 0020 have been run in Supabase, and that SUPABASE_SERVICE_ROLE_KEY is set."}
          </div>
        )}

        {latest !== null && data === null && (
          <p className="text-[14.5px] mb-6" style={{ color: "#707072" }}>
            {uk
              ? "Останній запис створено старішою версією стратега і він не читається — складіть новий план."
              : "The latest run was generated by an earlier version of the strategist and can't be rendered — draft a fresh plan."}
          </p>
        )}

        {data !== null && <Plan data={data} uk={uk} locale={locale} />}

        {runs !== null && runs.length > 1 && (
          <div className="mt-8">
            <h2 className="text-[13px] font-medium tracking-[0.12em] uppercase mb-2" style={{ color: "#8a8a8d" }}>
              {uk ? "Попередні плани" : "Previous plans"}
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
