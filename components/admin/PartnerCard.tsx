"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  deletePartner,
  linkMatchingOrders,
  linkOrderByReference,
  unlinkOrder,
  updatePartner,
} from "@/app/actions/partners";
import {
  PARTNER_STATUSES,
  followUpDue,
  statusLabel,
  statusTone,
  type Partner,
  type PartnerStatus,
} from "@/lib/partners-display";
import { formatUah } from "@/lib/stock-display";
import type { PartnerOrder } from "@/lib/partners-admin";

/* ---------------------------------------------------------------------------
   One partner: the reading row, and underneath it (opened on demand) the
   editing surface and the order links.

   Everything a mutation touches goes through an explicit button press — the
   status select and date input stage a change, Save commits it. The link
   buttons are similarly deliberate: "Link N orders" names the count it is
   about to claim, because linking is what turns retail rows into wholesale
   history and should never feel incidental.
--------------------------------------------------------------------------- */

export default function PartnerCard({
  partner,
  orders,
  today,
  uk,
}: {
  partner: Partner;
  orders: PartnerOrder[];
  today: string;
  uk: boolean;
}) {
  const router = useRouter();
  const p = partner;

  const [open, setOpen] = useState(false);

  const [contactName, setContactName] = useState(p.contactName ?? "");
  const [email, setEmail] = useState(p.email ?? "");
  const [phone, setPhone] = useState(p.phone ?? "");
  const [country, setCountry] = useState(p.country ?? "");
  const [locale, setLocale] = useState<"en" | "uk">(p.locale);
  const [status, setStatus] = useState<PartnerStatus>(p.status);
  const [nextFollowUp, setNextFollowUp] = useState(p.nextFollowUp ?? "");
  const [notes, setNotes] = useState(p.notes ?? "");

  const [refInput, setRefInput] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const due = followUpDue(p, today);
  const tone = statusTone(p.status);

  const L = {
    orders: (n: number) =>
      uk ? `${n} зам.` : `${n} order${n === 1 ? "" : "s"}`,
    lastOrder: uk ? "останнє" : "last",
    followUp: uk ? "нагадування" : "follow-up",
    edit: uk ? "Редагувати" : "Edit",
    close: uk ? "Згорнути" : "Close",
    save: uk ? "Зберегти" : "Save",
    saved: uk ? "Збережено" : "Saved",
    contact: uk ? "Контактна особа" : "Contact name",
    phone: uk ? "Телефон" : "Phone",
    country: uk ? "Країна" : "Country",
    followUpOn: uk ? "Нагадати" : "Follow up on",
    notes: uk ? "Нотатки" : "Notes",
    linkMatching: (n: number) =>
      uk ? `Прив'язати ${n} за email` : `Link ${n} by email`,
    linkRef: uk ? "Прив'язати" : "Link",
    refPlaceholder: uk ? "TCT-… або id замовлення" : "TCT-… or order id",
    linkedOrders: uk ? "Прив'язані замовлення" : "Linked orders",
    noOrders: uk ? "Ще немає прив'язаних замовлень." : "No linked orders yet.",
    unlink: uk ? "Відв'язати" : "Unlink",
    remove: uk ? "Видалити партнера" : "Delete partner",
    confirmRemove: uk
      ? `Видалити «${p.company}»? Замовлення залишаться, лише без прив'язки.`
      : `Delete “${p.company}”? Orders stay — they just lose the link.`,
  };

  const errors: Record<string, string> = {
    duplicate_email: uk
      ? "Партнер із цією адресою вже існує."
      : "A partner with this email already exists.",
    bad_email: uk ? "Ця адреса не схожа на email." : "That doesn't read as an email address.",
    bad_date: uk ? "Перевірте дату нагадування." : "Check the follow-up date.",
    not_found: uk ? "Замовлення не знайдено." : "No order found with that reference.",
    already_linked: uk ? "Це замовлення вже тут." : "That order is already linked here.",
    linked_elsewhere: uk
      ? "Замовлення прив'язане до іншого партнера — спершу відв'яжіть його там."
      : "That order is linked to another partner — unlink it there first.",
  };

  function report(err: string) {
    setError(errors[err] ?? err);
  }

  async function onSave() {
    setBusy("save");
    setError(null);
    setInfo(null);
    const res = await updatePartner(p.id, {
      contactName,
      email,
      phone,
      country,
      locale,
      status,
      nextFollowUp,
      notes,
    });
    setBusy(null);
    if (res.ok) {
      setInfo(L.saved);
      router.refresh();
    } else report(res.error);
  }

  async function onLinkMatching() {
    setBusy("match");
    setError(null);
    setInfo(null);
    const res = await linkMatchingOrders(p.id);
    setBusy(null);
    if (res.ok) {
      setInfo(uk ? `Прив'язано: ${res.linked}` : `Linked ${res.linked}`);
      router.refresh();
    } else report(res.error);
  }

  async function onLinkRef() {
    setBusy("ref");
    setError(null);
    setInfo(null);
    const res = await linkOrderByReference(p.id, refInput);
    setBusy(null);
    if (res.ok) {
      setRefInput("");
      setInfo(uk ? `Прив'язано ${res.reference}` : `Linked ${res.reference}`);
      router.refresh();
    } else report(res.error);
  }

  async function onDelete() {
    if (!window.confirm(L.confirmRemove)) return;
    setBusy("delete");
    setError(null);
    setInfo(null);
    const res = await deletePartner(p.id);
    setBusy(null);
    if (res.ok) router.refresh();
    else report(res.error);
  }

  async function onUnlink(orderId: string) {
    setBusy(orderId);
    setError(null);
    setInfo(null);
    const res = await unlinkOrder(orderId);
    setBusy(null);
    if (res.ok) router.refresh();
    else report(res.error);
  }

  const inputStyle: React.CSSProperties = {
    border: "1px solid var(--border-strong)",
    color: "#111",
    background: "#fff",
  };
  const inputClass =
    "h-9 px-3 text-[13px] rounded outline-none transition-colors focus:border-black";

  return (
    <div style={{ borderTop: "1px solid var(--border)" }}>
      {/* Reading row ---------------------------------------------------- */}
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-3 text-[13.5px]">
        <span className="font-medium" style={{ color: "#111" }}>
          {p.company}
        </span>
        <span
          className="text-[11px] tracking-[0.1em] uppercase px-2 py-0.5 rounded"
          style={{ background: tone.bg, color: tone.fg }}
        >
          {statusLabel(p.status, uk)}
        </span>
        {p.country && <span style={{ color: "#8a8a8d" }}>{p.country}</span>}
        {p.email && (
          <span className="font-mono text-[12px]" style={{ color: "#8a8a8d" }}>
            {p.email}
          </span>
        )}
        {p.orderCount > 0 && (
          <span style={{ color: "#4a4a4d" }}>
            {L.orders(p.orderCount)} · {formatUah(p.revenueUah)}
            {p.lastOrderAt && (
              <span style={{ color: "#a3a3a6" }}>
                {" "}
                · {L.lastOrder} {p.lastOrderAt.slice(0, 10)}
              </span>
            )}
          </span>
        )}
        {p.nextFollowUp && (
          <span
            className="tabular-nums"
            style={{ color: due ? "#96322c" : "#a3a3a6" }}
          >
            {L.followUp} {p.nextFollowUp}
          </span>
        )}
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
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder={L.contact}
              autoComplete="off"
              aria-label={`${L.contact} — ${p.company}`}
              className={`${inputClass} w-[170px]`}
              style={inputStyle}
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              inputMode="email"
              autoComplete="off"
              aria-label={`Email — ${p.company}`}
              className={`${inputClass} w-[210px]`}
              style={inputStyle}
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={L.phone}
              inputMode="tel"
              autoComplete="off"
              aria-label={`${L.phone} — ${p.company}`}
              className={`${inputClass} w-[140px]`}
              style={inputStyle}
            />
            <input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder={L.country}
              autoComplete="off"
              aria-label={`${L.country} — ${p.company}`}
              className={`${inputClass} w-[130px]`}
              style={inputStyle}
            />
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value === "uk" ? "uk" : "en")}
              aria-label={`Locale — ${p.company}`}
              className={inputClass}
              style={inputStyle}
            >
              <option value="en">EN</option>
              <option value="uk">UK</option>
            </select>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as PartnerStatus)}
              aria-label={`Status — ${p.company}`}
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
              onChange={(e) => setNextFollowUp(e.target.value)}
              aria-label={`${L.followUpOn} — ${p.company}`}
              className={inputClass}
              style={inputStyle}
            />
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={L.notes}
              autoComplete="off"
              aria-label={`${L.notes} — ${p.company}`}
              className={`${inputClass} flex-1 min-w-[180px]`}
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
          </div>

          {/* Order links ------------------------------------------------- */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {p.matchingOrders > 0 && (
              <button
                type="button"
                onClick={onLinkMatching}
                disabled={busy !== null}
                className="h-9 px-3 text-[13px] rounded transition-opacity hover:opacity-85 disabled:opacity-40"
                style={{ border: "1px solid var(--border-strong)", color: "#111", background: "#fff" }}
              >
                {busy === "match" ? "…" : L.linkMatching(p.matchingOrders)}
              </button>
            )}
            <input
              value={refInput}
              onChange={(e) => setRefInput(e.target.value)}
              placeholder={L.refPlaceholder}
              autoComplete="off"
              aria-label={`${L.linkRef} — ${p.company}`}
              className={`${inputClass} w-[200px] font-mono text-[12px]`}
              style={inputStyle}
            />
            <button
              type="button"
              onClick={onLinkRef}
              disabled={busy !== null || !refInput.trim()}
              className="h-9 px-3 text-[13px] rounded transition-opacity hover:opacity-85 disabled:opacity-40"
              style={{ border: "1px solid var(--border-strong)", color: "#111", background: "#fff" }}
            >
              {busy === "ref" ? "…" : L.linkRef}
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={busy !== null}
              className="ml-auto h-9 px-3 text-[12.5px] rounded transition-opacity hover:opacity-85 disabled:opacity-40"
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

          <div className="mt-4">
            <div className="text-[12px] font-medium mb-1" style={{ color: "#707072" }}>
              {L.linkedOrders}
            </div>
            {orders.length === 0 && (
              <p className="text-[12.5px]" style={{ color: "#a3a3a6" }}>
                {L.noOrders}
              </p>
            )}
            {orders.map((o) => (
              <div
                key={o.id}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-1 text-[12.5px]"
              >
                <span className="font-mono" style={{ color: "#4a4a4d" }}>
                  {o.reference}
                </span>
                <span className="tabular-nums" style={{ color: "#8a8a8d" }}>
                  {o.createdAt.slice(0, 10)}
                </span>
                <span style={{ color: "#8a8a8d" }}>{o.status}</span>
                <span className="tabular-nums" style={{ color: "#111" }}>
                  {o.amountUah === null ? "—" : formatUah(o.amountUah)}
                </span>
                <button
                  type="button"
                  onClick={() => onUnlink(o.id)}
                  disabled={busy !== null}
                  className="text-[12px] underline-offset-2 hover:underline disabled:opacity-40"
                  style={{ color: "#96322c" }}
                >
                  {busy === o.id ? "…" : L.unlink}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
