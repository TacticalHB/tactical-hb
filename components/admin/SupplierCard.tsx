"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteSupplier, updateSupplier } from "@/app/actions/suppliers";
import { formatUah } from "@/lib/stock-display";
import {
  SUPPLIER_CURRENCIES,
  SUPPLIER_STATUSES,
  supplierStatusLabel,
  supplierStatusTone,
  type Supplier,
  type SupplierStatus,
} from "@/lib/suppliers-display";
import { supplierErrors } from "@/components/admin/SupplierForm";

/* ---------------------------------------------------------------------------
   One supplier: what we know, what we've paid them, and an inline edit.

   The spend figure is read from cost_entries — it is what has been logged
   against this record, not what has been logged against a matching NAME. Rows
   that predate the record, or that were typed as free text, are not counted
   here and the page says so; silently sweeping them in by name would be a
   guess presented as bookkeeping.
--------------------------------------------------------------------------- */

export default function SupplierCard({ supplier, uk }: { supplier: Supplier; uk: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(supplier.name);
  const [status, setStatus] = useState<SupplierStatus>(supplier.status);
  const [contactName, setContactName] = useState(supplier.contactName ?? "");
  const [email, setEmail] = useState(supplier.email ?? "");
  const [phone, setPhone] = useState(supplier.phone ?? "");
  const [country, setCountry] = useState(supplier.country ?? "");
  const [leadTimeDays, setLeadTimeDays] = useState(
    supplier.leadTimeDays === null ? "" : String(supplier.leadTimeDays)
  );
  const [currency, setCurrency] = useState(supplier.currency ?? "");
  const [website, setWebsite] = useState(supplier.website ?? "");
  const [notes, setNotes] = useState(supplier.notes ?? "");

  const errors = supplierErrors(uk);
  const tone = supplierStatusTone(supplier.status);

  const L = {
    edit: uk ? "Змінити" : "Edit",
    save: uk ? "Зберегти" : "Save",
    cancel: uk ? "Скасувати" : "Cancel",
    remove: uk ? "Видалити" : "Delete",
    spend: uk ? "Витрачено" : "Spent",
    entries: uk ? "записів" : "entries",
    unitCosts: uk ? "собівартостей" : "unit costs",
    lead: uk ? "термін" : "lead",
    days: uk ? "дн" : "d",
    noSpend: uk ? "ще без витрат" : "no costs logged yet",
  };

  async function save() {
    setBusy(true);
    setError(null);
    const res = await updateSupplier(supplier.id, {
      name,
      status,
      contactName,
      email,
      phone,
      website,
      country,
      leadTimeDays,
      currency,
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
      ? `Видалити «${supplier.name}»? Витрати та собівартості залишаться — вони просто втратять посилання на цей запис.`
      : `Delete “${supplier.name}”? The costs and unit costs stay — they simply lose their link to this record.`;
    if (!window.confirm(warning)) return;
    setBusy(true);
    setError(null);
    const res = await deleteSupplier(supplier.id);
    setBusy(false);
    if (res.ok) router.refresh();
    else setError(errors[res.error] ?? res.error);
  }

  const contactLine = [
    supplier.contactName,
    supplier.email,
    supplier.phone,
    supplier.country,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="console-card px-5 py-4">
      {!editing ? (
        <>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-[15px] font-medium" style={{ color: "var(--console-text)" }}>
              {supplier.name}
            </span>
            <span
              className="text-[11px] tracking-[0.1em] uppercase px-2 py-0.5 rounded"
              style={{ background: tone.bg, color: tone.fg }}
            >
              {supplierStatusLabel(supplier.status, uk)}
            </span>
            {supplier.leadTimeDays !== null && (
              <span className="text-[13px]" style={{ color: "var(--console-muted)" }}>
                {L.lead} {supplier.leadTimeDays} {L.days}
              </span>
            )}
            {supplier.currency && (
              <span className="text-[13px]" style={{ color: "var(--console-muted)" }}>
                {supplier.currency}
              </span>
            )}
          </div>

          {contactLine && (
            <p className="text-[13px] mt-1" style={{ color: "var(--console-muted)" }}>
              {contactLine}
            </p>
          )}

          {supplier.website && (
            <p className="text-[13px] mt-1">
              <a
                href={supplier.website.startsWith("http") ? supplier.website : `https://${supplier.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
                style={{ color: "var(--console-muted)" }}
              >
                {supplier.website}
              </a>
            </p>
          )}

          <p className="text-[13.5px] mt-2 tabular-nums" style={{ color: "var(--console-text)" }}>
            {supplier.costEntries === 0 && supplier.unitCosts === 0 ? (
              <span style={{ color: "var(--console-faint)" }}>{L.noSpend}</span>
            ) : (
              <>
                {L.spend} {formatUah(supplier.spendUah)}
                <span className="text-[13px]" style={{ color: "var(--console-muted)" }}>
                  {" "}
                  · {supplier.costEntries} {L.entries}
                  {supplier.unitCosts > 0 && ` · ${supplier.unitCosts} ${L.unitCosts}`}
                </span>
              </>
            )}
          </p>

          {supplier.notes && (
            <p className="text-[13px] mt-2" style={{ color: "var(--console-muted)" }}>
              {supplier.notes}
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
            className="console-field w-[200px] flex-1 min-w-[170px]"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as SupplierStatus)}
            aria-label="Status"
            className="console-field"
          >
            {SUPPLIER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {supplierStatusLabel(s, uk)}
              </option>
            ))}
          </select>
          <input
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            aria-label="Contact"
            className="console-field w-[150px]"
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Email"
            className="console-field w-[190px]"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            aria-label="Phone"
            className="console-field w-[140px]"
          />
          <input
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            aria-label="Country"
            className="console-field w-[110px]"
          />
          <input
            value={leadTimeDays}
            onChange={(e) => setLeadTimeDays(e.target.value)}
            inputMode="numeric"
            aria-label="Lead time"
            className="console-field w-[120px] tabular-nums"
          />
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            aria-label="Currency"
            className="console-field"
          >
            <option value="">—</option>
            {SUPPLIER_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            aria-label="Website"
            className="console-field w-[160px]"
          />
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            aria-label="Notes"
            className="console-field flex-1 min-w-[170px]"
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
