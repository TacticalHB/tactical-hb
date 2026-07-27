import { requireAdminPage } from "@/lib/admin-guard";
import { fetchAdSpend, fetchCreatives } from "@/lib/marketing-admin";
import {
  byCreativeRelevance,
  channelLabel,
  spendTotals,
} from "@/lib/marketing-display";
import { fetchStock } from "@/lib/stock-admin";
import { itemName, formatUah } from "@/lib/stock-display";
import { currentPeriod } from "@/lib/costs-display";
import CreativeForm, { type StockOption } from "@/components/admin/CreativeForm";
import CreativeCard from "@/components/admin/CreativeCard";
import AdSpendForm from "@/components/admin/AdSpendForm";
import AdSpendRow from "@/components/admin/AdSpendRow";

/* ---------------------------------------------------------------------------
   Admin: the marketing memory — creative library and ad spend tracker.

   Two diaries on one page, and no buttons that DO marketing anywhere: the
   money was spent elsewhere, the assets live elsewhere; this page is where
   the founder writes down what exists and what it cost, so the Marketing
   Strategist (/admin/strategist) has something honest to read (§6.4).
--------------------------------------------------------------------------- */

export const dynamic = "force-dynamic";

export default async function AdminMarketingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAdminPage(locale, "/admin/marketing");

  const uk = locale === "uk";
  const month = currentPeriod();

  const [creatives, spend, stock] = await Promise.all([
    fetchCreatives(),
    fetchAdSpend(),
    fetchStock(),
  ]);

  const stockOptions: StockOption[] = (stock ?? [])
    .filter((i) => i.kind === "product")
    .map((i) => ({ sku: i.sku, label: itemName(i, uk) }));

  const library = creatives === null ? null : [...creatives].sort(byCreativeRelevance);
  const activeCount = (library ?? []).filter((c) => c.status === "active").length;

  const totals = spend === null ? null : spendTotals(spend, month);

  return (
    <div className="min-h-screen pt-28 pb-24" style={{ background: "#f7f6f4" }}>
      <div className="page-container">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold mb-1" style={{ color: "#111" }}>
            {uk ? "Маркетинг" : "Marketing"}
          </h1>
          <p className="text-[14.5px]" style={{ color: "#707072" }}>
            {library === null
              ? uk
                ? "Не вдалося завантажити бібліотеку."
                : "Couldn't load the library."
              : uk
                ? `${activeCount} активних креативів · витрати ${month}: ${
                    totals === null ? "—" : formatUah(totals.totalUah)
                  }`
                : `${activeCount} active creative${activeCount === 1 ? "" : "s"} · ${month} spend: ${
                    totals === null ? "—" : formatUah(totals.totalUah)
                  }`}
          </p>
        </header>

        {(creatives === null || spend === null) && (
          <div
            className="rounded-lg px-5 py-4 mb-6 text-[14px]"
            style={{ border: "1px solid #e6d4d2", background: "#fdf6f5", color: "#96322c" }}
          >
            {uk
              ? "Перевірте, чи виконано міграцію 0020_marketing.sql у Supabase."
              : "Check that migration 0020_marketing.sql has been run in Supabase."}
          </div>
        )}

        {/* Creative library ------------------------------------------------ */}
        <section className="mb-12">
          <h2 className="text-[17px] font-semibold mb-3" style={{ color: "#111" }}>
            {uk ? "Бібліотека креативів" : "Creative library"}
          </h2>

          <div className="mb-4">
            <CreativeForm stockOptions={stockOptions} uk={uk} />
          </div>

          {library !== null && library.length === 0 && (
            <p className="text-[14.5px]" style={{ color: "#707072" }}>
              {uk
                ? "Бібліотека порожня. Додайте перший креатив вище."
                : "The library is empty. Add the first creative above."}
            </p>
          )}

          {library !== null && library.length > 0 && (
            <div
              className="rounded-lg overflow-hidden"
              style={{ border: "1px solid var(--border)", background: "#fff" }}
            >
              {library.map((c) => (
                <CreativeCard key={c.id} creative={c} stockOptions={stockOptions} uk={uk} />
              ))}
            </div>
          )}
        </section>

        {/* Ad spend --------------------------------------------------------- */}
        <section>
          <h2 className="text-[17px] font-semibold mb-1" style={{ color: "#111" }}>
            {uk ? "Витрати на рекламу" : "Ad spend"}
          </h2>
          {totals !== null && totals.byChannel.length > 0 && (
            <p className="mb-3 text-[13px]" style={{ color: "#707072" }}>
              {month}:{" "}
              {totals.byChannel
                .map((t) => `${channelLabel(t.channel, uk)} ${formatUah(t.amountUah)}`)
                .join(" · ")}
            </p>
          )}
          {totals !== null && totals.byChannel.length === 0 && (
            <p className="mb-3 text-[13px]" style={{ color: "#a3a3a6" }}>
              {uk ? `За ${month} ще нічого не записано.` : `Nothing recorded for ${month} yet.`}
            </p>
          )}

          <div className="mb-4">
            <AdSpendForm defaultMonth={month} uk={uk} />
          </div>

          {spend !== null && spend.length > 0 && (
            <div
              className="rounded-lg overflow-hidden"
              style={{ border: "1px solid var(--border)", background: "#fff" }}
            >
              {spend.map((s) => (
                <AdSpendRow key={s.id} entry={s} uk={uk} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
