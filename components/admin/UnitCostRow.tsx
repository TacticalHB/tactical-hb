"use client";

import { useState } from "react";
import { saveUnitCost } from "@/app/actions/costs";
import { itemName, type StockItem } from "@/lib/stock-display";

/* ---------------------------------------------------------------------------
   What one unit costs us, for one sku.

   The date field is not decoration. Saving with today's date corrects today's
   figure; saving with a future date leaves every margin already calculated
   untouched and takes effect when it arrives. That is the difference between
   recording a cost change and rewriting history, so the control is visible
   rather than assumed.
--------------------------------------------------------------------------- */

export default function UnitCostRow({
  item,
  today,
  uk,
}: {
  item: StockItem;
  today: string;
  uk: boolean;
}) {
  const [cost, setCost] = useState(item.unitCostUah === null ? "" : String(item.unitCostUah));
  const [from, setFrom] = useState(today);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const L = {
    save: uk ? "Зберегти" : "Save",
    saving: uk ? "…" : "…",
    saved: uk ? "Збережено" : "Saved",
    cost: uk ? "₴ за одиницю" : "₴ per unit",
    from: uk ? "Діє з" : "From",
    note: uk ? "Примітка" : "Note",
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await saveUnitCost(item.sku, cost, from, note);
    setBusy(false);
    if (res.ok) {
      setDone(true);
      setNote("");
      setTimeout(() => setDone(false), 2500);
    } else setError(res.error);
  }

  const inputStyle: React.CSSProperties = {
    border: "1px solid var(--console-border)",
    color: "var(--console-text)",
    background: "var(--console-panel-2)",
  };

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-wrap items-center gap-2 px-5 py-3"
      style={{ borderTop: "1px solid var(--console-border)" }}
    >
      <div className="min-w-[210px] flex-1">
        <div className="text-[13.5px]" style={{ color: "var(--console-text)" }}>
          {itemName(item, uk)}
        </div>
        <div className="font-mono text-[11px]" style={{ color: "var(--console-faint)" }}>
          {item.sku}
        </div>
      </div>

      <input
        value={cost}
        onChange={(e) => setCost(e.target.value)}
        placeholder={L.cost}
        inputMode="decimal"
        autoComplete="off"
        aria-label={`${L.cost} — ${item.sku}`}
        className="h-9 px-3 text-[13px] rounded w-[110px] tabular-nums outline-none transition-colors focus:border-[color:var(--console-accent-line)]"
        style={inputStyle}
      />
      <input
        type="date"
        value={from}
        onChange={(e) => setFrom(e.target.value)}
        aria-label={`${L.from} — ${item.sku}`}
        className="h-9 px-3 text-[13px] rounded outline-none transition-colors focus:border-[color:var(--console-accent-line)]"
        style={inputStyle}
      />
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={L.note}
        autoComplete="off"
        aria-label={`${L.note} — ${item.sku}`}
        className="h-9 px-3 text-[13px] rounded w-[160px] outline-none transition-colors focus:border-[color:var(--console-accent-line)]"
        style={inputStyle}
      />
      <button
        type="submit"
        disabled={busy || !cost.trim()}
        className="h-9 px-4 text-[13px] rounded transition-opacity hover:opacity-85 disabled:opacity-40 disabled:cursor-default"
        style={{ background: "var(--console-accent)", color: "#14151a" }}
      >
        {busy ? L.saving : L.save}
      </button>

      {done && !error && (
        <span className="text-[12px]" style={{ color: "var(--console-ok)" }}>
          {L.saved}
        </span>
      )}
      {error && (
        <span className="text-[12px] basis-full" style={{ color: "var(--console-alert)" }}>
          {error}
        </span>
      )}
    </form>
  );
}
