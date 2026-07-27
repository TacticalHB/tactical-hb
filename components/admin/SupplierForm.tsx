"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupplier } from "@/app/actions/suppliers";
import {
  SUPPLIER_CURRENCIES,
  SUPPLIER_STATUSES,
  supplierStatusLabel,
  type SupplierStatus,
} from "@/lib/suppliers-display";

/* ---------------------------------------------------------------------------
   Add a supplier.

   Name is the only required field. A supplier you have only a name for is
   still worth recording — the contact details arrive with the first invoice,
   and 0022 leaves every other column nullable for exactly that reason.
--------------------------------------------------------------------------- */

export const supplierErrors = (uk: boolean): Record<string, string> => ({
  no_name: uk ? "Вкажіть назву постачальника." : "Enter a name for the supplier.",
  bad_status: uk ? "Перевірте статус." : "Check the status.",
  bad_lead_time: uk ? "Термін — ціле число днів, 0–365." : "Lead time must be 0–365 whole days.",
  bad_currency: uk ? "Перевірте валюту." : "Check the currency.",
  bad_email: uk ? "Перевірте адресу пошти." : "Check the email address.",
  duplicate_name: uk
    ? "Постачальник із такою назвою вже існує."
    : "A supplier with that name already exists.",
  not_found: uk ? "Запис не знайдено." : "That record no longer exists.",
});

export default function SupplierForm({ uk }: { uk: boolean }) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [status, setStatus] = useState<SupplierStatus>("active");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [leadTimeDays, setLeadTimeDays] = useState("");
  const [currency, setCurrency] = useState("");
  const [website, setWebsite] = useState("");
  const [notes, setNotes] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const L = {
    title: uk ? "Додати постачальника" : "Add a supplier",
    name: uk ? "Назва" : "Name",
    contact: uk ? "Контактна особа" : "Contact",
    email: uk ? "Пошта" : "Email",
    phone: uk ? "Телефон" : "Phone",
    country: uk ? "Країна" : "Country",
    lead: uk ? "Термін, днів" : "Lead time, days",
    currency: uk ? "Валюта" : "Currency",
    website: uk ? "Сайт" : "Website",
    notes: uk ? "Нотатки" : "Notes",
    add: uk ? "Додати" : "Add",
  };

  const errors = supplierErrors(uk);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await createSupplier({
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
      setName("");
      setStatus("active");
      setContactName("");
      setEmail("");
      setPhone("");
      setCountry("");
      setLeadTimeDays("");
      setCurrency("");
      setWebsite("");
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
          placeholder={L.contact}
          autoComplete="off"
          aria-label={L.contact}
          className="console-field w-[150px]"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={L.email}
          type="email"
          autoComplete="off"
          aria-label={L.email}
          className="console-field w-[190px]"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={L.phone}
          autoComplete="off"
          aria-label={L.phone}
          className="console-field w-[140px]"
        />
        <input
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          placeholder={L.country}
          autoComplete="off"
          aria-label={L.country}
          className="console-field w-[110px]"
        />
        <input
          value={leadTimeDays}
          onChange={(e) => setLeadTimeDays(e.target.value)}
          placeholder={L.lead}
          inputMode="numeric"
          autoComplete="off"
          aria-label={L.lead}
          className="console-field w-[120px] tabular-nums"
        />
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          aria-label={L.currency}
          className="console-field"
        >
          <option value="">{L.currency}</option>
          {SUPPLIER_CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder={L.website}
          autoComplete="off"
          aria-label={L.website}
          className="console-field w-[160px]"
        />
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={L.notes}
          autoComplete="off"
          aria-label={L.notes}
          className="console-field flex-1 min-w-[170px]"
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
