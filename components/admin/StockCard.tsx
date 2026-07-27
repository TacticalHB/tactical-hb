"use client";

import { useState } from "react";
import { receiveStock, correctStock, updateThresholds } from "@/app/actions/stock";
import {
  stockLevel,
  levelLabel,
  reasonLabel,
  itemName,
  formatUah,
  type StockItem,
} from "@/lib/stock-display";
import { formatWhen } from "@/lib/orders-display";

/* ---------------------------------------------------------------------------
   One stock line, and the two ways to move it.

   The forms are a convenience; the actions re-check admin rights server-side,
   so this component is not the security boundary.

   RECEIVING and CORRECTING are separated on purpose, and they ask for
   different things. Receiving asks "how many arrived" — a delta, because that
   is what the delivery note says. Correcting asks "how many are actually
   there" — a total, because the admin has just counted the shelf and making
   them subtract is inviting an arithmetic error into the ledger. Both end up
   as a movement either way.
--------------------------------------------------------------------------- */

const TONE: Record<string, { bg: string; fg: string }> = {
  critical: { bg: "var(--console-alert-soft)", fg: "var(--console-alert)" },
  low: { bg: "var(--console-warn-soft)", fg: "var(--console-warn)" },
  ok: { bg: "var(--console-ok-soft)", fg: "var(--console-ok)" },
};

function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-[11px] tracking-[0.12em] uppercase block mb-1"
      style={{ color: "var(--console-muted)" }}
    >
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  border: "1px solid var(--console-border)",
  color: "var(--console-text)",
  background: "var(--console-panel-2)",
};

export default function StockCard({ item, uk }: { item: StockItem; uk: boolean }) {
  const [onHand, setOnHand] = useState(item.onHand);
  const [critical, setCritical] = useState(String(item.criticalLevel));
  const [reorder, setReorder] = useState(String(item.reorderLevel));

  const [qty, setQty] = useState("");
  const [receiveNote, setReceiveNote] = useState("");
  const [counted, setCounted] = useState("");
  const [correctNote, setCorrectNote] = useState("");

  const [busy, setBusy] = useState<null | "receive" | "correct" | "thresholds">(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const level = stockLevel({ onHand, criticalLevel: Number(critical) || 0, reorderLevel: Number(reorder) || 0 });
  const tone = TONE[level];

  const L = {
    onHand: uk ? "На складі" : "On hand",
    receive: uk ? "Прийняти партію" : "Receive batch",
    qty: uk ? "Кількість" : "Quantity",
    note: uk ? "Примітка" : "Note",
    save: uk ? "Зберегти" : "Save",
    add: uk ? "Додати" : "Add",
    correct: uk ? "Коригувати" : "Correct",
    counted: uk ? "Фактично на полиці" : "Counted on the shelf",
    why: uk ? "Причина (обов'язково)" : "Reason (required)",
    apply: uk ? "Застосувати" : "Apply",
    thresholds: uk ? "Пороги" : "Thresholds",
    critical: uk ? "Критично при" : "Critical at",
    reorder: uk ? "Мало при" : "Low at",
    history: uk ? "Рух" : "Movements",
    noHistory: uk ? "Ще без руху." : "No movements yet.",
    unitCost: uk ? "Собівартість" : "Unit cost",
    noCost: uk ? "не задано" : "not set",
    show: uk ? "Показати" : "Open",
    hide: uk ? "Згорнути" : "Close",
    saving: uk ? "…" : "…",
    part: uk ? "деталь" : "part",
  };

  function flash(msg: string) {
    setDone(msg);
    setError(null);
    setTimeout(() => setDone(null), 2500);
  }

  async function onReceive(e: React.FormEvent) {
    e.preventDefault();
    setBusy("receive");
    const res = await receiveStock(item.sku, qty, "batch", receiveNote);
    setBusy(null);
    if (res.ok) {
      setOnHand(res.onHand);
      setQty("");
      setReceiveNote("");
      flash(uk ? "Прийнято" : "Received");
    } else setError(res.error);
  }

  async function onCorrect(e: React.FormEvent) {
    e.preventDefault();
    setBusy("correct");
    const res = await correctStock(item.sku, counted, onHand, "correction", correctNote);
    setBusy(null);
    if (res.ok) {
      setOnHand(res.onHand);
      setCounted("");
      setCorrectNote("");
      flash(uk ? "Скориговано" : "Corrected");
    } else setError(res.error);
  }

  async function onThresholds(e: React.FormEvent) {
    e.preventDefault();
    setBusy("thresholds");
    const res = await updateThresholds(item.sku, critical, reorder);
    setBusy(null);
    if (res.ok) flash(uk ? "Пороги збережено" : "Thresholds saved");
    else setError(res.error);
  }

  return (
    <article className="rounded-lg" style={{ border: "1px solid var(--console-border)", background: "var(--console-panel)" }}>
      <header
        className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3.5"
        style={{ borderBottom: open ? "1px solid var(--console-border)" : "none", background: "var(--console-panel-2)" }}
      >
        <span className="text-[14.5px] font-medium" style={{ color: "var(--console-text)" }}>
          {itemName(item, uk)}
        </span>
        {item.kind === "part" && (
          <span className="text-[11px] px-2 py-0.5 rounded" style={{ background: "var(--console-panel-2)", color: "var(--console-muted)" }}>
            {L.part}
          </span>
        )}
        <span className="font-mono text-[11.5px]" style={{ color: "var(--console-faint)" }}>
          {item.sku}
        </span>

        <span className="ml-auto text-[12px]" style={{ color: "var(--console-muted)" }}>
          {L.unitCost}:{" "}
          {item.unitCostUah === null ? (
            <span style={{ color: "var(--console-muted)" }}>{L.noCost}</span>
          ) : (
            formatUah(item.unitCostUah)
          )}
        </span>

        <span
          className="text-[11px] tracking-[0.1em] uppercase px-2 py-0.5 rounded"
          style={{ background: tone.bg, color: tone.fg }}
        >
          {levelLabel(level, uk)}
        </span>
        <span className="text-[19px] font-medium tabular-nums w-[3.5ch] text-right" style={{ color: "var(--console-text)" }}>
          {onHand}
        </span>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-[12px] underline underline-offset-2 transition-opacity hover:opacity-70"
          style={{ color: "var(--console-muted)" }}
        >
          {open ? L.hide : L.show}
        </button>
      </header>

      {open && (
        <div className="px-5 py-4 grid gap-6 md:grid-cols-3">
          {/* Receive ------------------------------------------------------- */}
          <form onSubmit={onReceive}>
            <Label htmlFor={`qty-${item.sku}`}>{L.receive}</Label>
            <div className="flex items-center gap-2 mb-2">
              <input
                id={`qty-${item.sku}`}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder={L.qty}
                inputMode="numeric"
                autoComplete="off"
                className="h-9 px-3 text-[13px] rounded w-[90px] outline-none transition-colors focus:border-[color:var(--console-accent-line)]"
                style={inputStyle}
              />
              <button
                type="submit"
                disabled={busy !== null || !qty.trim()}
                className="h-9 px-4 text-[13px] rounded transition-opacity hover:opacity-85 disabled:opacity-40 disabled:cursor-default"
                style={{ background: "var(--console-accent)", color: "#14151a" }}
              >
                {busy === "receive" ? L.saving : L.add}
              </button>
            </div>
            <input
              value={receiveNote}
              onChange={(e) => setReceiveNote(e.target.value)}
              placeholder={L.note}
              autoComplete="off"
              className="h-9 px-3 text-[13px] rounded w-full outline-none transition-colors focus:border-[color:var(--console-accent-line)]"
              style={inputStyle}
            />
          </form>

          {/* Correct ------------------------------------------------------- */}
          <form onSubmit={onCorrect}>
            <Label htmlFor={`count-${item.sku}`}>{L.correct}</Label>
            <div className="flex items-center gap-2 mb-2">
              <input
                id={`count-${item.sku}`}
                value={counted}
                onChange={(e) => setCounted(e.target.value)}
                placeholder={L.counted}
                inputMode="numeric"
                autoComplete="off"
                className="h-9 px-3 text-[13px] rounded w-[90px] outline-none transition-colors focus:border-[color:var(--console-accent-line)]"
                style={inputStyle}
              />
              <button
                type="submit"
                disabled={busy !== null || !counted.trim() || !correctNote.trim()}
                className="h-9 px-4 text-[13px] rounded transition-opacity hover:opacity-85 disabled:opacity-40 disabled:cursor-default"
                style={{ background: "var(--console-accent)", color: "#14151a" }}
              >
                {busy === "correct" ? L.saving : L.apply}
              </button>
            </div>
            <input
              value={correctNote}
              onChange={(e) => setCorrectNote(e.target.value)}
              placeholder={L.why}
              autoComplete="off"
              className="h-9 px-3 text-[13px] rounded w-full outline-none transition-colors focus:border-[color:var(--console-accent-line)]"
              style={inputStyle}
            />
          </form>

          {/* Thresholds ---------------------------------------------------- */}
          <form onSubmit={onThresholds}>
            <Label>{L.thresholds}</Label>
            <div className="flex items-center gap-2">
              <div>
                <input
                  value={critical}
                  onChange={(e) => setCritical(e.target.value)}
                  inputMode="numeric"
                  aria-label={L.critical}
                  className="h-9 px-3 text-[13px] rounded w-[70px] outline-none transition-colors focus:border-[color:var(--console-accent-line)]"
                  style={inputStyle}
                />
                <div className="text-[10.5px] mt-1" style={{ color: "var(--console-faint)" }}>{L.critical}</div>
              </div>
              <div>
                <input
                  value={reorder}
                  onChange={(e) => setReorder(e.target.value)}
                  inputMode="numeric"
                  aria-label={L.reorder}
                  className="h-9 px-3 text-[13px] rounded w-[70px] outline-none transition-colors focus:border-[color:var(--console-accent-line)]"
                  style={inputStyle}
                />
                <div className="text-[10.5px] mt-1" style={{ color: "var(--console-faint)" }}>{L.reorder}</div>
              </div>
              <button
                type="submit"
                disabled={busy !== null}
                className="h-9 px-4 text-[13px] rounded self-start transition-opacity hover:opacity-85 disabled:opacity-40 disabled:cursor-default"
                style={{ background: "var(--console-accent)", color: "#14151a" }}
              >
                {busy === "thresholds" ? L.saving : L.save}
              </button>
            </div>
          </form>

          {/* History ------------------------------------------------------- */}
          <div className="md:col-span-3">
            <Label>{L.history}</Label>
            {item.movements.length === 0 ? (
              <p className="text-[13px]" style={{ color: "var(--console-faint)" }}>{L.noHistory}</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {item.movements.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-baseline gap-x-3 text-[12.5px]">
                    <span
                      className="tabular-nums font-medium w-[4ch] text-right"
                      style={{ color: m.delta < 0 ? "var(--console-alert)" : "var(--console-ok)" }}
                    >
                      {m.delta > 0 ? `+${m.delta}` : m.delta}
                    </span>
                    <span style={{ color: "var(--console-muted)" }}>{reasonLabel(m.reason, uk)}</span>
                    {m.note && <span style={{ color: "var(--console-muted)" }}>{m.note}</span>}
                    <span className="ml-auto" style={{ color: "var(--console-faint)" }}>
                      {m.createdBy} · {formatWhen(m.createdAt, uk)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {(error || done) && (
            <div className="md:col-span-3 text-[12.5px]" style={{ color: error ? "var(--console-alert)" : "var(--console-ok)" }}>
              {error ?? done}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
