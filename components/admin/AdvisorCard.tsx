"use client";

import { useState } from "react";
import { updateSupplySettings } from "@/app/actions/agents";
import {
  advisorStatusLabel,
  advisorStatusTone,
  formatCover,
  type AdvisorRow,
} from "@/lib/advisor-display";

/* ---------------------------------------------------------------------------
   One advisor line: the judgement, the numbers behind it, and the two
   planning knobs (lead time, batch size) the founder can set without leaving
   the page.

   The knobs are the ONLY thing this card can change, and they are settings
   about production, not stock — the action re-checks admin rights and writes
   two columns on stock_items, never a level. The suggestion itself has no
   button on purpose: acting on it means making things or ordering things,
   which happens in the workshop, and then logging the batch in /admin/stock
   when it lands. That is the approval gate, physically.
--------------------------------------------------------------------------- */

function Num({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <div className="text-[11px] tracking-[0.12em] uppercase mb-0.5" style={{ color: "#8a8a8d" }}>
        {label}
      </div>
      <div
        className={strong ? "text-[17px] font-semibold" : "text-[15px]"}
        style={{ color: "#111" }}
      >
        {value}
      </div>
    </div>
  );
}

export default function AdvisorCard({ row, uk }: { row: AdvisorRow; uk: boolean }) {
  const [open, setOpen] = useState(false);
  const [lead, setLead] = useState(row.leadTimeDays === null ? "" : String(row.leadTimeDays));
  const [batch, setBatch] = useState(row.batchSize === null ? "" : String(row.batchSize));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const tone = advisorStatusTone(row.status);
  const name = uk ? row.nameUk : row.nameEn;

  const save = async () => {
    setBusy(true);
    setError(null);
    setSaved(false);
    const res = await updateSupplySettings(row.sku, lead, batch);
    setBusy(false);
    if (!res.ok) setError(res.error);
    else setSaved(true);
  };

  return (
    <div className="rounded-lg px-5 py-4" style={{ border: "1px solid var(--border)", background: "#fff" }}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3">
        <span
          className="text-[11px] font-medium tracking-[0.08em] uppercase rounded px-2 py-0.5"
          style={{ background: tone.bg, color: tone.fg }}
        >
          {advisorStatusLabel(row.status, uk)}
        </span>
        <span className="text-[15.5px] font-medium" style={{ color: "#111" }}>
          {name}
        </span>
        <span className="text-[12.5px]" style={{ color: "#8a8a8d" }}>
          {row.sku}
        </span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-x-4 gap-y-3">
        <Num label={uk ? "На складі" : "On hand"} value={String(row.onHand)} />
        <Num label={uk ? "30 дн" : "30 d"} value={String(row.units30)} />
        <Num label={uk ? "60 / 90 дн" : "60 / 90 d"} value={`${row.units60} / ${row.units90}`} />
        <Num label={uk ? "Запасу" : "Cover"} value={formatCover(row.weeksOfCover, uk)} />
        <Num
          label={uk ? "Виготовити" : "Make"}
          value={row.suggested > 0 ? String(row.suggested) : "—"}
          strong={row.suggested > 0}
        />
        <div className="flex items-end">
          <button
            onClick={() => setOpen(!open)}
            className="text-[13px] underline underline-offset-2"
            style={{ color: "#707072" }}
          >
            {uk ? "Параметри" : "Settings"}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-4 pt-4 flex flex-wrap items-end gap-3" style={{ borderTop: "1px solid var(--border)" }}>
          <div>
            <label
              htmlFor={`lead-${row.sku}`}
              className="text-[11px] tracking-[0.12em] uppercase block mb-1"
              style={{ color: "#8a8a8d" }}
            >
              {uk ? "Виробництво, днів" : "Lead time, days"}
            </label>
            <input
              id={`lead-${row.sku}`}
              value={lead}
              onChange={(e) => setLead(e.target.value)}
              inputMode="numeric"
              placeholder="14"
              className="w-28 rounded px-3 py-2 text-[14px]"
              style={{ border: "1px solid var(--border-strong)", color: "#111", background: "#fff" }}
            />
          </div>
          <div>
            <label
              htmlFor={`batch-${row.sku}`}
              className="text-[11px] tracking-[0.12em] uppercase block mb-1"
              style={{ color: "#8a8a8d" }}
            >
              {uk ? "Кратність партії" : "Batch size"}
            </label>
            <input
              id={`batch-${row.sku}`}
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
              inputMode="numeric"
              placeholder="—"
              className="w-28 rounded px-3 py-2 text-[14px]"
              style={{ border: "1px solid var(--border-strong)", color: "#111", background: "#fff" }}
            />
          </div>
          <button
            onClick={save}
            disabled={busy}
            className="rounded px-4 py-2 text-[13.5px] font-medium disabled:opacity-50"
            style={{ background: "var(--ink)", color: "#fff" }}
          >
            {busy ? "…" : uk ? "Зберегти" : "Save"}
          </button>
          {saved && (
            <span className="text-[13px]" style={{ color: "#2f6b4f" }}>
              {uk ? "Збережено" : "Saved"}
            </span>
          )}
          {error && (
            <span className="text-[13px]" style={{ color: "#96322c" }}>
              {error}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
