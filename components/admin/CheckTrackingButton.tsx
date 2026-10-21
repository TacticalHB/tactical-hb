"use client";

import { useState } from "react";
import { checkTrackingNow, type CheckTrackingResult } from "@/app/actions/orders";

/* ---------------------------------------------------------------------------
   "Check tracking now" (21 Oct 2026). The tracking pass otherwise runs once a
   day at 21:00 Kyiv (Vercel Hobby allows daily crons only); this runs the same
   pass on demand and prints what it found, including a carrier that is off or
   did not answer — Mario cannot read the server logs, so they come here.
--------------------------------------------------------------------------- */
export default function CheckTrackingButton({ locale }: { locale: string }) {
  const uk = locale === "uk";
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<CheckTrackingResult | null>(null);

  async function onClick() {
    setBusy(true);
    setRes(null);
    setRes(await checkTrackingNow());
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button type="button" onClick={onClick} disabled={busy} className="console-btn console-btn-secondary self-start">
        {busy ? (uk ? "Перевіряю…" : "Checking…") : uk ? "Перевірити відстеження" : "Check tracking now"}
      </button>
      {res && !res.ok && <span className="text-[12.5px]" style={{ color: "var(--console-alert)" }}>{res.error}</span>}
      {res && res.ok && (
        <span className="text-[12.5px]" style={{ color: "var(--console-muted)" }}>
          {uk
            ? `Перевірено ${res.checked} · відправлено ${res.shipped} · доставлено ${res.delivered} · листів ${res.emailed}`
            : `Checked ${res.checked} · ${res.shipped} shipped · ${res.delivered} delivered · ${res.emailed} email${res.emailed === 1 ? "" : "s"} sent`}
          {res.notes.map((n) => (
            <span key={n} className="block" style={{ color: "var(--console-warn)" }}>{n}</span>
          ))}
        </span>
      )}
    </div>
  );
}
