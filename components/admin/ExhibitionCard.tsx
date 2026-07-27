"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteExhibition, updateExhibition } from "@/app/actions/projects";
import {
  EXHIBITION_STATUSES,
  exhibitionStatusLabel,
  exhibitionStatusTone,
  type Exhibition,
  type ExhibitionStatus,
} from "@/lib/projects-display";
import { formatUah } from "@/lib/stock-display";

/* ---------------------------------------------------------------------------
   One exhibition: the reading row, and (opened on demand) the editing
   surface. Same manners as every card in the OS: stage in the fields,
   commit with Save, destroy only through a confirm.
--------------------------------------------------------------------------- */

export default function ExhibitionCard({ exhibition, uk }: { exhibition: Exhibition; uk: boolean }) {
  const router = useRouter();
  const x = exhibition;

  const [open, setOpen] = useState(false);

  const [name, setName] = useState(x.name);
  const [location, setLocation] = useState(x.location ?? "");
  const [startsOn, setStartsOn] = useState(x.startsOn ?? "");
  const [endsOn, setEndsOn] = useState(x.endsOn ?? "");
  const [budgetUah, setBudgetUah] = useState(x.budgetUah === null ? "" : String(x.budgetUah));
  const [status, setStatus] = useState<ExhibitionStatus>(x.status);
  const [notes, setNotes] = useState(x.notes ?? "");

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const tone = exhibitionStatusTone(x.status);

  const L = {
    edit: uk ? "Редагувати" : "Edit",
    close: uk ? "Згорнути" : "Close",
    save: uk ? "Зберегти" : "Save",
    saved: uk ? "Збережено" : "Saved",
    name: uk ? "Назва" : "Name",
    location: uk ? "Місто / країна" : "City / country",
    budget: uk ? "Бюджет, ₴" : "Budget, ₴",
    notes: uk ? "Нотатки" : "Notes",
    remove: uk ? "Видалити" : "Delete",
    confirmRemove: uk ? `Видалити «${x.name}»?` : `Delete “${x.name}”?`,
  };

  const errors: Record<string, string> = {
    no_name: uk ? "Вкажіть назву виставки." : "Enter a name for the exhibition.",
    bad_date: uk ? "Перевірте дати." : "Check the dates.",
    bad_dates: uk ? "Кінець раніше за початок." : "It ends before it starts.",
    bad_amount: uk ? "Перевірте бюджет." : "Check the budget.",
  };

  async function onSave() {
    setBusy("save");
    setError(null);
    setInfo(null);
    const res = await updateExhibition(x.id, {
      name,
      location,
      startsOn,
      endsOn,
      budgetUah,
      status,
      notes,
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
    const res = await deleteExhibition(x.id);
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

  const dates =
    x.startsOn === null
      ? null
      : x.endsOn === null || x.endsOn === x.startsOn
        ? x.startsOn
        : `${x.startsOn} — ${x.endsOn}`;

  return (
    <div style={{ borderTop: "1px solid var(--border)" }}>
      {/* Reading row ---------------------------------------------------- */}
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-3 text-[13.5px]">
        <span className="font-medium" style={{ color: "#111" }}>
          {x.name}
        </span>
        <span
          className="text-[11px] tracking-[0.1em] uppercase px-2 py-0.5 rounded"
          style={{ background: tone.bg, color: tone.fg }}
        >
          {exhibitionStatusLabel(x.status, uk)}
        </span>
        {x.location && <span style={{ color: "#8a8a8d" }}>{x.location}</span>}
        {dates && (
          <span className="tabular-nums" style={{ color: "#4a4a4d" }}>
            {dates}
          </span>
        )}
        {x.budgetUah !== null && (
          <span className="tabular-nums" style={{ color: "#4a4a4d" }}>
            {formatUah(x.budgetUah)}
          </span>
        )}
        {x.notes && <span style={{ color: "#a3a3a6" }}>{x.notes}</span>}
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
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={L.name}
              autoComplete="off"
              aria-label={`${L.name} — ${x.name}`}
              className={`${inputClass} w-[200px] flex-1 min-w-[160px]`}
              style={inputStyle}
            />
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={L.location}
              autoComplete="off"
              aria-label={`${L.location} — ${x.name}`}
              className={`${inputClass} w-[160px]`}
              style={inputStyle}
            />
            <input
              type="date"
              value={startsOn}
              onChange={(e) => setStartsOn(e.target.value)}
              aria-label={`${uk ? "Початок" : "Starts"} — ${x.name}`}
              className={inputClass}
              style={inputStyle}
            />
            <input
              type="date"
              value={endsOn}
              min={startsOn || undefined}
              onChange={(e) => setEndsOn(e.target.value)}
              aria-label={`${uk ? "Кінець" : "Ends"} — ${x.name}`}
              className={inputClass}
              style={inputStyle}
            />
            <input
              value={budgetUah}
              onChange={(e) => setBudgetUah(e.target.value)}
              placeholder={L.budget}
              inputMode="decimal"
              autoComplete="off"
              aria-label={`${L.budget} — ${x.name}`}
              className={`${inputClass} w-[110px] tabular-nums`}
              style={inputStyle}
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ExhibitionStatus)}
              aria-label={`Status — ${x.name}`}
              className={inputClass}
              style={inputStyle}
            >
              {EXHIBITION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {exhibitionStatusLabel(s, uk)}
                </option>
              ))}
            </select>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={L.notes}
              autoComplete="off"
              aria-label={`${L.notes} — ${x.name}`}
              className={`${inputClass} flex-1 min-w-[160px]`}
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
