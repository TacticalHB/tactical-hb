"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateRequestStatus } from "@/app/actions/wholesale-admin";
import {
  ADMIN_REQUEST_STATUS,
  REQUEST_STATUSES,
  type RequestStatus,
  type WholesaleRequest,
} from "@/lib/wholesale-display";
import { formatUah } from "@/lib/stock-display";

/* ---------------------------------------------------------------------------
   One request in the inbox: the reading row, and the lines underneath.

   THE STATUS SELECT IS THE WHOLE WORKFLOW. There is no invoice to raise and no
   payment to capture — a human quotes the request, emails a payment link, and
   moves this along as they go. "Payment sent" is the state that matters most,
   because it is the only record that the link ever left the building.

   The mailto carries the reference in the subject, so the reply threads
   against the acknowledgement the partner already has.
--------------------------------------------------------------------------- */

export default function WholesaleRequestCard({
  request,
  uk,
}: {
  request: WholesaleRequest;
  uk: boolean;
}) {
  const router = useRouter();
  const r = request;

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const L = {
    units: uk ? "од." : "units",
    lines: uk ? "позицій" : "lines",
    quote: uk ? "Потребує прорахунку" : "To be quoted",
    open: uk ? "Показати" : "Show",
    close: uk ? "Згорнути" : "Close",
    note: uk ? "Примітка партнера" : "Partner's note",
    email: uk ? "Написати" : "Email partner",
    qty: uk ? "К-сть" : "Qty",
    product: uk ? "Товар" : "Product",
    amount: uk ? "Сума" : "Amount",
    failed: uk ? "Не вдалося оновити." : "Couldn't update.",
  };

  async function onStatus(next: RequestStatus) {
    setBusy(true);
    setError(null);
    const res = await updateRequestStatus(r.id, next);
    setBusy(false);
    if (res.ok) router.refresh();
    else setError(L.failed);
  }

  const inputStyle: React.CSSProperties = {
    border: "1px solid var(--console-border)",
    color: "var(--console-text)",
    background: "var(--console-panel-2)",
  };

  /* SHOWN IN THE CURRENCY THE PARTNER WAS QUOTED, not the console's. This used
     to force hryvnia on the reasoning that staff read hryvnia — but the figure
     that matters here is what we told THEM, and quoting it back in a currency
     nobody agreed is how a €753.50 request gets chased for ₴34,460. */
  const inUah = r.currency ? r.currency === "UAH" : r.locale === "uk";
  const fmt = (eur: number | null, uah: number | null) =>
    inUah ? (uah === null ? null : formatUah(uah)) : eur === null ? null : `€${eur.toFixed(2)}`;

  const total = fmt(r.subtotalEur, r.subtotalUah);

  return (
    <div style={{ borderTop: "1px solid var(--console-border)" }}>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-3 text-[13.5px]">
        <span className="font-mono font-medium tracking-[0.04em]" style={{ color: "var(--console-text)" }}>
          {r.reference}
        </span>
        <span className="font-medium" style={{ color: "var(--console-text)" }}>
          {r.company}
        </span>
        <span className="tabular-nums" style={{ color: "var(--console-muted)" }}>
          {r.itemCount} {L.units} · {r.items.length} {L.lines}
        </span>
        <span
          className="tabular-nums"
          style={{ color: total ? "var(--console-muted)" : "var(--console-alert)" }}
        >
          {total ?? L.quote}
        </span>
        <span className="tabular-nums" style={{ color: "var(--console-faint)" }}>
          {r.createdAt.slice(0, 10)}
        </span>
        <span className="text-[11px] uppercase tracking-[0.1em]" style={{ color: "var(--console-faint)" }}>
          {r.locale}
        </span>
        {/* Which book priced it — the one fact that explains why these numbers
            and not the other set. */}
        {r.partnerType && (
          <span className="text-[11px] uppercase tracking-[0.1em]" style={{ color: "var(--console-accent)" }}>
            {r.partnerType}
          </span>
        )}

        <span className="ml-auto flex items-center gap-3">
          <select
            value={r.status}
            disabled={busy}
            onChange={(e) => onStatus(e.target.value as RequestStatus)}
            aria-label={`Status — ${r.reference}`}
            className="h-9 px-3 text-[13px] rounded outline-none transition-colors focus:border-[color:var(--console-accent-line)]"
            style={inputStyle}
          >
            {REQUEST_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ADMIN_REQUEST_STATUS[s][uk ? "uk" : "en"]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="text-[12.5px] underline-offset-2 hover:underline"
            style={{ color: "var(--console-muted)" }}
          >
            {open ? L.close : L.open}
          </button>
        </span>
      </div>

      {error && (
        <p className="px-5 pb-2 text-[12.5px]" style={{ color: "var(--console-alert)" }}>
          {error}
        </p>
      )}

      {open && (
        <div className="px-5 pb-5">
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ color: "var(--console-faint)" }}>
                <th align="left" className="font-normal pb-2 text-[11px] uppercase tracking-[0.1em]">
                  {L.product}
                </th>
                <th align="right" className="font-normal pb-2 text-[11px] uppercase tracking-[0.1em]">
                  {L.qty}
                </th>
                <th align="right" className="font-normal pb-2 text-[11px] uppercase tracking-[0.1em]">
                  {L.amount}
                </th>
              </tr>
            </thead>
            <tbody>
              {r.items.map((i) => (
                <tr key={i.sku ?? i.productSlug} style={{ borderTop: "1px solid var(--console-border)" }}>
                  <td className="py-2" style={{ color: "var(--console-text)" }}>
                    {i.name}
                    {/* The configuration, on its own line: this table is the
                        packing list, and "with a lid" is the difference
                        between two otherwise identical rows. */}
                    {i.optionsLabel && (
                      <span className="block text-[12px]" style={{ color: "var(--console-accent)" }}>
                        {i.optionsLabel}
                      </span>
                    )}
                    {/* The stock key, because this table is what gets picked
                        against — `hmd-tct-op__black` is the row in stock_items,
                        and reading it here saves deriving it by hand. */}
                    {i.sku && (
                      <span className="font-mono text-[11.5px] ms-2" style={{ color: "var(--console-faint)" }}>
                        {i.sku}
                      </span>
                    )}
                  </td>
                  <td align="right" className="py-2 tabular-nums" style={{ color: "var(--console-text)" }}>
                    {i.qty}
                  </td>
                  <td
                    align="right"
                    className="py-2 tabular-nums"
                    style={{ color: i.lineTotalEur !== null ? "var(--console-muted)" : "var(--console-faint)" }}
                  >
                    {fmt(i.lineTotalEur, i.lineTotalUah) ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {r.note && (
            <div className="mt-4">
              <div className="text-[11px] uppercase tracking-[0.1em] mb-1" style={{ color: "var(--console-faint)" }}>
                {L.note}
              </div>
              <p className="text-[13px] whitespace-pre-wrap" style={{ color: "var(--console-muted)" }}>
                {r.note}
              </p>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-4 text-[12.5px]">
            {r.email && (
              <a
                href={`mailto:${r.email}?subject=${encodeURIComponent(`Tactical HB — ${r.reference}`)}`}
                className="h-9 px-4 inline-flex items-center rounded font-medium transition-opacity hover:opacity-85"
                style={{ background: "var(--console-accent)", color: "#111114" }}
              >
                {L.email}
              </a>
            )}
            {r.email && (
              <span className="font-mono" style={{ color: "var(--console-muted)" }}>
                {r.email}
              </span>
            )}
            {r.phone && <span style={{ color: "var(--console-muted)" }}>{r.phone}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
