"use client";

import { useState } from "react";
import { reissueOrderReceipt } from "@/app/actions/orders";

/* ---------------------------------------------------------------------------
   "Re-issue receipt" — for a paid order whose Checkbox receipt failed. Runs
   the same fiscal step as the payment webhook; the receipt id is tied to the
   order reference, so a second press can never make a second receipt.
--------------------------------------------------------------------------- */
export default function ReissueReceiptButton({ orderId, locale }: { orderId: string; locale: string }) {
  const uk = locale === "uk";
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setBusy(true);
    setError(null);
    const res = await reissueOrderReceipt(orderId);
    setBusy(false);
    if (res.ok) setDone(res.receiptId);
    else setError(res.error);
  }

  if (done) {
    return (
      <span style={{ color: "var(--console-ok)" }}>
        {uk ? "Чек видано" : "Receipt issued"} · <span className="font-mono text-[11.5px]">{done}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex flex-col gap-1">
      <button type="button" onClick={onClick} disabled={busy} className="console-btn console-btn-primary self-start">
        {busy ? (uk ? "Видача…" : "Issuing…") : uk ? "Видати чек повторно" : "Re-issue receipt"}
      </button>
      {error && <span style={{ color: "var(--console-alert)" }}>{error}</span>}
    </span>
  );
}
