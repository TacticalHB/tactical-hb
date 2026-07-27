"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteAdSpend, updateAdSpend } from "@/app/actions/marketing";
import { channelLabel, type AdSpendEntry } from "@/lib/marketing-display";
import { formatUah } from "@/lib/stock-display";

/* ---------------------------------------------------------------------------
   One spend row: the reading line, and (opened on demand) the editing
   surface for the numbers that arrive late — results, corrections, notes.
   Month and channel are fixed on purpose: a row filed under the wrong month
   is deleted and re-entered, which keeps "what can change" easy to reason
   about.
--------------------------------------------------------------------------- */

export default function AdSpendRow({ entry, uk }: { entry: AdSpendEntry; uk: boolean }) {
  const router = useRouter();
  const s = entry;

  const [open, setOpen] = useState(false);

  const [campaign, setCampaign] = useState(s.campaign ?? "");
  const [amountUah, setAmountUah] = useState(String(s.amountUah));
  const [amountEur, setAmountEur] = useState(s.amountEur === null ? "" : String(s.amountEur));
  const [clicks, setClicks] = useState(s.clicks === null ? "" : String(s.clicks));
  const [ordersAttributed, setOrdersAttributed] = useState(
    s.ordersAttributed === null ? "" : String(s.ordersAttributed)
  );
  const [note, setNote] = useState(s.note ?? "");

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const L = {
    edit: uk ? "Редагувати" : "Edit",
    close: uk ? "Згорнути" : "Close",
    save: uk ? "Зберегти" : "Save",
    saved: uk ? "Збережено" : "Saved",
    campaign: uk ? "Кампанія" : "Campaign",
    clicks: uk ? "Кліки" : "Clicks",
    orders: uk ? "Замовлення" : "Orders",
    note: uk ? "Нотатка" : "Note",
    notMeasured: uk ? "не виміряно" : "not measured",
    remove: uk ? "Видалити" : "Delete",
    confirmRemove: uk
      ? `Видалити витрату ${formatUah(s.amountUah)} (${channelLabel(s.channel, uk)}, ${s.month})?`
      : `Delete the ${formatUah(s.amountUah)} ${channelLabel(s.channel, uk)} row for ${s.month}?`,
  };

  const errors: Record<string, string> = {
    bad_amount: uk ? "Перевірте суму." : "Check the amount.",
    bad_number: uk ? "Кліки й замовлення — цілі числа." : "Clicks and orders must be whole numbers.",
  };

  async function onSave() {
    setBusy("save");
    setError(null);
    setInfo(null);
    const res = await updateAdSpend(s.id, {
      campaign,
      amountUah,
      amountEur,
      clicks,
      ordersAttributed,
      note,
    });
    setBusy(null);
    if (res.ok) {
      setInfo(L.saved);
      router.refresh();
    } else {
      setError(errors[res.error] ?? res.error);
    }
  }

  async function onDelete() {
    if (!window.confirm(L.confirmRemove)) return;
    setBusy("delete");
    setError(null);
    setInfo(null);
    const res = await deleteAdSpend(s.id);
    setBusy(null);
    if (res.ok) router.refresh();
    else setError(errors[res.error] ?? res.error);
  }

  const inputStyle: React.CSSProperties = {
    border: "1px solid var(--border-strong)",
    color: "#111",
    background: "#fff",
  };
  const inputClass =
    "h-9 px-3 text-[13px] rounded outline-none transition-colors focus:border-black";

  const results =
    s.clicks === null && s.ordersAttributed === null
      ? L.notMeasured
      : [
          s.clicks !== null ? `${s.clicks} ${L.clicks.toLowerCase()}` : null,
          s.ordersAttributed !== null ? `${s.ordersAttributed} ${L.orders.toLowerCase()}` : null,
        ]
          .filter(Boolean)
          .join(" · ");

  return (
    <div style={{ borderTop: "1px solid var(--border)" }}>
      {/* Reading row ---------------------------------------------------- */}
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-3 text-[13.5px]">
        <span className="tabular-nums" style={{ color: "#8a8a8d" }}>
          {s.month}
        </span>
        <span className="font-medium" style={{ color: "#111" }}>
          {channelLabel(s.channel, uk)}
        </span>
        {s.campaign && <span style={{ color: "#4a4a4d" }}>{s.campaign}</span>}
        <span className="tabular-nums font-medium" style={{ color: "#111" }}>
          {formatUah(s.amountUah)}
        </span>
        {s.amountEur !== null && (
          <span className="tabular-nums" style={{ color: "#8a8a8d" }}>
            €{s.amountEur}
          </span>
        )}
        <span style={{ color: s.clicks === null && s.ordersAttributed === null ? "#a3a3a6" : "#4a4a4d" }}>
          {results}
        </span>
        {s.note && <span style={{ color: "#a3a3a6" }}>{s.note}</span>}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="ml-auto text-[12.5px] underline-offset-2 hover:underline"
          style={{ color: "#4a4a4d" }}
        >
          {open ? L.close : L.edit}
        </button>
      </div>

      {/* Editing surface ------------------------------------------------- */}
      {open && (
        <div className="px-5 pb-4">
          <div className="flex flex-wrap gap-2">
            <input
              value={campaign}
              onChange={(e) => setCampaign(e.target.value)}
              placeholder={L.campaign}
              autoComplete="off"
              aria-label={`${L.campaign} — ${s.month} ${s.channel}`}
              className={`${inputClass} w-[190px]`}
              style={inputStyle}
            />
            <input
              value={amountUah}
              onChange={(e) => setAmountUah(e.target.value)}
              placeholder="₴"
              inputMode="decimal"
              autoComplete="off"
              aria-label={`UAH — ${s.month} ${s.channel}`}
              className={`${inputClass} w-[110px] tabular-nums`}
              style={inputStyle}
            />
            <input
              value={amountEur}
              onChange={(e) => setAmountEur(e.target.value)}
              placeholder="€ (opt.)"
              inputMode="decimal"
              autoComplete="off"
              aria-label={`EUR — ${s.month} ${s.channel}`}
              className={`${inputClass} w-[90px] tabular-nums`}
              style={inputStyle}
            />
            <input
              value={clicks}
              onChange={(e) => setClicks(e.target.value)}
              placeholder={L.clicks}
              inputMode="numeric"
              autoComplete="off"
              aria-label={`${L.clicks} — ${s.month} ${s.channel}`}
              className={`${inputClass} w-[90px] tabular-nums`}
              style={inputStyle}
            />
            <input
              value={ordersAttributed}
              onChange={(e) => setOrdersAttributed(e.target.value)}
              placeholder={L.orders}
              inputMode="numeric"
              autoComplete="off"
              aria-label={`${L.orders} — ${s.month} ${s.channel}`}
              className={`${inputClass} w-[110px] tabular-nums`}
              style={inputStyle}
            />
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={L.note}
              autoComplete="off"
              aria-label={`${L.note} — ${s.month} ${s.channel}`}
              className={`${inputClass} flex-1 min-w-[140px]`}
              style={inputStyle}
            />
            <button
              type="button"
              onClick={onSave}
              disabled={busy !== null}
              className="h-9 px-4 text-[13px] rounded transition-opacity hover:opacity-85 disabled:opacity-40 disabled:cursor-default"
              style={{ background: "#111", color: "#fff" }}
            >
              {busy === "save" ? "…" : L.save}
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={busy !== null}
              className="h-9 px-3 text-[12.5px] rounded transition-opacity hover:opacity-85 disabled:opacity-40"
              style={{ border: "1px solid #e6d4d2", color: "#96322c", background: "#fff" }}
            >
              {busy === "delete" ? "…" : L.remove}
            </button>
          </div>

          {(info || error) && (
            <p className="mt-2 text-[12px]" style={{ color: error ? "#b3261e" : "#4a7c59" }}>
              {error ?? info}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
