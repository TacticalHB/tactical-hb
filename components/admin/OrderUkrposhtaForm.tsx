"use client";

import { useState } from "react";
import { saveOrderUkrposhtaBarcode } from "@/app/actions/orders";

/* ---------------------------------------------------------------------------
   Paste an Ukrposhta barcode against one order.

   THE TWIN OF OrderTtnForm, AND SEPARATE ON PURPOSE. It writes a different
   column through a different action, because a Nova Poshta waybill and a
   postal barcode are different documents — one form switching between them is
   one wrong render away from filing a barcode as a waybill, which the tracking
   cron would then hand to the wrong carrier.

   WHILE UKRPOSHTA_BOOKING IS OFF, THIS IS THE ONLY WAY IN. The parcel is
   bought at the counter and the number is on the paper receipt; without this
   field it never reaches the order, and nothing tracks it.

   The action re-checks admin rights server-side, so this form is a convenience
   rather than the security boundary.
--------------------------------------------------------------------------- */

export default function OrderUkrposhtaForm({
  orderId,
  initial,
  locale,
}: {
  orderId: string;
  initial: string | null;
  locale: string;
}) {
  const uk = locale === "uk";
  const [barcode, setBarcode] = useState(initial ?? "");
  const [saved, setSaved] = useState<string | null>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const L = {
    label: uk ? "Штрихкод Укрпошти" : "Ukrposhta barcode",
    placeholder: uk ? "напр. CV123456789UA" : "e.g. CV123456789UA",
    save: uk ? "Зберегти" : "Save",
    saving: uk ? "Збереження…" : "Saving…",
    savedMsg: uk ? "Збережено" : "Saved",
    cleared: uk ? "Штрихкод видалено" : "Barcode cleared",
    track: uk ? "Відстежити" : "Track",
  };

  /* Compared the way the action will normalise it, so "cv 0622 1640 4ua" does
     not look like a change once it has been saved as CV062216404UA. */
  const normalised = barcode.replace(/[\s-]+/g, "").toUpperCase();
  const dirty = normalised !== (saved ?? "");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await saveOrderUkrposhtaBarcode(orderId, barcode);
    setBusy(false);
    if (res.ok) {
      setSaved(res.barcode);
      setBarcode(res.barcode ?? "");
    } else {
      setError(res.error);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-1.5">
      <label
        htmlFor={`upbc-${orderId}`}
        className="text-[11px] tracking-[0.12em] uppercase"
        style={{ color: "var(--console-muted)" }}
      >
        {L.label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={`upbc-${orderId}`}
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          placeholder={L.placeholder}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className="h-9 px-3 text-[13px] font-mono rounded w-[190px] outline-none transition-colors focus:border-[color:var(--console-accent-line)]"
          style={{ border: "1px solid var(--console-border)", color: "var(--console-text)", background: "transparent" }}
        />
        <button
          type="submit"
          disabled={busy || !dirty}
          className="h-9 px-4 text-[13px] rounded transition-opacity hover:opacity-85 disabled:opacity-40 disabled:cursor-default"
          style={{ background: "var(--console-accent)", color: "#14151a" }}
        >
          {busy ? L.saving : L.save}
        </button>
        {!dirty && saved && !error && (
          <span className="text-[12px]" style={{ color: "var(--console-ok)" }}>
            {L.savedMsg}
          </span>
        )}
        {/* Ukrposhta's public tracking page for this parcel. The URL is written
            out here rather than imported: lib/ukrposhta-tracking is
            server-only, and this is a client component. OrderTtnForm inlines
            the Nova Poshta one for the same reason. */}
        {saved && (
          <a
            href={`https://track.ukrposhta.ua/${uk ? "" : "en/"}?barcode=${encodeURIComponent(saved)}`}
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
