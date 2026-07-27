import { requireAdminPage } from "@/lib/admin-guard";
import { fetchAdvisorRows } from "@/lib/advisor-admin";
import { byAdvisorUrgency, advisorStatusLabel, type AdvisorStatus } from "@/lib/advisor-display";
import AdvisorCard from "@/components/admin/AdvisorCard";

/* ---------------------------------------------------------------------------
   Admin: the Stock Advisor — Phase C's first agent.

   READ-ONLY BY CONSTRUCTION. This page computes; it cannot move stock, and
   neither can anything it calls — levels change only on paid orders and
   manual batches (0015), and acting on a suggestion means making things and
   logging the batch in /admin/stock. The one write reachable from here sets
   the two planning knobs (lead time, batch size) on a line.

   Computed live on every request, like /admin/stock and for the same reason:
   a cached recommendation is a stale opinion presented as a current one.
   Nothing is logged from a page view — the audit rows in agent_runs come
   from the weekly runs (cron or the button in /admin/brief), where advice
   becomes a record because it was actually delivered.
--------------------------------------------------------------------------- */

export const dynamic = "force-dynamic";

export default async function AdminAdvisorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAdminPage(locale, "/admin/advisor");

  const uk = locale === "uk";
  const rows = await fetchAdvisorRows();
  const sorted = rows === null ? null : [...rows].sort(byAdvisorUrgency);

  const counts =
    sorted === null
      ? null
      : sorted.reduce(
          (acc, r) => {
            acc[r.status] += 1;
            return acc;
          },
          { critical: 0, low: 0, ok: 0, overstock: 0 } as Record<AdvisorStatus, number>
        );

  const toMake = sorted === null ? 0 : sorted.filter((r) => r.suggested > 0).length;

  return (
    <div className="min-h-screen pt-10 pb-24" style={{ background: "#f7f6f4" }}>
      <div className="page-container">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold mb-1" style={{ color: "#111" }}>
            {uk ? "Радник складу" : "Stock Advisor"}
          </h1>
          <p className="text-[14.5px]" style={{ color: "#707072" }}>
            {counts === null
              ? uk
                ? "Не вдалося зібрати рекомендації."
                : "Couldn't build the recommendations."
              : `${advisorStatusLabel("critical", uk)} ${counts.critical} · ${advisorStatusLabel("low", uk)} ${counts.low} · ${advisorStatusLabel("ok", uk)} ${counts.ok} · ${advisorStatusLabel("overstock", uk)} ${counts.overstock}` +
                (toMake > 0
                  ? uk
                    ? ` — ${toMake} ${toMake === 1 ? "пропозиція" : "пропозицій"} виробництва`
                    : ` — ${toMake} production suggestion${toMake === 1 ? "" : "s"}`
                  : "")}
          </p>
          <p className="text-[13px] mt-2" style={{ color: "#8a8a8d" }}>
            {uk
              ? "Радник лише рекомендує: залишки змінюються тільки оплаченими замовленнями та партіями у «Складі». Швидкість продажів — оплачені одиниці за 30/60/90 днів."
              : "The advisor only recommends: levels change only through paid orders and batches in Stock. Velocity is paid units over the last 30/60/90 days."}
          </p>
        </header>

        {sorted === null && (
          <div
            className="rounded-lg px-5 py-4 text-[14px]"
            style={{ border: "1px solid #e6d4d2", background: "#fdf6f5", color: "#96322c" }}
          >
            {uk
              ? "Перевірте, чи виконано міграції до 0019_agents.sql включно у Supabase, та чи задано SUPABASE_SERVICE_ROLE_KEY."
              : "Check that migrations up to and including 0019_agents.sql have been run in Supabase, and that SUPABASE_SERVICE_ROLE_KEY is set."}
          </div>
        )}

        {sorted !== null && sorted.length === 0 && (
          <p className="text-[14.5px]" style={{ color: "#707072" }}>
            {uk ? "Жодної позиції складу." : "No stock lines yet."}
          </p>
        )}

        {sorted !== null && sorted.length > 0 && (
          <div className="flex flex-col gap-3">
            {sorted.map((row) => (
              <AdvisorCard key={row.sku} row={row} uk={uk} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
