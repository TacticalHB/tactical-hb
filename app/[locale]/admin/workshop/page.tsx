import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-guard";
import { fetchWorkshop } from "@/lib/machines-admin";
import { fetchSupplierOptions } from "@/lib/suppliers-admin";
import { fetchStock } from "@/lib/stock-admin";
import { formatUah, itemName } from "@/lib/stock-display";
import {
  byMachineOrder,
  carryVerdict,
  carryVerdictLabel,
  carryVerdictTone,
  formatMinutes,
} from "@/lib/machines-display";
import MachineForm from "@/components/admin/MachineForm";
import MachineCard from "@/components/admin/MachineCard";
import MachineTimeForm from "@/components/admin/MachineTimeForm";

/* ---------------------------------------------------------------------------
   Admin: the Workshop (0022, plan §5).

   The machine register, what an hour on each costs, and — the point of the
   whole page — whether the products that book time on them are carrying it.

   EVERY NUMBER HERE IS A PLANNING FIGURE. Nothing on this page has been
   subtracted from a margin, because the purchase is already real money in
   cost_entries and counting it twice would flatter the accounts. The
   comparison table exists to prompt a decision, and the decision is made in
   /admin/costs by entering a dated unit cost by hand. That link IS the
   approval gate; there is deliberately no button here that skips it.
--------------------------------------------------------------------------- */

export const dynamic = "force-dynamic";

export default async function AdminWorkshopPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAdminPage(locale, "/admin/workshop");

  const uk = locale === "uk";
  const [workshop, suppliers, stock] = await Promise.all([
    fetchWorkshop(),
    fetchSupplierOptions(),
    fetchStock(),
  ]);

  const machines = workshop === null ? [] : [...workshop.machines].sort(byMachineOrder);
  const rated = machines.filter((m) => m.hourlyCostUah !== null).length;

  const skuOptions = (stock ?? []).map((s) => ({ sku: s.sku, name: itemName(s, uk) }));
  const machineOptions = machines.map((m) => ({ id: m.id, name: m.name }));

  return (
    <div className="min-h-screen pt-10 pb-24" style={{ background: "var(--console-bg-2)" }}>
      <div className="page-container">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold mb-1" style={{ color: "var(--console-text)" }}>
            {uk ? "Майстерня" : "Workshop"}
          </h1>
          <p className="text-[14.5px]" style={{ color: "var(--console-muted)" }}>
            {workshop === null
              ? uk
                ? "Не вдалося прочитати майстерню."
                : "Couldn't read the workshop."
              : machines.length === 0
                ? uk
                  ? "Ще жодної машини. Додайте першу — ставка порахується з того, що ви заповните."
                  : "No machines yet. Add the first — the rate is computed from whatever you fill in."
                : uk
                  ? `${machines.length} машин · ставка відома для ${rated}`
                  : `${machines.length} machines · rate known for ${rated}`}
          </p>
        </header>

        {workshop === null && (
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
          <MachineForm suppliers={suppliers ?? []} uk={uk} />
        </div>

        <div className="grid gap-3 mb-8">
          {machines.map((m) => (
            <MachineCard
              key={m.id}
              machine={m}
              times={Object.values(workshop?.timesBySku ?? {})
                .flat()
                .filter((t) => t.machineId === m.id)}
              suppliers={suppliers ?? []}
              uk={uk}
            />
          ))}
        </div>

        <div className="mb-6">
          <MachineTimeForm skus={skuOptions} machines={machineOptions} uk={uk} />
        </div>

        {/* The comparison ------------------------------------------------- */}
        {workshop !== null && workshop.skuCosts.length > 0 && (
          <section className="console-card px-5 py-4">
            <div className="console-label mb-3">
              {uk ? "Час машин проти внесеної собівартості" : "Machine time against entered unit cost"}
            </div>

            <div className="overflow-x-auto">
              <table className="console-table">
                <thead>
                  <tr>
                    <th className="text-left">{uk ? "Товар" : "Product"}</th>
                    <th className="text-right">{uk ? "Час" : "Time"}</th>
                    <th className="text-right">{uk ? "Машина, ₴/шт" : "Machine, ₴/unit"}</th>
                    <th className="text-right">{uk ? "Внесено, ₴/шт" : "Entered, ₴/unit"}</th>
                    <th className="text-left">{uk ? "Висновок" : "Verdict"}</th>
                  </tr>
                </thead>
                <tbody>
                  {workshop.skuCosts.map((row) => {
                    const verdict = carryVerdict(row);
                    const tone = carryVerdictTone(verdict);
                    return (
                      <tr key={row.sku}>
                        <td>
                          <span style={{ color: "var(--console-text)" }}>
                            {uk ? row.nameUk : row.nameEn}
                          </span>
                          {row.machinesMissingRate > 0 && (
                            <span className="text-[12px] ml-2" style={{ color: "var(--console-warn)" }}>
                              {uk
                                ? `${row.machinesMissingRate} без ставки`
                                : `${row.machinesMissingRate} without a rate`}
                            </span>
                          )}
                        </td>
                        <td className="text-right tabular-nums">
                          {formatMinutes(row.minutesPerUnit, uk)}
                        </td>
                        <td className="text-right tabular-nums">
                          {row.machineCostPerUnitUah === null
                            ? "—"
                            : formatUah(row.machineCostPerUnitUah)}
                        </td>
                        <td className="text-right tabular-nums">
                          {row.enteredUnitCostUah === null ? "—" : formatUah(row.enteredUnitCostUah)}
                        </td>
                        <td>
                          <span
                            className="text-[11px] tracking-[0.1em] uppercase px-2 py-0.5 rounded"
                            style={{ background: tone.bg, color: tone.fg }}
                          >
                            {carryVerdictLabel(verdict, uk)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="text-[13px] mt-4" style={{ color: "var(--console-muted)" }}>
              {uk
                ? "Ці суми ніде не враховані. Щоб час машини потрапив у маржу, внесіть собівартість з датою у "
                : "None of these figures is counted anywhere. To put machine time into margin, enter a dated unit cost in "}
              <Link href={`/${locale}/admin/costs`} className="underline underline-offset-2">
                {uk ? "«Витратах»" : "Costs"}
              </Link>
              {uk
                ? " — і тоді приберіть купівлю машини з витрат, інакше вона порахується двічі."
                : " — and then take the machine purchase out of cost entries, or it counts twice."}
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
