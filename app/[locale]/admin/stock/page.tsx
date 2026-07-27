import { requireAdminPage } from "@/lib/admin-guard";
import { fetchStock } from "@/lib/stock-admin";
import { stockLevel, byUrgency, levelLabel } from "@/lib/stock-display";
import StockCard from "@/components/admin/StockCard";

/* ---------------------------------------------------------------------------
   Admin: what is on the shelf.

   Guarded twice over, like /admin/orders — this page 404s for non-admins, and
   each action re-checks independently, which is the real boundary.

   Read live on every request. A cached stock level is worse than no stock
   level: it reads as fact and quietly isn't one, five minutes after a sale.

   Ordered worst-first. Opening this page should put what needs doing at the
   top without anyone having to scan for it.
--------------------------------------------------------------------------- */

export const dynamic = "force-dynamic";

export default async function AdminStockPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAdminPage(locale, "/admin/stock");

  const uk = locale === "uk";
  const items = await fetchStock();
  const sorted = items === null ? null : [...items].sort(byUrgency);

  const counts =
    sorted === null
      ? null
      : sorted.reduce(
          (acc, i) => {
            acc[stockLevel(i)] += 1;
            return acc;
          },
          { critical: 0, low: 0, ok: 0 } as Record<"critical" | "low" | "ok", number>
        );

  return (
    <div className="min-h-screen pt-10 pb-24" style={{ background: "var(--console-bg-2)" }}>
      <div className="page-container">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold mb-1" style={{ color: "var(--console-text)" }}>
            {uk ? "Склад" : "Stock"}
          </h1>
          <p className="text-[14.5px]" style={{ color: "var(--console-muted)" }}>
            {counts === null
              ? uk
                ? "Не вдалося завантажити склад."
                : "Couldn't load stock."
              : `${levelLabel("critical", uk)} ${counts.critical} · ${levelLabel("low", uk)} ${counts.low} · ${levelLabel("ok", uk)} ${counts.ok}`}
          </p>
        </header>

        {items === null && (
          <div
            className="rounded-lg px-5 py-4 text-[14px]"
            style={{ border: "1px solid rgba(196,92,92,0.35)", background: "var(--console-alert-soft)", color: "var(--console-alert)" }}
          >
            {uk
              ? "Перевірте, чи виконано міграції 0015_stock.sql і 0016_costs.sql у Supabase, та чи задано SUPABASE_SERVICE_ROLE_KEY."
              : "Check that migrations 0015_stock.sql and 0016_costs.sql have been run in Supabase, and that SUPABASE_SERVICE_ROLE_KEY is set."}
          </div>
        )}

        {sorted !== null && sorted.length === 0 && (
          <p className="text-[14.5px]" style={{ color: "var(--console-muted)" }}>
            {uk ? "Жодної позиції складу." : "No stock lines yet."}
          </p>
        )}

        {sorted !== null && sorted.length > 0 && (
          <div className="flex flex-col gap-3">
            {sorted.map((item) => (
              <StockCard key={item.sku} item={item} uk={uk} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
