"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createExhibition } from "@/app/actions/projects";
import {
  EXHIBITION_STATUSES,
  exhibitionStatusLabel,
  type ExhibitionStatus,
} from "@/lib/projects-display";

/* ---------------------------------------------------------------------------
   Add a fair to the calendar. budget_uah is the PLAN — what attending is
   expected to cost; the money actually spent belongs in /admin/costs under
   'exhibition', where finance already counts it (0021).
--------------------------------------------------------------------------- */

export default function ExhibitionForm({ uk }: { uk: boolean }) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [budgetUah, setBudgetUah] = useState("");
  const [status, setStatus] = useState<ExhibitionStatus>("considering");
  const [notes, setNotes] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const L = {
    title: uk ? "Додати виставку" : "Add an exhibition",
    name: uk ? "Назва" : "Name",
    location: uk ? "Місто / країна" : "City / country",
    starts: uk ? "Початок" : "Starts",
    ends: uk ? "Кінець" : "Ends",
    budget: uk ? "Бюджет, ₴" : "Budget, ₴",
    notes: uk ? "Нотатки" : "Notes",
    add: uk ? "Додати" : "Add",
  };

  const errors: Record<string, string> = {
    no_name: uk ? "Вкажіть назву виставки." : "Enter a name for the exhibition.",
    bad_date: uk ? "Перевірте дати." : "Check the dates.",
    bad_dates: uk ? "Кінець раніше за початок." : "It ends before it starts.",
    bad_amount: uk ? "Перевірте бюджет." : "Check the budget.",
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await createExhibition({
      name,
      location,
      startsOn,
      endsOn,
      budgetUah,
      status,
      notes,
    });
    setBusy(false);
    if (res.ok) {
      setName("");
      setLocation("");
      setStartsOn("");
      setEndsOn("");
      setBudgetUah("");
      setStatus("considering");
      setNotes("");
      router.refresh();
    } else {
      setError(errors[res.error] ?? res.error);
    }
  }

  const inputStyle: React.CSSProperties = {
    border: "1px solid var(--border-strong)",
    color: "#111",
    background: "#fff",
  };
  const inputClass =
    "h-9 px-3 text-[13px] rounded outline-none transition-colors focus:border-black";

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-lg px-5 py-4"
      style={{ border: "1px solid var(--border)", background: "#fff" }}
    >
      <div className="text-[13px] font-medium mb-3" style={{ color: "#111" }}>
        {L.title}
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={L.name}
          autoComplete="off"
          aria-label={L.name}
          className={`${inputClass} w-[200px] flex-1 min-w-[160px]`}
          style={inputStyle}
        />
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder={L.location}
          autoComplete="off"
          aria-label={L.location}
          className={`${inputClass} w-[160px]`}
          style={inputStyle}
        />
        <input
          type="date"
          value={startsOn}
          onChange={(e) => setStartsOn(e.target.value)}
          aria-label={L.starts}
          className={inputClass}
          style={inputStyle}
        />
        <input
          type="date"
          value={endsOn}
          min={startsOn || undefined}
          onChange={(e) => setEndsOn(e.target.value)}
          aria-label={L.ends}
          className={inputClass}
          style={inputStyle}
        />
        <input
          value={budgetUah}
          onChange={(e) => setBudgetUah(e.target.value)}
          placeholder={L.budget}
          inputMode="decimal"
          autoComplete="off"
          aria-label={L.budget}
          className={`${inputClass} w-[110px] tabular-nums`}
          style={inputStyle}
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as ExhibitionStatus)}
          aria-label="Status"
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
          aria-label={L.notes}
          className={`${inputClass} flex-1 min-w-[160px]`}
          style={inputStyle}
        />

        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="h-9 px-4 text-[13px] rounded transition-opacity hover:opacity-85 disabled:opacity-40 disabled:cursor-default"
          style={{ background: "#111", color: "#fff" }}
        >
          {busy ? "…" : L.add}
        </button>
      </div>

      {error && (
        <p className="mt-2 text-[12px]" style={{ color: "#b3261e" }}>
          {error}
        </p>
      )}
    </form>
  );
}
