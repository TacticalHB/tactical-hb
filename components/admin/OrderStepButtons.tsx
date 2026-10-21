"use client";

import { useState } from "react";
import { markOrderAdvanced } from "@/app/actions/orders";

/* ---------------------------------------------------------------------------
   "Mark as shipped" / "Mark as delivered" (21 Oct 2026) — for parcels the
   carriers' tracking cannot see. Shipped sends the customer the usual
   on-its-way email (Mario's call), so it asks first; delivered sends nothing.
--------------------------------------------------------------------------- */
export default function OrderStepButtons({
  orderId,
  locale,
  canShip,
  canDeliver,
}: {
  orderId: string;
  locale: string;
  canShip: boolean;
  canDeliver: boolean;
}) {
  const uk = locale === "uk";
  const [busy, setBusy] = useState<"shipped" | "delivered" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function go(target: "shipped" | "delivered") {
    const question =
      target === "shipped"
        ? uk
          ? "Позначити як відправлене? Клієнт отримає лист «Замовлення в дорозі» з трек-номером."
          : "Mark as shipped? The customer gets the \"your order is on its way\" email with the tracking number."
        : uk
          ? "Позначити як доставлене?"
          : "Mark as delivered?";
    if (!window.confirm(question)) return;
    setBusy(target);
    setError(null);
    const res = await markOrderAdvanced(orderId, target);
    setBusy(null);
    if (!res.ok) return setError(res.error);
    setDone(
      target === "shipped"
        ? res.emailed
          ? uk ? "Відправлено · лист надіслано" : "Shipped · email sent"
          : uk ? "Відправлено" : "Shipped"
        : uk ? "Доставлено" : "Delivered"
    );
  }

  if (!canShip && !canDeliver) return null;
  if (done) return <span className="text-[12.5px]" style={{ color: "var(--console-ok)" }}>{done}</span>;

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <span className="inline-flex flex-wrap gap-2 justify-end">
        {canShip && (
          <button type="button" onClick={() => go("shipped")} disabled={busy !== null} className="console-btn console-btn-secondary">
            {busy === "shipped" ? (uk ? "Зберігаю…" : "Saving…") : uk ? "Позначити відправленим" : "Mark as shipped"}
          </button>
        )}
        {canDeliver && (
          <button type="button" onClick={() => go("delivered")} disabled={busy !== null} className="console-btn console-btn-secondary">
            {busy === "delivered" ? (uk ? "Зберігаю…" : "Saving…") : uk ? "Позначити доставленим" : "Mark as delivered"}
          </button>
        )}
      </span>
      {error && <span className="text-[12.5px] text-right" style={{ color: "var(--console-alert)" }}>{error}</span>}
    </span>
  );
}
