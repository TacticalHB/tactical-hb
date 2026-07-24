"use client";

import { useState } from "react";
import { saveOrderTtn } from "@/app/actions/orders";

/* ---------------------------------------------------------------------------
   Paste a Nova Poshta TTN against one order.

   The action re-checks admin rights server-side, so this form is a convenience
   rather than the security boundary.
--------------------------------------------------------------------------- */

export default function OrderTtnForm({
  orderId,
  initial,
  locale,
}: {
  orderId: string;
  initial: string | null;
  locale: string;
}) {
  const uk = locale === "uk";
  const [ttn, setTtn] = useState(initial ?? "");
  const [saved, setSaved] = useState<string | null>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const L = {
    label: uk ? "ТТН Нової Пошти" : "Nova Poshta TTN",
    placeholder: uk ? "напр. 20450123456789" : "e.g. 20450123456789",
    save: uk ? "Зберегти" : "Save",
    saving: uk ? "Збереження…" : "Saving…",
    savedMsg: uk ? "Збережено" : "Saved",
    cleared: uk ? "ТТН видалено" : "TTN cleared",
  };

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
        style={{ color: "#8a8a8d" }}
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
          className="h-9 px-3 text-[13px] font-mono rounded w-[190px] outline-none transition-colors focus:border-black"
          style={{ border: "1px solid var(--border-strong)", color: "#111", background: "#fff" }}
        />
        <button
          type="submit"
          disabled={busy || !dirty}
          className="h-9 px-4 text-[13px] rounded transition-opacity hover:opacity-85 disabled:opacity-40 disabled:cursor-default"
          style={{ background: "#111", color: "#fff" }}
        >
          {busy ? L.saving : L.save}
        </button>
        {!dirty && saved && !error && (
          <span className="text-[12px]" style={{ color: "#4a7c59" }}>
            {L.savedMsg}
          </span>
        )}
        {!dirty && !saved && !error && initial && (
          <span className="text-[12px]" style={{ color: "#8a8a8d" }}>
            {L.cleared}
          </span>
        )}
      </div>
      {error && (
        <span className="text-[12px]" style={{ color: "#b3261e" }}>
          {error}
        </span>
      )}
    </form>
  );
}
