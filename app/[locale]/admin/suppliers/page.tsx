import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-guard";
import { fetchSuppliers } from "@/lib/suppliers-admin";
import { bySupplierOrder } from "@/lib/suppliers-display";
import { formatUah } from "@/lib/stock-display";
import SupplierForm from "@/components/admin/SupplierForm";
import SupplierCard from "@/components/admin/SupplierCard";

/* ---------------------------------------------------------------------------
   Admin: suppliers (0022, plan §4.2 and the §5 Suppliers & Costs department).

   A contact book with a lead time and a spend total. Nothing here is an agent
   and nothing here spends: a supplier record exists so that a cost can say who
   it was paid to, and so "how long does this take to arrive" stops living in
   someone's memory.

   0016 kept cost_entries.supplier as free text on purpose, and it stays. This
   page adds the records; the costs page lets a new entry point at one. Old
   entries are untouched — no name-matching backfill runs anywhere, because
   rewriting what was typed at the time is not a migration, it's a guess.
--------------------------------------------------------------------------- */

export const dynamic = "force-dynamic";

export default async function AdminSuppliersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAdminPage(locale, "/admin/suppliers");

  const uk = locale === "uk";
  const suppliers = await fetchSuppliers();
  const sorted = suppliers === null ? [] : [...suppliers].sort(bySupplierOrder);

  const totalSpend = sorted.reduce((a, s) => a + s.spendUah, 0);
  const linked = sorted.reduce((a, s) => a + s.costEntries, 0);

  return (
    <div className="min-h-screen pt-10 pb-24" style={{ background: "var(--console-bg-2)" }}>
      <div className="page-container">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold mb-1" style={{ color: "var(--console-text)" }}>
            {uk ? "Постачальники" : "Suppliers"}
          </h1>
          <p className="text-[14.5px]" style={{ color: "var(--console-muted)" }}>
            {suppliers === null
              ? uk
                ? "Не вдалося прочитати постачальників."
                : "Couldn't read the suppliers."
              : sorted.length === 0
                ? uk
                  ? "Ще жодного запису. Додайте першого — далі його можна буде обрати у «Витратах»."
                  : "No records yet. Add the first — then it can be picked on the Costs page."
                : uk
                  ? `${sorted.length} записів · ${formatUah(totalSpend)} у ${linked} витратах`
                  : `${sorted.length} records · ${formatUah(totalSpend)} across ${linked} cost entries`}
          </p>
        </header>

        {suppliers === null && (
          <div
            className="rounded-lg px-5 py-4 text-[14px] mb-6"
            style={{
              border: "1px solid rgba(196,92,92,0.35)",
              background: "var(--console-alert-soft)",
              color: "var(--console-alert)",
            }}
          >
            {uk
              ? "Перевірте, чи виконано міграцію 0022_suppliers_machines.sql у Supabase, та чи задано SUPABASE_SERVICE_ROLE_KEY."
              : "Check that migration 0022_suppliers_machines.sql has been run in Supabase, and that SUPABASE_SERVICE_ROLE_KEY is set."}
          </div>
        )}

        <div className="mb-6">
          <SupplierForm uk={uk} />
        </div>

        <div className="grid gap-3">
          {sorted.map((s) => (
            <SupplierCard key={s.id} supplier={s} uk={uk} />
          ))}
        </div>

        {sorted.length > 0 && (
          <p className="text-[13px] mt-6" style={{ color: "var(--console-muted)" }}>
            {uk
              ? "Суми рахують лише витрати, привʼязані до запису. Старі рядки з назвою, введеною вручну, залишаються як були — "
              : "Totals count only costs linked to a record. Older rows with a hand-typed name stay as they were — "}
            <Link href={`/${locale}/admin/costs`} className="underline underline-offset-2">
              {uk ? "Витрати" : "Costs"}
            </Link>
            {uk ? " показує і ті, і ті." : " shows both."}
          </p>
        )}
      </div>
    </div>
  );
}
