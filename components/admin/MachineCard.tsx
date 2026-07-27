"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteMachine, removeMachineTime, updateMachine } from "@/app/actions/machines";
import { formatUah } from "@/lib/stock-display";
import {
  MACHINE_KINDS,
  MACHINE_STATUSES,
  formatMinutes,
  machineKindLabel,
  machineStatusLabel,
  machineStatusTone,
  type Machine,
  type MachineKind,
  type MachineStatus,
  type MachineTime,
} from "@/lib/machines-display";
import { machineErrors } from "@/components/admin/MachineForm";
import type { SupplierOption } from "@/lib/suppliers-admin";

/* ---------------------------------------------------------------------------
   One machine: what an hour on it costs, how much of that is actually known,
   and which products book time on it.

   THE RATE IS NEVER APPLIED FROM HERE. There is no button on this card that
   writes a unit cost, and the actions file behind it has no such function. The
   number is here to be read next to the entered cost, and acted on by hand in
   /admin/costs — dated, like every cost since 0016.
--------------------------------------------------------------------------- */

export default function MachineCard({
  machine,
  times,
  suppliers,
  uk,
}: {
  machine: Machine;
  times: MachineTime[];
  suppliers: SupplierOption[];
  uk: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(machine.name);
  const [kind, setKind] = useState<MachineKind>(machine.kind);
  const [status, setStatus] = useState<MachineStatus>(machine.status);
  const [purchasedOn, setPurchasedOn] = useState(machine.purchasedOn ?? "");
  const [purchaseCostUah, setPurchaseCostUah] = useState(
    machine.purchaseCostUah === null ? "" : String(machine.purchaseCostUah)
  );
  const [expectedLifeHours, setExpectedLifeHours] = useState(
    machine.expectedLifeHours === null ? "" : String(machine.expectedLifeHours)
  );
  const [runningCostPerHourUah, setRunningCostPerHourUah] = useState(
    machine.runningCostPerHourUah === null ? "" : String(machine.runningCostPerHourUah)
  );
  const [maintenancePerYearUah, setMaintenancePerYearUah] = useState(
    machine.maintenancePerYearUah === null ? "" : String(machine.maintenancePerYearUah)
  );
  const [hoursPerYear, setHoursPerYear] = useState(
    machine.hoursPerYear === null ? "" : String(machine.hoursPerYear)
  );
  const [supplierId, setSupplierId] = useState(machine.supplierId ?? "");
  const [notes, setNotes] = useState(machine.notes ?? "");

  const errors = machineErrors(uk);
  const tone = machineStatusTone(machine.status);

  const L = {
    edit: uk ? "Змінити" : "Edit",
    save: uk ? "Зберегти" : "Save",
    cancel: uk ? "Скасувати" : "Cancel",
    remove: uk ? "Видалити" : "Delete",
    perHour: uk ? "за годину" : "an hour",
    unknownRate: uk ? "ставку не порахувати" : "no rate yet",
    of3: uk ? "з 3 складників" : "of 3 components known",
    depreciation: uk ? "амортизація" : "depreciation",
    running: uk ? "робота" : "running",
    maintenance: uk ? "обслуговування" : "service",
    routing: uk ? "Час на виріб" : "Time per unit",
    noRouting: uk ? "жоден товар ще не привʼязаний" : "no product books time on it yet",
    detach: uk ? "прибрати" : "remove",
  };

  async function save() {
    setBusy(true);
    setError(null);
    const res = await updateMachine(machine.id, {
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
      setEditing(false);
      router.refresh();
    } else {
      setError(errors[res.error] ?? res.error);
    }
  }

  async function remove() {
    const warning = uk
      ? `Видалити «${machine.name}»? Разом із нею зникне час, привʼязаний до товарів. Витрати на купівлю у «Витратах» залишаться.`
      : `Delete “${machine.name}”? The per-product times go with it. The purchase logged in Costs stays.`;
    if (!window.confirm(warning)) return;
    setBusy(true);
    setError(null);
    const res = await deleteMachine(machine.id);
    setBusy(false);
    if (res.ok) router.refresh();
    else setError(errors[res.error] ?? res.error);
  }

  async function detach(id: string) {
    setBusy(true);
    setError(null);
    const res = await removeMachineTime(id);
    setBusy(false);
    if (res.ok) router.refresh();
    else setError(errors[res.error] ?? res.error);
  }

  return (
    <div className="console-card px-5 py-4">
      {!editing ? (
        <>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-[15px] font-medium" style={{ color: "var(--console-text)" }}>
              {machine.name}
            </span>
            <span
              className="text-[11px] tracking-[0.1em] uppercase px-2 py-0.5 rounded"
              style={{ background: tone.bg, color: tone.fg }}
            >
              {machineStatusLabel(machine.status, uk)}
            </span>
            <span className="text-[13px]" style={{ color: "var(--console-muted)" }}>
              {machineKindLabel(machine.kind, uk)}
            </span>
            {machine.supplierName && (
              <span className="text-[13px]" style={{ color: "var(--console-muted)" }}>
                · {machine.supplierName}
              </span>
            )}
          </div>

          {/* The rate ------------------------------------------------------ */}
          <div className="mt-2">
            {machine.hourlyCostUah === null ? (
              <p className="text-[14px]" style={{ color: "var(--console-faint)" }}>
                {L.unknownRate}
              </p>
            ) : (
              <p className="text-[18px] font-semibold tabular-nums" style={{ color: "var(--console-text)" }}>
                {formatUah(machine.hourlyCostUah)}
                <span className="text-[13px] font-normal ml-1.5" style={{ color: "var(--console-muted)" }}>
                  {L.perHour} · {machine.componentsKnown} {L.of3}
                </span>
              </p>
            )}
            <p className="text-[13px] mt-0.5 tabular-nums" style={{ color: "var(--console-muted)" }}>
              {[
                machine.depreciationPerHourUah !== null
                  ? `${L.depreciation} ${formatUah(machine.depreciationPerHourUah)}`
                  : null,
                machine.runningCostPerHourUah !== null
                  ? `${L.running} ${formatUah(machine.runningCostPerHourUah)}`
                  : null,
                machine.maintenancePerHourUah !== null
                  ? `${L.maintenance} ${formatUah(machine.maintenancePerHourUah)}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>

          {/* Routing ------------------------------------------------------- */}
          <div className="mt-3">
            <div className="console-label mb-1">{L.routing}</div>
            {times.length === 0 ? (
              <p className="text-[13px]" style={{ color: "var(--console-faint)" }}>
                {L.noRouting}
              </p>
            ) : (
              <ul className="text-[13.5px]" style={{ color: "var(--console-muted)" }}>
                {times.map((t) => (
                  <li key={t.id} className="py-0.5 flex flex-wrap items-baseline gap-x-2">
                    <span style={{ color: "var(--console-text)" }}>{t.sku}</span>
                    <span className="tabular-nums">{formatMinutes(t.minutesPerUnit, uk)}</span>
                    {machine.hourlyCostUah !== null && (
                      <span className="tabular-nums">
                        ≈ {formatUah((t.minutesPerUnit / 60) * machine.hourlyCostUah)}
                      </span>
                    )}
                    {t.note && <span className="text-[12.5px]">{t.note}</span>}
                    <button
                      onClick={() => detach(t.id)}
                      disabled={busy}
                      className="text-[12px] underline underline-offset-2"
                      style={{ color: "var(--console-faint)" }}
                    >
                      {L.detach}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {machine.notes && (
            <p className="text-[13px] mt-2" style={{ color: "var(--console-muted)" }}>
              {machine.notes}
            </p>
          )}

          <div className="flex gap-2 mt-3">
            <button onClick={() => setEditing(true)} className="console-btn console-btn-secondary">
              {L.edit}
            </button>
            <button onClick={remove} disabled={busy} className="console-btn console-btn-danger">
              {L.remove}
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Name"
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
            aria-label="Purchased"
            className="console-field"
          />
          <input
            value={purchaseCostUah}
            onChange={(e) => setPurchaseCostUah(e.target.value)}
            inputMode="decimal"
            aria-label="Cost"
            className="console-field w-[110px] tabular-nums"
          />
          <input
            value={expectedLifeHours}
            onChange={(e) => setExpectedLifeHours(e.target.value)}
            inputMode="numeric"
            aria-label="Life hours"
            className="console-field w-[120px] tabular-nums"
          />
          <input
            value={runningCostPerHourUah}
            onChange={(e) => setRunningCostPerHourUah(e.target.value)}
            inputMode="decimal"
            aria-label="Running cost"
            className="console-field w-[130px] tabular-nums"
          />
          <input
            value={maintenancePerYearUah}
            onChange={(e) => setMaintenancePerYearUah(e.target.value)}
            inputMode="decimal"
            aria-label="Service a year"
            className="console-field w-[140px] tabular-nums"
          />
          <input
            value={hoursPerYear}
            onChange={(e) => setHoursPerYear(e.target.value)}
            inputMode="numeric"
            aria-label="Hours a year"
            className="console-field w-[130px] tabular-nums"
          />
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            aria-label="Supplier"
            className="console-field"
          >
            <option value="">—</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            aria-label="Notes"
            className="console-field flex-1 min-w-[160px]"
          />

          <button onClick={save} disabled={busy || !name.trim()} className="console-btn console-btn-primary">
            {busy ? "…" : L.save}
          </button>
          <button
            onClick={() => {
              setEditing(false);
              setError(null);
            }}
            className="console-btn console-btn-secondary"
          >
            {L.cancel}
          </button>
        </div>
      )}

      {error && (
        <p className="mt-2 text-[12px]" style={{ color: "var(--console-alert)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
