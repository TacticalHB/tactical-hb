"use client";

import { useState } from "react";
import { createOrderTtn, saveOrderTtn } from "@/app/actions/orders";

/* ---------------------------------------------------------------------------
   Paste a Nova Poshta TTN against one order.

   The action re-checks admin rights server-side, so this form is a convenience
   rather than the security boundary.

   "Create waybill" books it with Nova Poshta instead — the same call the
   payment webhook makes — for a paid order whose automatic booking failed.
   Nova Poshta's answer appears under the field when it refuses.
--------------------------------------------------------------------------- */

export default function OrderTtnForm({
  orderId,
  initial,
  locale,
  canCreate = false,
}: {
  orderId: string;
  initial: string | null;
  locale: string;
  /** A paid Nova Poshta order with no waybill yet — offer to book it. */
  canCreate?: boolean;
}) {
  const uk = locale === "uk";
  const [ttn, setTtn] = useState(initial ?? "");
  const [saved, setSaved] = useState<string | null>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const L = {
    label: uk ? "ТТН Нової Пошти" : "Nova Poshta TTN",
    placeholder: uk ? "напр. 20450123456789" : "e.g. 20450123456789",
    save: uk ? "Зберегти" : "Save",
    saving: uk ? "Збереження…" : "Saving…",
    savedMsg: uk ? "Збережено" : "Saved",
    cleared: uk ? "ТТН видалено" : "TTN cleared",
    track: uk ? "Відстежити" : "Track",
    create: uk ? "Створити ТТН" : "Create waybill",
    creating: uk ? "Створення…" : "Creating…",
    npSaid: uk ? "Нова Пошта відповіла:" : "Nova Poshta said:",
  };

  async function onCreate() {
    setCreating(true);
    setError(null);
    const res = await createOrderTtn(orderId);
    setCreating(false);
    if (res.ok) {
      setSaved(res.ttn);
      setTtn(res.ttn);
    } else {
      setError(`${L.npSaid} ${res.error}`);
    }
  }

  const dirty = ttn.replace(/\s+/g, "") !== (saved ?? "");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await saveOrderTtn(orderId, ttn);
    setBusy(false);
    if (res.ok) {
      setSaved(res.ttn);
      setTtn(res.ttn ?? "");
    } else {
      setError(res.error);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-1.5">
      <label
        htmlFor={`ttn-${orderId}`}
        className="text-[11px] tracking-[0.12em] uppercase"
        style={{ color: "var(--console-muted)" }}
      >
        {L.label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={`ttn-${orderId}`}
          value={ttn}
          onChange={(e) => setTtn(e.target.value)}
          placeholder={L.placeholder}
          inputMode="numeric"
          autoComplete="off"
          className="h-9 px-3 text-[13px] font-mono rounded w-[190px] outline-none transition-colors focus:border-[color:var(--console-accent-line)]"
          style={{ border: "1px solid var(--console-border)", color: "var(--console-text)", background: "transparent" }}
        />
        <button
          type="submit"
          disabled={busy || !dirty}
          className="h-9 px-4 text-[13px] rounded transition-opacity hover:opacity-85 disabled:opacity-40 disabled:cursor-default"
          style={{ background: "var(--console-accent)", color: "var(--console-on-accent)" }}
        >
          {busy ? L.saving : L.save}
        </button>
        {canCreate && !saved && (
          <button
            type="button"
            onClick={onCreate}
            disabled={creating || busy}
            className="h-9 px-4 text-[13px] rounded transition-opacity hover:opacity-85 disabled:opacity-40 disabled:cursor-default"
            style={{ border: "1px solid var(--console-accent-line)", color: "var(--console-text)", background: "transparent" }}
          >
            {creating ? L.creating : L.create}
          </button>
        )}
        {!dirty && saved && !error && (
          <span className="text-[12px]" style={{ color: "var(--console-ok)" }}>
            {L.savedMsg}
          </span>
        )}
        {/* Straight to Nova Poshta's tracking for this parcel. */}
        {saved && (
          <a
            href={`https://novaposhta.ua/tracking/?cargo_number=${encodeURIComponent(saved)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] underline underline-offset-2 transition-opacity hover:opacity-70"
            style={{ color: "var(--console-muted)" }}
          >
            {L.track}
          </a>
        )}
        {!dirty && !saved && !error && initial && (
          <span className="text-[12px]" style={{ color: "var(--console-muted)" }}>
            {L.cleared}
          </span>
        )}
      </div>
      {error && (
        <span className="text-[12px]" style={{ color: "var(--console-alert)" }}>
          {error}
        </span>
      )}
    </form>
  );
}
