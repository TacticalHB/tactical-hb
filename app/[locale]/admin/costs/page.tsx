import { requireAdminPage } from "@/lib/admin-guard";
import { fetchStock } from "@/lib/stock-admin";
import { itemName, formatUah } from "@/lib/stock-display";
import { fetchCostEntries } from "@/lib/costs-admin";
import { categoryLabel, currentPeriod } from "@/lib/costs-display";
import CostEntryForm from "@/components/admin/CostEntryForm";
import UnitCostRow from "@/components/admin/UnitCostRow";

/* ---------------------------------------------------------------------------
   Admin: what the business spends.

   Phase A CAPTURES costs; it does not compute margin. That is Phase B, and it
   will read product_costs by the date of each order — which is exactly why
   unit costs are entered with an effective date rather than edited in place.

   Two halves, because they are two different kinds of number. A unit cost
   belongs to a product and is per-item. A cost entry belongs to a month and is
   an amount of money. Mixing them into one table is how a spreadsheet ends up
   double-counting the same hryvnia.
--------------------------------------------------------------------------- */

export const dynamic = "force-dynamic";

export default async function AdminCostsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const { locale } = await params;
  const { period: requested } = await searchParams;
  await requireAdminPage(locale, "/admin/costs");

  const uk = locale === "uk";
  const period = /^\d{4}-\d{2}$/.test(requested ?? "") ? requested! : currentPeriod();
  const today = new Date().toISOString().slice(0, 10);

  const [items, entries] = await Promise.all([fetchStock(), fetchCostEntries(period)]);

  const monthTotal = (entries ?? []).reduce((s, e) => s + e.amountUah, 0);
  const skuOptions = (items ?? []).map((i) => ({ sku: i.sku, name: itemName(i, uk) }));

  return (
    <div className="min-h-screen pt-28 pb-24" style={{ background: "#f7f6f4" }}>
      <div className="page-container">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold mb-1" style={{ color: "#111" }}>
            {uk ? "Витрати" : "Costs"}
          </h1>
          <p className="text-[14.5px]" style={{ color: "#707072" }}>
            {entries === null
              ? uk
                ? "Не вдалося завантажити витрати."
                : "Couldn't load costs."
              : `${period} · ${formatUah(monthTotal)}`}
          </p>
        </header>

        {(items === null || entries === null) && (
          <div
            className="rounded-lg px-5 py-4 mb-6 text-[14px]"
            style={{ border: "1px solid #e6d4d2", background: "#fdf6f5", color: "#96322c" }}
          >
            {uk
              ? "Перевірте, чи виконано міграції 0015_stock.sql і 0016_costs.sql у Supabase."
              : "Check that migrations 0015_stock.sql and 0016_costs.sql have been run in Supabase."}
          </div>
        )}

        <div className="mb-8">
          <CostEntryForm today={today} skus={skuOptions} uk={uk} />
        </div>

        {/* Unit costs -------------------------------------------------------- */}
        {items !== null && items.length > 0 && (
          <section className="mb-8">
            <h2 className="text-[15px] font-medium mb-3" style={{ color: "#111" }}>
              {uk ? "Собівартість одиниці" : "Unit costs"}
            </h2>
            <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)", background: "#fff" }}>
              {items.map((item) => (
                <UnitCostRow key={item.sku} item={item} today={today} uk={uk} />
              ))}
            </div>
          </section>
        )}

        {/* Cost entries ------------------------------------------------------ */}
        <section>
          <h2 className="text-[15px] font-medium mb-3" style={{ color: "#111" }}>
            {uk ? "Операційні витрати" : "Operating costs"}
          </h2>

          {entries !== null && entries.length === 0 && (
            <p className="text-[14.5px]" style={{ color: "#707072" }}>
              {uk ? "За цей місяць витрат не записано." : "No costs recorded for this month."}
            </p>
          )}

          {entries !== null && entries.length > 0 && (
            <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)", background: "#fff" }}>
              {entries.map((e) => (
                <div
                  key={e.id}
                  className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-3 text-[13.5px]"
                  style={{ borderTop: "1px solid var(--border)" }}
                >
                  <span className="w-[7.5ch] tabular-nums" style={{ color: "#8a8a8d" }}>
                    {e.incurredOn.slice(5)}
                  </span>
                  <span
                    className="text-[11px] tracking-[0.1em] uppercase px-2 py-0.5 rounded"
                    style={{ background: "#f1efe8", color: "#6f6d66" }}
                  >
                    {categoryLabel(e.category, uk)}
                  </span>
                  {e.supplier && <span style={{ color: "#4a4a4d" }}>{e.supplier}</span>}
                  {e.note && <span style={{ color: "#8a8a8d" }}>{e.note}</span>}
                  {e.period && (
                    <span className="text-[11.5px]" style={{ color: "#a3a3a6" }}>
                      {uk ? "щомісяця" : "monthly"}
                    </span>
                  )}
                  <span className="ml-auto tabular-nums font-medium" style={{ color: "#111" }}>
                    {formatUah(e.amountUah)}
                    {e.amountEur !== null && (
                      <span className="font-normal ml-2" style={{ color: "#8a8a8d" }}>
                        €{e.amountEur.toFixed(2)}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
