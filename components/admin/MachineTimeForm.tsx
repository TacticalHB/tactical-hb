"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveMachineTime } from "@/app/actions/machines";
import { machineErrors } from "@/components/admin/MachineForm";

/* ---------------------------------------------------------------------------
   Book a product's time on a machine.

   Minutes, not hours — nobody times a print in decimal hours. One row per
   (sku, machine), so re-entering a pair corrects it rather than stacking a
   second figure nobody can choose between (0022's unique index does the
   enforcing; the upsert here just makes it feel like editing).
--------------------------------------------------------------------------- */

export default function MachineTimeForm({
  skus,
  machines,
  uk,
}: {
  skus: { sku: string; name: string }[];
  machines: { id: string; name: string }[];
  uk: boolean;
}) {
  const router = useRouter();

  const [sku, setSku] = useState("");
  const [machineId, setMachineId] = useState("");
  const [minutesPerUnit, setMinutesPerUnit] = useState("");
  const [note, setNote] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const L = {
    title: uk ? "Записати час на виріб" : "Book time per unit",
    product: uk ? "Товар" : "Product",
    machine: uk ? "Машина" : "Machine",
    minutes: uk ? "Хвилин на шт" : "Minutes per unit",
    note: uk ? "Нотатка" : "Note",
    save: uk ? "Зберегти" : "Save",
    noMachines: uk
      ? "Спершу додайте машину."
      : "Add a machine first.",
  };

  const errors = machineErrors(uk);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await saveMachineTime({ sku, machineId, minutesPerUnit, note });
    setBusy(false);
    if (res.ok) {
      setMinutesPerUnit("");
      setNote("");
      router.refresh();
    } else {
      setError(errors[res.error] ?? res.error);
    }
  }

  if (machines.length === 0) {
    return (
      <div className="console-card px-5 py-4">
        <div className="console-label mb-1">{L.title}</div>
        <p className="text-[13.5px]" style={{ color: "var(--console-faint)" }}>
          {L.noMachines}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="console-card px-5 py-4">
      <div className="console-label mb-3">{L.title}</div>

      <div className="flex flex-wrap gap-2">
        <select
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          aria-label={L.product}
          className="console-field flex-1 min-w-[200px]"
        >
          <option value="">{L.product}</option>
          {skus.map((s) => (
            <option key={s.sku} value={s.sku}>
              {s.name} — {s.sku}
            </option>
          ))}
        </select>
        <select
          value={machineId}
          onChange={(e) => setMachineId(e.target.value)}
          aria-label={L.machine}
          className="console-field min-w-[160px]"
        >
          <option value="">{L.machine}</option>
          {machines.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <input
          value={minutesPerUnit}
          onChange={(e) => setMinutesPerUnit(e.target.value)}
          placeholder={L.minutes}
          inputMode="decimal"
          autoComplete="off"
          aria-label={L.minutes}
          className="console-field w-[150px] tabular-nums"
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={L.note}
          autoComplete="off"
          aria-label={L.note}
          className="console-field flex-1 min-w-[150px]"
        />

        <button
          type="submit"
          disabled={busy || !sku || !machineId || !minutesPerUnit.trim()}
          className="console-btn console-btn-primary"
        >
          {busy ? "…" : L.save}
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
