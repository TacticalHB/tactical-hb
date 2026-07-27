"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createPartner } from "@/app/actions/partners";
import { PARTNER_STATUSES, statusLabel, type PartnerStatus } from "@/lib/partners-display";

/* ---------------------------------------------------------------------------
   Add a partner to the register.

   Company is the only required field: a lead can be nothing more than a name
   scribbled after a call. Everything else — email, follow-up date, even the
   contact — can arrive later, and the row is still worth having, because a
   lead that lives only in an inbox is the exact problem the CRM exists to fix.
--------------------------------------------------------------------------- */

export default function PartnerForm({ today, uk }: { today: string; uk: boolean }) {
  const router = useRouter();

  const [company, setCompany] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [locale, setLocale] = useState<"en" | "uk">("en");
  const [status, setStatus] = useState<PartnerStatus>("lead");
  const [nextFollowUp, setNextFollowUp] = useState("");
  const [notes, setNotes] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const L = {
    title: uk ? "Додати партнера" : "Add a partner",
    company: uk ? "Компанія" : "Company",
    contact: uk ? "Контактна особа" : "Contact name",
    email: "Email",
    phone: uk ? "Телефон" : "Phone",
    country: uk ? "Країна" : "Country",
    lang: uk ? "Мова листування" : "Correspondence language",
    status: uk ? "Статус" : "Status",
    followUp: uk ? "Нагадати" : "Follow up on",
    notes: uk ? "Нотатки" : "Notes",
    add: uk ? "Додати" : "Add",
  };

  const errors: Record<string, string> = {
    duplicate_email: uk
      ? "Партнер із цією адресою вже існує."
      : "A partner with this email already exists.",
    bad_email: uk ? "Ця адреса не схожа на email." : "That doesn't read as an email address.",
    bad_date: uk ? "Перевірте дату нагадування." : "Check the follow-up date.",
    no_company: uk ? "Вкажіть назву компанії." : "Enter the company name.",
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await createPartner({
      company,
      contactName,
      email,
      phone,
      country,
      locale,
      status,
      nextFollowUp,
      notes,
    });
    setBusy(false);
    if (res.ok) {
      setCompany("");
      setContactName("");
      setEmail("");
      setPhone("");
      setCountry("");
      setLocale("en");
      setStatus("lead");
      setNextFollowUp("");
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
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder={L.company}
          autoComplete="off"
          aria-label={L.company}
          className={`${inputClass} w-[200px] flex-1 min-w-[160px]`}
          style={inputStyle}
        />
        <input
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          placeholder={L.contact}
          autoComplete="off"
          aria-label={L.contact}
          className={`${inputClass} w-[170px]`}
          style={inputStyle}
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={L.email}
          inputMode="email"
          autoComplete="off"
          aria-label={L.email}
          className={`${inputClass} w-[210px]`}
          style={inputStyle}
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={L.phone}
          inputMode="tel"
          autoComplete="off"
          aria-label={L.phone}
          className={`${inputClass} w-[140px]`}
          style={inputStyle}
        />
        <input
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          placeholder={L.country}
          autoComplete="off"
          aria-label={L.country}
          className={`${inputClass} w-[130px]`}
          style={inputStyle}
        />

        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value === "uk" ? "uk" : "en")}
          aria-label={L.lang}
          className={inputClass}
          style={inputStyle}
        >
          <option value="en">EN</option>
          <option value="uk">UK</option>
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as PartnerStatus)}
          aria-label={L.status}
          className={inputClass}
          style={inputStyle}
        >
          {PARTNER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s, uk)}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={nextFollowUp}
          min={today}
          onChange={(e) => setNextFollowUp(e.target.value)}
          aria-label={L.followUp}
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
          disabled={busy || !company.trim()}
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
