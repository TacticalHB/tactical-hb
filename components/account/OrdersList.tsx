"use client";

import { useState } from "react";
import Link from "next/link";

/* ---------------------------------------------------------------------------
   Orders history with expandable line items.

   Data is fetched server-side (see the page) and passed down, so the list is
   SSR'd and instantly visible; only expand/collapse is client state.
--------------------------------------------------------------------------- */

export type OrderItem = {
  id: string;
  product_id: string;
  product_name: string | null;
  quantity: number;
  price_eur: number;
};

export type OrderWithItems = {
  id: string;
  amount_eur: number;
  source: string;
  created_at: string;
  items: OrderItem[];
};

const eur = (n: number) => `€${n.toFixed(2)}`;

export default function OrdersList({
  locale,
  orders,
  error,
}: {
  locale: string;
  orders: OrderWithItems[];
  error?: string | null;
}) {
  const uk = locale === "uk";
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setOpen((o) => ({ ...o, [id]: !o[id] }));

  const L = {
    title: uk ? "Замовлення" : "Orders",
    empty: uk ? "Замовлень поки немає" : "No orders yet",
    emptyHint: uk
      ? "Коли ви зробите замовлення, воно з'явиться тут разом з нарахованими XP."
      : "Once you place an order it'll appear here, along with the XP you earned.",
    browse: uk ? "Переглянути товари" : "Browse products",
    items: (n: number) => (uk ? `${n} позицій` : `${n} item${n === 1 ? "" : "s"}`),
    source: uk ? "Джерело" : "Source",
    total: uk ? "Разом" : "Total",
    product: uk ? "Товар" : "Product",
    qty: uk ? "К-сть" : "Qty",
    each: uk ? "Ціна" : "Each",
    lineTotal: uk ? "Сума" : "Line total",
    details: uk ? "Деталі" : "Details",
    hide: uk ? "Сховати" : "Hide",
    noItems: uk ? "Для цього замовлення немає позицій." : "No line items recorded for this order.",
  };

  const dt = (s: string) =>
    new Date(s).toLocaleString(uk ? "uk-UA" : "en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div>
      <h1 className="text-3xl font-semibold mb-6" style={{ color: "#111" }}>{L.title}</h1>

      {error && (
        <div className="mb-5 text-sm px-4 py-3 rounded-lg" style={{ background: "#fdecec", color: "#b42318" }}>{error}</div>
      )}

      {orders.length === 0 ? (
        <div className="rounded-2xl border py-16 px-6 text-center" style={{ borderColor: "var(--border)" }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="1.4" className="mx-auto mb-4">
            <path d="M4 7h16l-1 12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 7Z" />
            <path d="M9 7V5a3 3 0 0 1 6 0v2" />
          </svg>
          <p className="text-lg font-medium" style={{ color: "#111" }}>{L.empty}</p>
          <p className="text-sm mt-1 mb-6" style={{ color: "var(--text-muted)" }}>{L.emptyHint}</p>
          <Link href={`/${locale}/products`} className="inline-block h-11 leading-[44px] px-7 rounded-full text-sm font-medium"
            style={{ background: "#111", color: "#fff" }}>
            {L.browse}
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((o) => {
            const isOpen = !!open[o.id];
            const count = o.items.reduce((s, i) => s + i.quantity, 0);
            return (
              <li key={o.id} className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
                {/* Summary row — click anywhere to expand */}
                <button
                  onClick={() => toggle(o.id)}
                  aria-expanded={isOpen}
                  className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-[color:var(--bg-soft)] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium" style={{ color: "#111" }}>{dt(o.created_at)}</div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {L.items(count)} · {L.source}: {o.source}
                    </div>
                  </div>
                  <div className="text-base font-semibold tabular-nums shrink-0" style={{ color: "#111" }}>{eur(o.amount_eur)}</div>
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="#111" strokeWidth="1.6"
                    className="shrink-0 transition-transform duration-300" style={{ transform: isOpen ? "rotate(180deg)" : "none" }}>
                    <path d="M4 7l6 6 6-6" />
                  </svg>
                </button>

                {/* Line items — animated expand */}
                <div className="grid transition-[grid-template-rows] duration-300 ease-out"
                  style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}>
                  <div className="overflow-hidden">
                    <div className="px-5 pb-5 pt-1 border-t" style={{ borderColor: "var(--border)" }}>
                      {o.items.length === 0 ? (
                        <p className="text-sm py-3" style={{ color: "var(--text-muted)" }}>{L.noItems}</p>
                      ) : (
                        <table className="w-full text-sm">
                          <thead>
                            <tr style={{ color: "var(--text-faint)" }}>
                              <th className="text-left font-normal py-2 text-xs">{L.product}</th>
                              <th className="text-right font-normal py-2 text-xs w-14">{L.qty}</th>
                              <th className="text-right font-normal py-2 text-xs w-20">{L.each}</th>
                              <th className="text-right font-normal py-2 text-xs w-24">{L.lineTotal}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {o.items.map((it) => (
                              <tr key={it.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                                <td className="py-2.5 pr-3" style={{ color: "#111" }}>
                                  {/* product_name is the snapshot taken at purchase time */}
                                  <Link href={`/${locale}/products/${it.product_id}`} className="hover:underline">
                                    {it.product_name || it.product_id}
                                  </Link>
                                </td>
                                <td className="py-2.5 text-right tabular-nums" style={{ color: "var(--text-muted)" }}>{it.quantity}</td>
                                <td className="py-2.5 text-right tabular-nums" style={{ color: "var(--text-muted)" }}>{eur(it.price_eur)}</td>
                                <td className="py-2.5 text-right tabular-nums font-medium" style={{ color: "#111" }}>
                                  {eur(it.price_eur * it.quantity)}
                                </td>
                              </tr>
                            ))}
                            <tr className="border-t" style={{ borderColor: "var(--border-strong)" }}>
                              <td colSpan={3} className="py-2.5 text-right text-xs" style={{ color: "var(--text-muted)" }}>{L.total}</td>
                              <td className="py-2.5 text-right tabular-nums font-semibold" style={{ color: "#111" }}>{eur(o.amount_eur)}</td>
                            </tr>
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
