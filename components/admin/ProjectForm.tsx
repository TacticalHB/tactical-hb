"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createProject } from "@/app/actions/projects";
import {
  PROJECT_STATUSES,
  projectStatusLabel,
  type ProjectStatus,
} from "@/lib/projects-display";

/* ---------------------------------------------------------------------------
   Add a project.

   Name is the only required field — "tech hookah, someday" is a legitimate
   row. Target, rate and deadline can arrive when the idea grows up; the
   Savings Coach simply says what it can with what is filled in.
--------------------------------------------------------------------------- */

export default function ProjectForm({ today, uk }: { today: string; uk: boolean }) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("idea");
  const [targetBudgetUah, setTargetBudgetUah] = useState("");
  const [monthlySavingUah, setMonthlySavingUah] = useState("");
  const [deadline, setDeadline] = useState("");
  const [notes, setNotes] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const L = {
    title: uk ? "Додати проєкт" : "Add a project",
    name: uk ? "Назва" : "Name",
    target: uk ? "Ціль, ₴" : "Target, ₴",
    monthly: uk ? "Щомісяця, ₴" : "Monthly, ₴",
    deadline: uk ? "Дедлайн" : "Deadline",
    notes: uk ? "Нотатки" : "Notes",
    add: uk ? "Додати" : "Add",
  };

  const errors: Record<string, string> = {
    no_name: uk ? "Вкажіть назву проєкту." : "Enter a name for the project.",
    bad_amount: uk ? "Перевірте суми." : "Check the amounts.",
    bad_date: uk ? "Перевірте дедлайн." : "Check the deadline.",
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await createProject({
      name,
      status,
      targetBudgetUah,
      monthlySavingUah,
      deadline,
      notes,
    });
    setBusy(false);
    if (res.ok) {
      setName("");
      setStatus("idea");
      setTargetBudgetUah("");
      setMonthlySavingUah("");
      setDeadline("");
      setNotes("");
      router.refresh();
    } else {
      setError(errors[res.error] ?? res.error);
    }
  }

  const inputStyle: React.CSSProperties = {
    border: "1px solid var(--console-border)",
    color: "var(--console-text)",
    background: "var(--console-panel-2)",
  };
  const inputClass =
    "h-9 px-3 text-[13px] rounded outline-none transition-colors focus:border-[color:var(--console-accent-line)]";

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-lg px-5 py-4"
      style={{ border: "1px solid var(--console-border)", background: "var(--console-panel)" }}
    >
      <div className="text-[13px] font-medium mb-3" style={{ color: "var(--console-text)" }}>
        {L.title}
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={L.name}
          autoComplete="off"
          aria-label={L.name}
          className={`${inputClass} w-[220px] flex-1 min-w-[180px]`}
          style={inputStyle}
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as ProjectStatus)}
          aria-label="Status"
          className={inputClass}
          style={inputStyle}
        >
          {PROJECT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {projectStatusLabel(s, uk)}
            </option>
          ))}
        </select>
        <input
          value={targetBudgetUah}
          onChange={(e) => setTargetBudgetUah(e.target.value)}
          placeholder={L.target}
          inputMode="decimal"
          autoComplete="off"
          aria-label={L.target}
          className={`${inputClass} w-[110px] tabular-nums`}
          style={inputStyle}
        />
        <input
          value={monthlySavingUah}
          onChange={(e) => setMonthlySavingUah(e.target.value)}
          placeholder={L.monthly}
          inputMode="decimal"
          autoComplete="off"
          aria-label={L.monthly}
          className={`${inputClass} w-[120px] tabular-nums`}
          style={inputStyle}
        />
        <input
          type="date"
          value={deadline}
          min={today}
          onChange={(e) => setDeadline(e.target.value)}
          aria-label={L.deadline}
          className={inputClass}
          style={inputStyle}
        />
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={L.notes}
          autoComplete="off"
          aria-label={L.notes}
          className={`${inputClass} flex-1 min-w-[180px]`}
          style={inputStyle}
        />

        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="h-9 px-4 text-[13px] rounded transition-opacity hover:opacity-85 disabled:opacity-40 disabled:cursor-default"
          style={{ background: "var(--console-accent)", color: "#14151a" }}
        >
          {busy ? "…" : L.add}
        </button>
      </div>

      {error && (
        <p className="mt-2 text-[12px]" style={{ color: "var(--console-alert)" }}>
          {error}
        </p>
      )}
    </form>
  );
}
