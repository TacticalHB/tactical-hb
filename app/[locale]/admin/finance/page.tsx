import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-guard";
import {
  fetchCostBreakdown,
  fetchFinanceMonths,
  fetchProductMonth,
} from "@/lib/finance-admin";
import { monthHasGaps, monthLabel } from "@/lib/finance-display";
import { categoryLabel, currentPeriod, type CostCategory } from "@/lib/costs-display";
import { formatUah } from "@/lib/stock-display";

/* ---------------------------------------------------------------------------
   Admin: the finance snapshot.

   Everything on this page is a READ of the 0018 views — it cannot change a
   number, only report them. The dashes and daggers are deliberate: a month
   with unknown costs shows a gap marker, not a flattering zero, because a
   margin that quietly omits unknowns is the spreadsheet lie this module
   replaces (0018's header says why at length).

   Revenue here is money in (orders.amount_uah — shipping and discounts
   included). The product table below is merchandise (unit price × qty), and
   the two will not reconcile to the hryvnia. They are different questions.
--------------------------------------------------------------------------- */

export const dynamic = "force-dynamic";

function Dash() {
  return <span style={{ color: "var(--console-faint)" }}>—</span>;
}

export default async function AdminFinancePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { locale } = await params;
  const { month: requested } = await searchParams;
  await requireAdminPage(locale, "/admin/finance");

  const uk = locale === "uk";
  const month = /^\d{4}-\d{2}$/.test(requested ?? "") ? requested! : currentPeriod();

  const [months, breakdown, products] = await Promise.all([
    fetchFinanceMonths(12),
    fetchCostBreakdown(month),
    fetchProductMonth(month),
  ]);

  const failed = months === null || breakdown === null || products === null;
  const selected = (months ?? []).find((m) => m.month === month) ?? null;
  const anyGaps = (months ?? []).some(monthHasGaps);

  const csvBase = "/api/admin/finance/export";

  return (
    <div className="min-h-screen pt-10 pb-24" style={{ background: "var(--console-bg-2)" }}>
      <div className="page-container">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold mb-1" style={{ color: "var(--console-text)" }}>
              {uk ? "Фінанси" : "Finance"}
            </h1>
            <p className="text-[14.5px]" style={{ color: "var(--console-muted)" }}>
              {selected
                ? `${monthLabel(month, uk)} · ${
                    selected.revenueUah === null
                      ? uk
                        ? "виручка невідома"
                        : "revenue unknown"
                      : formatUah(selected.revenueUah)
                  } · ${uk ? "маржа" : "margin"} ${formatUah(selected.marginUah)}${
                    monthHasGaps(selected) ? " †" : ""
                  }`
                : monthLabel(month, uk)}
            </p>
          </div>
          <div className="flex gap-2">
            <a
              href={`${csvBase}?kind=orders`}
              className="h-9 px-4 inline-flex items-center text-[13px] rounded transition-opacity hover:opacity-85"
              style={{ border: "1px solid var(--console-border)", color: "var(--console-text)", background: "transparent" }}
            >
              {uk ? "CSV замовлень" : "Orders CSV"}
            </a>
            <a
              href={`${csvBase}?kind=costs`}
              className="h-9 px-4 inline-flex items-center text-[13px] rounded transition-opacity hover:opacity-85"
              style={{ border: "1px solid var(--console-border)", color: "var(--console-text)", background: "transparent" }}
            >
              {uk ? "CSV витрат" : "Costs CSV"}
            </a>
          </div>
        </header>

        {failed && (
          <div
            className="rounded-lg px-5 py-4 mb-6 text-[14px]"
            style={{ border: "1px solid rgba(196,92,92,0.35)", background: "var(--console-alert-soft)", color: "var(--console-alert)" }}
          >
            {uk
              ? "Перевірте, чи виконано міграцію 0018_finance_views.sql у Supabase."
              : "Check that migration 0018_finance_views.sql has been run in Supabase."}
          </div>
        )}

        {/* The months ------------------------------------------------------ */}
        {months !== null && months.length > 0 && (
          <section className="mb-8">
            <h2 className="text-[15px] font-medium mb-3" style={{ color: "var(--console-text)" }}>
              {uk ? "По місяцях" : "By month"}
            </h2>
            <div
              className="rounded-lg overflow-x-auto"
              style={{ border: "1px solid var(--console-border)", background: "var(--console-panel)" }}
            >
              <table className="w-full text-[13.5px]" style={{ minWidth: 640 }}>
                <thead>
                  <tr
                    className="text-left text-[11px] tracking-[0.1em] uppercase"
                    style={{ color: "var(--console-muted)" }}
                  >
                    <th className="px-5 py-3 font-medium">{uk ? "Місяць" : "Month"}</th>
                    <th className="px-3 py-3 font-medium text-right">{uk ? "Зам." : "Orders"}</th>
                    <th className="px-3 py-3 font-medium text-right">{uk ? "Виручка" : "Revenue"}</th>
                    <th className="px-3 py-3 font-medium text-right">
                      {uk ? "Собівартість" : "COGS"}
                    </th>
                    <th className="px-3 py-3 font-medium text-right">{uk ? "Витрати" : "Opex"}</th>
                    <th className="px-5 py-3 font-medium text-right">{uk ? "Маржа" : "Margin"}</th>
                  </tr>
                </thead>
                <tbody>
                  {months.map((m) => (
                    <tr key={m.month} style={{ borderTop: "1px solid var(--console-border)" }}>
                      <td className="px-5 py-3">
                        <Link
                          href={`/${locale}/admin/finance?month=${m.month}`}
                          className="underline-offset-2 hover:underline"
                          style={{
                            color: "var(--console-text)",
                            fontWeight: m.month === month ? 600 : 400,
                          }}
                        >
                          {monthLabel(m.month, uk)}
                        </Link>
                        {monthHasGaps(m) && (
                          <span title={uk ? "є прогалини в даних" : "data gaps"} style={{ color: "var(--console-warn)" }}>
                            {" "}
                            †
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums" style={{ color: "var(--console-muted)" }}>
                        {m.ordersCount}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums" style={{ color: "var(--console-text)" }}>
                        {m.revenueUah === null ? <Dash /> : formatUah(m.revenueUah)}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums" style={{ color: "var(--console-muted)" }}>
                        {m.cogsUah === null ? <Dash /> : formatUah(m.cogsUah)}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums" style={{ color: "var(--console-muted)" }}>
                        {m.opexUah === null ? <Dash /> : formatUah(m.opexUah)}
                      </td>
                      <td
                        className="px-5 py-3 text-right tabular-nums font-medium"
                        style={{ color: m.marginUah < 0 ? "var(--console-alert)" : "var(--console-text)" }}
                      >
                        {formatUah(m.marginUah)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {anyGaps && (
              <p className="mt-2 text-[12px]" style={{ color: "var(--console-warn)" }}>
                {uk
                  ? "† Місяць із прогалинами: замовлення без суми в гривні або позиції без собівартості. Підсумки охоплюють лише відоме."
                  : "† A month with gaps: orders missing a UAH amount, or lines without a unit cost. Totals cover only what is known."}
              </p>
            )}
          </section>
        )}

        {months !== null && months.length === 0 && (
          <p className="mb-8 text-[14.5px]" style={{ color: "var(--console-muted)" }}>
            {uk ? "Поки що немає ані замовлень, ані витрат." : "No orders or costs recorded yet."}
          </p>
        )}

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Operating costs, selected month ------------------------------- */}
          {breakdown !== null && (
            <section>
              <h2 className="text-[15px] font-medium mb-3" style={{ color: "var(--console-text)" }}>
                {uk ? "Витрати за категоріями" : "Costs by category"} · {monthLabel(month, uk)}
              </h2>
              {breakdown.length === 0 ? (
                <p className="text-[14.5px]" style={{ color: "var(--console-muted)" }}>
                  {uk ? "За цей місяць витрат не записано." : "No costs recorded for this month."}
                </p>
              ) : (
                <div
                  className="rounded-lg overflow-hidden"
                  style={{ border: "1px solid var(--console-border)", background: "var(--console-panel)" }}
                >
                  {breakdown.map((c) => (
                    <div
                      key={c.category}
                      className="flex items-baseline gap-x-4 px-5 py-3 text-[13.5px]"
                      style={{ borderTop: "1px solid var(--console-border)" }}
                    >
                      <span
                        className="text-[11px] tracking-[0.1em] uppercase px-2 py-0.5 rounded"
                        style={{ background: "var(--console-panel-2)", color: "var(--console-muted)" }}
                      >
                        {categoryLabel(c.category as CostCategory, uk)}
                      </span>
                      <span className="text-[12px]" style={{ color: "var(--console-faint)" }}>
                        ×{c.entries}
                      </span>
                      <span className="ml-auto tabular-nums font-medium" style={{ color: "var(--console-text)" }}>
                        {formatUah(c.totalUah)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Products, selected month -------------------------------------- */}
          {products !== null && (
            <section>
              <h2 className="text-[15px] font-medium mb-3" style={{ color: "var(--console-text)" }}>
                {uk ? "Товари" : "Products"} · {monthLabel(month, uk)}
              </h2>
              {products.length === 0 ? (
                <p className="text-[14.5px]" style={{ color: "var(--console-muted)" }}>
                  {uk ? "Продажів за цей місяць немає." : "No sales this month."}
                </p>
              ) : (
                <div
                  className="rounded-lg overflow-hidden"
                  style={{ border: "1px solid var(--console-border)", background: "var(--console-panel)" }}
                >
                  {products.map((p) => {
                    const margin =
                      p.revenueUah !== null && p.cogsUah !== null
                        ? p.revenueUah - p.cogsUah
                        : null;
                    return (
                      <div
                        key={p.sku}
                        className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-3 text-[13.5px]"
                        style={{ borderTop: "1px solid var(--console-border)" }}
                      >
                        <div className="min-w-[180px] flex-1">
                          <div style={{ color: "var(--console-text)" }}>{p.productName}</div>
                          <div className="font-mono text-[11px]" style={{ color: "var(--console-faint)" }}>
                            {p.sku}
                          </div>
                        </div>
                        <span className="tabular-nums" style={{ color: "var(--console-muted)" }}>
                          ×{p.units}
                        </span>
                        <span className="tabular-nums" style={{ color: "var(--console-text)" }}>
                          {p.revenueUah === null ? <Dash /> : formatUah(p.revenueUah)}
                        </span>
                        <span className="tabular-nums" style={{ color: "var(--console-muted)" }}>
                          {p.cogsUah === null ? (
                            <Dash />
                          ) : (
                            <>−{formatUah(p.cogsUah)}</>
                          )}
                        </span>
                        <span
                          className="tabular-nums font-medium"
                          style={{ color: margin !== null && margin < 0 ? "var(--console-alert)" : "var(--console-text)" }}
                        >
                          {margin === null ? (
                            <span title={uk ? "собівартість не внесено" : "unit cost missing"}>
                              †
                            </span>
                          ) : (
                            formatUah(margin)
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
              {products.some((p) => p.uncostedLines > 0) && (
                <p className="mt-2 text-[12px]" style={{ color: "var(--console-warn)" }}>
                  {uk
                    ? "† Внесіть собівартість у Витратах, датовану не пізніше замовлення — маржа зʼявиться сама."
                    : "† Enter a unit cost in Costs, dated on or before the order — the margin fills in by itself."}
                </p>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
