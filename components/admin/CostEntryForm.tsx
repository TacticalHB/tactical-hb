"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createCostEntry } from "@/app/actions/costs";
import { COST_CATEGORIES, categoryLabel, type CostCategory } from "@/lib/costs-display";

/* ---------------------------------------------------------------------------
   Record an operating cost.

   UAH is the field that matters; the euro box is for bills that genuinely
   arrive in euro (imports, ad platforms) and is left empty otherwise. Nothing
   converts one into the other — a converted number would look like a fact and
   really be this week's exchange rate.

   "Recurring monthly" stamps the entry with its YYYY-MM. That flag is what
   later lets "what does a month cost us" be answered without guessing which
   rows repeat, so it is asked once, here, rather than inferred afterwards.
--------------------------------------------------------------------------- */

export default function CostEntryForm({
  today,
  skus,
  uk,
}: {
  today: string;
  skus: { sku: string; name: string }[];
  uk: boolean;
}) {
  const router = useRouter();

  const [category, setCategory] = useState<CostCategory>("materials");
  const [amountUah, setAmountUah] = useState("");
  const [amountEur, setAmountEur] = useState("");
  const [incurredOn, setIncurredOn] = useState(today);
  const [recurring, setRecurring] = useState(false);
  const [supplier, setSupplier] = useState("");
  const [sku, setSku] = useState("");
  const [note, setNote] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const L = {
    title: uk ? "Додати витрату" : "Add a cost",
    category: uk ? "Категорія" : "Category",
    uah: uk ? "Сума, ₴" : "Amount, ₴",
    eur: uk ? "Рахунок у €" : "Invoiced in €",
    date: uk ? "Дата" : "Date",
    recurring: uk ? "Щомісячна" : "Recurring monthly",
    supplier: uk ? "Постачальник" : "Supplier",
    product: uk ? "Товар (необов'язково)" : "Product (optional)",
    general: uk ? "Загальні витрати" : "General overhead",
    note: uk ? "Примітка" : "Note",
    add: uk ? "Додати" : "Add",
    adding: uk ? "…" : "…",
  };

  const inputStyle: React.CSSProperties = {
    border: "1px solid var(--console-border)",
    color: "var(--console-text)",
    background: "var(--console-panel-2)",
  };
  const cls =
    "h-9 px-3 text-[13px] rounded w-full outline-none transition-colors focus:border-[color:var(--console-accent-line)]";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await createCostEntry({
      category,
      amountUah,
      amountEur,
      incurredOn,
      recurring,
      supplier,
      sku,
      note,
    });
    setBusy(false);
    if (res.ok) {
      setAmountUah("");
      setAmountEur("");
      setSupplier("");
      setNote("");
      // The list is rendered on the server, so ask for it again rather than
      // splicing an optimistic row that might not match what was stored.
      router.refresh();
    } else setError(res.error);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-lg px-5 py-5"
      style={{ border: "1px solid var(--console-border)", background: "var(--console-panel)" }}
    >
      <h2 className="text-[15px] font-medium mb-4" style={{ color: "var(--console-text)" }}>
        {L.title}
      </h2>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="text-[11px] tracking-[0.12em] uppercase block mb-1" style={{ color: "var(--console-muted)" }}>
            {L.category}
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as CostCategory)}
            className={cls}
            style={inputStyle}
          >
            {COST_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {categoryLabel(c, uk)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] tracking-[0.12em] uppercase block mb-1" style={{ color: "var(--console-muted)" }}>
            {L.uah}
          </label>
          <input
            value={amountUah}
            onChange={(e) => setAmountUah(e.target.value)}
            inputMode="decimal"
            autoComplete="off"
            className={`${cls} tabular-nums`}
            style={inputStyle}
          />
        </div>

        <div>
          <label className="text-[11px] tracking-[0.12em] uppercase block mb-1" style={{ color: "var(--console-muted)" }}>
            {L.eur}
          </label>
          <input
            value={amountEur}
            onChange={(e) => setAmountEur(e.target.value)}
            inputMode="decimal"
            autoComplete="off"
            className={`${cls} tabular-nums`}
            style={inputStyle}
          />
        </div>

        <div>
          <label className="text-[11px] tracking-[0.12em] uppercase block mb-1" style={{ color: "var(--console-muted)" }}>
            {L.date}
          </label>
          <input
            type="date"
            value={incurredOn}
            onChange={(e) => setIncurredOn(e.target.value)}
            className={cls}
            style={inputStyle}
          />
        </div>

        <div>
          <label className="text-[11px] tracking-[0.12em] uppercase block mb-1" style={{ color: "var(--console-muted)" }}>
            {L.supplier}
          </label>
          <input
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            autoComplete="off"
            className={cls}
            style={inputStyle}
          />
        </div>

        <div>
          <label className="text-[11px] tracking-[0.12em] uppercase block mb-1" style={{ color: "var(--console-muted)" }}>
            {L.product}
          </label>
          <select value={sku} onChange={(e) => setSku(e.target.value)} className={cls} style={inputStyle}>
            <option value="">{L.general}</option>
            {skus.map((s) => (
              <option key={s.sku} value={s.sku}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-2">
          <label className="text-[11px] tracking-[0.12em] uppercase block mb-1" style={{ color: "var(--console-muted)" }}>
            {L.note}
          </label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            autoComplete="off"
            className={cls}
            style={inputStyle}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 mt-4">
        <label className="flex items-center gap-2 text-[13px]" style={{ color: "var(--console-muted)" }}>
          <input
            type="checkbox"
            checked={recurring}
            onChange={(e) => setRecurring(e.target.checked)}
            className="w-4 h-4"
          />
          {L.recurring}
        </label>

        <button
          type="submit"
          disabled={busy || !amountUah.trim()}
          className="h-9 px-5 text-[13px] rounded transition-opacity hover:opacity-85 disabled:opacity-40 disabled:cursor-default"
          style={{ background: "var(--console-accent)", color: "#14151a" }}
        >
          {busy ? L.adding : L.add}
        </button>

        {error && (
          <span className="text-[12.5px]" style={{ color: "var(--console-alert)" }}>
            {error}
          </span>
        )}
      </div>
    </form>
  );
}
