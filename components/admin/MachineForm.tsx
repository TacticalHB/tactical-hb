"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createMachine } from "@/app/actions/machines";
import {
  MACHINE_KINDS,
  MACHINE_STATUSES,
  machineKindLabel,
  machineStatusLabel,
  type MachineKind,
  type MachineStatus,
} from "@/lib/machines-display";
import type { SupplierOption } from "@/lib/suppliers-admin";

/* ---------------------------------------------------------------------------
   Add a machine.

   Name and kind are the only things asked for. Everything money-shaped is
   optional because a machine is worth registering the day it lands, and its
   lifetime hours are a guess that firms up later — the rate simply says how
   much of itself is known until then.
--------------------------------------------------------------------------- */

export const machineErrors = (uk: boolean): Record<string, string> => ({
  no_name: uk ? "Вкажіть назву машини." : "Enter a name for the machine.",
  bad_kind: uk ? "Перевірте тип." : "Check the kind.",
  bad_status: uk ? "Перевірте статус." : "Check the status.",
  bad_date: uk ? "Перевірте дату придбання." : "Check the purchase date.",
  bad_amount: uk ? "Перевірте суми." : "Check the amounts.",
  bad_hours: uk ? "Години — ціле число, 1 і більше." : "Hours must be a whole number of 1 or more.",
  bad_minutes: uk ? "Хвилини мають бути більші за нуль." : "Minutes must be above zero.",
  no_sku: uk ? "Оберіть товар." : "Pick a product.",
  no_machine: uk ? "Оберіть машину." : "Pick a machine.",
  duplicate_name: uk ? "Машина з такою назвою вже є." : "A machine with that name already exists.",
  not_found: uk ? "Запис не знайдено." : "That record no longer exists.",
});

export default function MachineForm({
  suppliers,
  uk,
}: {
  suppliers: SupplierOption[];
  uk: boolean;
}) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [kind, setKind] = useState<MachineKind>("printer_3d");
  const [status, setStatus] = useState<MachineStatus>("active");
  const [purchasedOn, setPurchasedOn] = useState("");
  const [purchaseCostUah, setPurchaseCostUah] = useState("");
  const [expectedLifeHours, setExpectedLifeHours] = useState("");
  const [runningCostPerHourUah, setRunningCostPerHourUah] = useState("");
  const [maintenancePerYearUah, setMaintenancePerYearUah] = useState("");
  const [hoursPerYear, setHoursPerYear] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const L = {
    title: uk ? "Додати машину" : "Add a machine",
    name: uk ? "Назва" : "Name",
    purchased: uk ? "Придбано" : "Purchased",
    cost: uk ? "Ціна, ₴" : "Cost, ₴",
    life: uk ? "Ресурс, год" : "Life, hours",
    running: uk ? "₴/год роботи" : "₴/hour running",
    maintenance: uk ? "Обслуг., ₴/рік" : "Service, ₴/year",
    hoursYear: uk ? "Годин на рік" : "Hours a year",
    supplier: uk ? "Постачальник" : "Supplier",
    notes: uk ? "Нотатки" : "Notes",
    add: uk ? "Додати" : "Add",
  };

  const errors = machineErrors(uk);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await createMachine({
      name,
      kind,
      status,
      purchasedOn,
      purchaseCostUah,
      expectedLifeHours,
      runningCostPerHourUah,
      maintenancePerYearUah,
      hoursPerYear,
      supplierId,
      notes,
    });
    setBusy(false);
    if (res.ok) {
      setName("");
      setPurchasedOn("");
      setPurchaseCostUah("");
      setExpectedLifeHours("");
      setRunningCostPerHourUah("");
      setMaintenancePerYearUah("");
      setHoursPerYear("");
      setSupplierId("");
      setNotes("");
      router.refresh();
    } else {
      setError(errors[res.error] ?? res.error);
    }
  }

  return (
    <form onSubmit={onSubmit} className="console-card px-5 py-4">
      <div className="console-label mb-3">{L.title}</div>

      <div className="flex flex-wrap gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={L.name}
          autoComplete="off"
          aria-label={L.name}
          className="console-field w-[190px] flex-1 min-w-[160px]"
        />
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as MachineKind)}
          aria-label="Kind"
          className="console-field"
        >
          {MACHINE_KINDS.map((k) => (
            <option key={k} value={k}>
              {machineKindLabel(k, uk)}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as MachineStatus)}
          aria-label="Status"
          className="console-field"
        >
          {MACHINE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {machineStatusLabel(s, uk)}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={purchasedOn}
          onChange={(e) => setPurchasedOn(e.target.value)}
          aria-label={L.purchased}
          className="console-field"
        />
        <input
          value={purchaseCostUah}
          onChange={(e) => setPurchaseCostUah(e.target.value)}
          placeholder={L.cost}
          inputMode="decimal"
          autoComplete="off"
          aria-label={L.cost}
          className="console-field w-[110px] tabular-nums"
        />
        <input
          value={expectedLifeHours}
          onChange={(e) => setExpectedLifeHours(e.target.value)}
          placeholder={L.life}
          inputMode="numeric"
          autoComplete="off"
          aria-label={L.life}
          className="console-field w-[120px] tabular-nums"
        />
        <input
          value={runningCostPerHourUah}
          onChange={(e) => setRunningCostPerHourUah(e.target.value)}
          placeholder={L.running}
          inputMode="decimal"
          autoComplete="off"
          aria-label={L.running}
          className="console-field w-[130px] tabular-nums"
        />
        <input
          value={maintenancePerYearUah}
          onChange={(e) => setMaintenancePerYearUah(e.target.value)}
          placeholder={L.maintenance}
          inputMode="decimal"
          autoComplete="off"
          aria-label={L.maintenance}
          className="console-field w-[140px] tabular-nums"
        />
        <input
          value={hoursPerYear}
          onChange={(e) => setHoursPerYear(e.target.value)}
          placeholder={L.hoursYear}
          inputMode="numeric"
          autoComplete="off"
          aria-label={L.hoursYear}
          className="console-field w-[130px] tabular-nums"
        />
        <select
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
          aria-label={L.supplier}
          className="console-field"
        >
          <option value="">{L.supplier}</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={L.notes}
          autoComplete="off"
          aria-label={L.notes}
          className="console-field flex-1 min-w-[160px]"
        />

        <button type="submit" disabled={busy || !name.trim()} className="console-btn console-btn-primary">
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
