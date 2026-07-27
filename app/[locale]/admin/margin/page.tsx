import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-guard";
import { fetchAgentRuns } from "@/lib/agent-runs";
import { formatUah } from "@/lib/stock-display";
import { monthLabel } from "@/lib/finance-display";
import {
  isMarginReport,
  marginNoteLabel,
  marginVerdictLabel,
  marginVerdictTone,
  salesChannelLabel,
  type MarginAlert,
  type MarginReport,
} from "@/lib/margin-display";
import GenerateMarginButton from "@/components/admin/GenerateMarginButton";

/* ---------------------------------------------------------------------------
   Admin: the Cost & Margin Guard (§6.2).

   WHAT RENDERS HERE IS THE RECORD — the latest agent_runs row, exactly as
   generated, same as the Weekly Brief and the Strategist. And the record is
   all the agent produces: numbers to read and a list of things worth looking
   at. §6.2 is explicit that it "does not change prices automatically", and
   there is no price anywhere behind this page to change.

   IT REPORTS THE LAST FULL MONTH. The running month is on /admin/finance,
   where it is labelled as unfinished.
--------------------------------------------------------------------------- */

export const dynamic = "force-dynamic";

function pct(v: number | null): string {
  return v === null ? "—" : `${v.toFixed(1)}%`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="console-card px-6 py-5">
      <h2 className="console-label mb-3">{title}</h2>
      {children}
    </section>
  );
}

function alertText(a: MarginAlert, uk: boolean): string {
  switch (a.type) {
    case "below_cost":
      return uk
        ? `${a.nameUk} продається нижче собівартості — ${formatUah(a.grossUah)} (${pct(a.grossPct)}).`
        : `${a.nameEn} is selling below cost — ${formatUah(a.grossUah)} (${pct(a.grossPct)}).`;
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
        ? `Канал «${salesChannelLabel(a.channel, uk)}» у мінусі: ${formatUah(a.grossUah)}.`
        : `${salesChannelLabel(a.channel, uk)} is under water: ${formatUah(a.grossUah)}.`;
    case "month_loss":
      return uk
        ? `Місяць закрито зі збитком ${formatUah(a.marginUah)} після всіх витрат.`
        : `The month closed at a loss of ${formatUah(a.marginUah)} after all costs.`;
    case "ads_exceed_gross":
      return uk
        ? `Реклама (${formatUah(a.adSpendUah)}) перевищує валову маржу (${formatUah(a.grossUah)}).`
        : `Ad spend (${formatUah(a.adSpendUah)}) exceeds gross margin (${formatUah(a.grossUah)}).`;
  }
}

function alertTone(a: MarginAlert): { bg: string; fg: string } {
  switch (a.type) {
    case "below_cost":
    case "channel_below_cost":
    case "month_loss":
      return { bg: "var(--console-alert-soft)", fg: "var(--console-alert)" };
    default:
      return { bg: "var(--console-warn-soft)", fg: "var(--console-warn)" };
  }
}

function Report({ data, uk, locale }: { data: MarginReport; uk: boolean; locale: string }) {
  const t = data.totals;

  return (
    <div className="grid gap-4">
      {/* Alerts first — the reason the agent exists ---------------------- */}
      <Section title={uk ? "Сигнали" : "Alerts"}>
        {data.alerts.length === 0 ? (
          <p className="text-[14px]" style={{ color: "var(--console-muted)" }}>
            {uk
              ? "Нічого не просить уваги в цьому місяці."
              : "Nothing is asking for attention this month."}
          </p>
        ) : (
          <ul className="grid gap-1.5">
            {data.alerts.map((a, i) => {
              const tone = alertTone(a);
              return (
                <li
                  key={i}
                  className="rounded px-3 py-2 text-[13.5px]"
                  style={{ background: tone.bg, color: tone.fg }}
                >
                  {alertText(a, uk)}
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-[13px] mt-3" style={{ color: "var(--console-muted)" }}>
          {uk
            ? "Це спостереження, не дії. Ціни змінює людина (§6.2)."
            : "These are observations, not actions. Prices are changed by a human (§6.2)."}
        </p>
      </Section>

      {/* The month ------------------------------------------------------- */}
      <Section title={uk ? "Місяць" : "The month"}>
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-[14px]">
          {[
            [uk ? "Товари" : "Goods", t.revenueUah === null ? "—" : formatUah(t.revenueUah)],
            [uk ? "Доставка" : "Shipping", formatUah(t.shippingChargedUah)],
            [uk ? "Собівартість" : "COGS", t.cogsUah === null ? "—" : `−${formatUah(t.cogsUah)}`],
            [uk ? "Операційні" : "Opex", t.opexUah === null ? "—" : `−${formatUah(t.opexUah)}`],
            [uk ? "Комісії" : "Fees", t.feesUah === null ? "—" : formatUah(t.feesUah)],
            [uk ? "Реклама" : "Ads", t.adSpendUah === null ? "—" : formatUah(t.adSpendUah)],
          ].map(([label, value]) => (
            <div key={label}>
              <div className="console-label">{label}</div>
              <div className="tabular-nums" style={{ color: "var(--console-text)" }}>
                {value}
              </div>
            </div>
          ))}
          <div>
            <div className="console-label">{uk ? "Маржа" : "Margin"}</div>
            <div
              className="tabular-nums text-[16px] font-semibold"
              style={{ color: t.marginUah < 0 ? "var(--console-alert)" : "var(--console-text)" }}
            >
              {formatUah(t.marginUah)}
            </div>
          </div>
        </div>
        <p className="text-[13px] mt-3" style={{ color: "var(--console-muted)" }}>
          {uk
            ? "Комісії та реклама вже всередині операційних — показані окремо, щоб було видно їхній розмір."
            : "Fees and ads are already inside opex — shown separately so their size is visible."}
        </p>
      </Section>

      {/* Channels -------------------------------------------------------- */}
      <Section title={uk ? "Роздріб і опт" : "Retail and wholesale"}>
        <div className="overflow-x-auto">
          <table className="console-table">
            <thead>
              <tr>
                <th className="text-left">{uk ? "Канал" : "Channel"}</th>
                <th className="text-right">{uk ? "Замовлень" : "Orders"}</th>
                <th className="text-right">{uk ? "Шт" : "Units"}</th>
                <th className="text-right">{uk ? "Товари" : "Goods"}</th>
                <th className="text-right">{uk ? "Доставка" : "Shipping"}</th>
                <th className="text-right">{uk ? "Собівартість" : "COGS"}</th>
                <th className="text-right">{uk ? "Валова" : "Gross"}</th>
                <th className="text-right">%</th>
                <th className="text-left">{uk ? "Висновок" : "Verdict"}</th>
              </tr>
            </thead>
            <tbody>
              {data.channels.map((c) => {
                const tone = marginVerdictTone(c.verdict);
                return (
                  <tr key={c.channel}>
                    <td style={{ color: "var(--console-text)" }}>
                      {salesChannelLabel(c.channel, uk)}
                    </td>
                    <td className="text-right tabular-nums">{c.ordersCount}</td>
                    <td className="text-right tabular-nums">{c.units}</td>
                    <td className="text-right tabular-nums">
                      {c.revenueUah === null ? "—" : formatUah(c.revenueUah)}
                    </td>
                    <td className="text-right tabular-nums">{formatUah(c.shippingChargedUah)}</td>
                    <td className="text-right tabular-nums">
                      {c.cogsUah === null ? "†" : formatUah(c.cogsUah)}
                    </td>
                    <td className="text-right tabular-nums">
                      {c.grossUah === null ? "—" : formatUah(c.grossUah)}
                    </td>
                    <td className="text-right tabular-nums">{pct(c.grossPct)}</td>
                    <td>
                      <span
                        className="text-[11px] tracking-[0.1em] uppercase px-2 py-0.5 rounded"
                        style={{ background: tone.bg, color: tone.fg }}
                      >
                        {marginVerdictLabel(c.verdict, uk)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[13px] mt-3" style={{ color: "var(--console-muted)" }}>
          {uk
            ? "Валова маржа: товари + доставка − собівартість. Оренда, зарплати й реклама сюди не розподіляються — за який ключ їх ділити, чесної відповіді немає."
            : "Gross margin: goods + shipping − COGS. Rent, salaries and ads are not split across channels — there is no honest key to split them by."}
        </p>
      </Section>

      {/* Products -------------------------------------------------------- */}
      <Section title={uk ? "За товарами" : "By product"}>
        {data.products.length === 0 ? (
          <p className="text-[14px]" style={{ color: "var(--console-muted)" }}>
            {uk ? "Цього місяця нічого не продано." : "Nothing sold this month."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="console-table">
              <thead>
                <tr>
                  <th className="text-left">{uk ? "Товар" : "Product"}</th>
                  <th className="text-right">{uk ? "Шт" : "Units"}</th>
                  <th className="text-right">{uk ? "Дохід" : "Revenue"}</th>
                  <th className="text-right">{uk ? "Собівартість" : "COGS"}</th>
                  <th className="text-right">{uk ? "Валова" : "Gross"}</th>
                  <th className="text-right">%</th>
                  <th className="text-right">{uk ? "Середнє" : "Trailing"}</th>
                  <th className="text-left">{uk ? "Висновок" : "Verdict"}</th>
                </tr>
              </thead>
              <tbody>
                {data.products.map((p) => {
                  const tone = marginVerdictTone(p.verdict);
                  return (
                    <tr key={p.sku}>
                      <td>
                        <span style={{ color: "var(--console-text)" }}>{uk ? p.nameUk : p.nameEn}</span>
                        {p.uncostedLines > 0 && (
                          <span className="text-[12px] ml-2" style={{ color: "var(--console-warn)" }}>
                            †{p.uncostedLines}
                          </span>
                        )}
                      </td>
                      <td className="text-right tabular-nums">{p.units}</td>
                      <td className="text-right tabular-nums">
                        {p.revenueUah === null ? "—" : formatUah(p.revenueUah)}
                      </td>
                      <td className="text-right tabular-nums">
                        {p.cogsUah === null ? "—" : formatUah(p.cogsUah)}
                      </td>
                      <td
                        className="text-right tabular-nums"
                        style={{
                          color:
                            p.grossUah !== null && p.grossUah < 0
                              ? "var(--console-alert)"
                              : "var(--console-text)",
                        }}
                      >
                        {p.grossUah === null ? "—" : formatUah(p.grossUah)}
                      </td>
                      <td className="text-right tabular-nums">{pct(p.grossPct)}</td>
                      <td className="text-right tabular-nums" style={{ color: "var(--console-muted)" }}>
                        {pct(p.trailingPct)}
                      </td>
                      <td>
                        <span
                          className="text-[11px] tracking-[0.1em] uppercase px-2 py-0.5 rounded"
                          style={{ background: tone.bg, color: tone.fg }}
                        >
                          {marginVerdictLabel(p.verdict, uk)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {t.uncostedLines > 0 && (
          <p className="text-[13px] mt-3" style={{ color: "var(--console-warn)" }}>
            {uk
              ? `† ${t.uncostedLines} рядків без собівартості — їхній дохід враховано, витрати ні. `
              : `† ${t.uncostedLines} lines have no unit cost — their revenue counts, their cost doesn't. `}
            <Link href={`/${locale}/admin/costs`} className="underline underline-offset-2">
              {uk ? "Внести у «Витратах»" : "Enter them in Costs"}
            </Link>
          </p>
        )}
      </Section>

      {/* Caveats --------------------------------------------------------- */}
      {data.notes.length > 0 && (
        <div
          className="rounded-lg px-5 py-4 text-[13.5px]"
          style={{
            border: "1px solid rgba(212,160,23,0.35)",
            background: "var(--console-warn-soft)",
            color: "var(--console-warn)",
          }}
        >
          {data.notes.map((n) => (
            <p key={n} className="py-0.5">
              {marginNoteLabel(n, uk)}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export default async function AdminMarginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAdminPage(locale, "/admin/margin");

  const uk = locale === "uk";
  const runs = await fetchAgentRuns("cost_margin_guard", 8);
  const latest = runs?.[0] ?? null;
  const data = latest !== null && isMarginReport(latest.output) ? latest.output : null;

  return (
    <div className="min-h-screen pt-10 pb-24" style={{ background: "var(--console-bg-2)" }}>
      <div className="page-container">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold mb-1" style={{ color: "var(--console-text)" }}>
            {uk ? "Вартість і маржа" : "Cost & Margin Guard"}
          </h1>
          <p className="text-[14.5px] mb-4" style={{ color: "var(--console-muted)" }}>
            {runs === null
              ? uk
                ? "Не вдалося прочитати журнал агентів."
                : "Couldn't read the agent log."
              : latest === null
                ? uk
                  ? "Ще жодної перевірки. Запустіть першу — вона лише читає."
                  : "No checks yet. Run the first — it only reads."
                : `${uk ? "Перевірено" : "Checked"} ${new Date(latest.createdAt).toLocaleString(
                    uk ? "uk-UA" : "en-GB",
                    { timeZone: "Europe/Kyiv", dateStyle: "medium", timeStyle: "short" }
                  )} · ${latest.trigger === "cron" ? (uk ? "автоматично" : "scheduled") : latest.createdBy}${
                    data ? ` · ${monthLabel(data.month, uk)}` : ""
                  }`}
          </p>
          <GenerateMarginButton uk={uk} />
        </header>

        {runs === null && (
          <div
            className="rounded-lg px-5 py-4 text-[14px]"
            style={{
              border: "1px solid rgba(196,92,92,0.35)",
              background: "var(--console-alert-soft)",
              color: "var(--console-alert)",
            }}
          >
            {uk
              ? "Перевірте, чи виконано міграції 0019 та 0022 у Supabase, та чи задано SUPABASE_SERVICE_ROLE_KEY."
              : "Check that migrations 0019 and 0022 have been run in Supabase, and that SUPABASE_SERVICE_ROLE_KEY is set."}
          </div>
        )}

        {latest !== null && data === null && (
          <p className="text-[14.5px] mb-6" style={{ color: "var(--console-muted)" }}>
            {uk
              ? "Останній запис створено старішою версією агента і він не читається — запустіть перевірку заново."
              : "The latest run was generated by an earlier version of the guard and can't be rendered — run a fresh check."}
          </p>
        )}

        {data !== null && <Report data={data} uk={uk} locale={locale} />}

        {runs !== null && runs.length > 1 && (
          <div className="mt-8">
            <h2 className="console-label mb-2">{uk ? "Попередні перевірки" : "Previous checks"}</h2>
            <ul className="text-[13.5px]" style={{ color: "var(--console-muted)" }}>
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
