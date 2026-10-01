import Link from "next/link";
import { needsDispatch, orderTotal, statusLabel, formatWhen, type AdminOrder } from "@/lib/orders-display";
import { ADMIN_REQUEST_STATUS, type WholesaleRequest } from "@/lib/wholesale-display";
import { formatMoney } from "@/lib/currency";

/* ---------------------------------------------------------------------------
   The overview's markup, separated from its reads.

   The page (app/[locale]/admin/page.tsx) guards and fetches; this only draws.
   Split so the screen can be looked at with sample data in development without
   a signed-in admin — and without ever putting a real customer's order behind a
   page with no sign-in to see it.
--------------------------------------------------------------------------- */

export type OverviewData = {
  locale: string;
  orders: AdminOrder[] | null;
  /** Already filtered to the open ones. */
  openRequests: WholesaleRequest[] | null;
  toDispatch: number | null;
  toApprove: number | null;
  lowStock: number | null;
  latestBriefAt: string | null;
};

export default function OverviewView({ locale, orders, openRequests, toDispatch, toApprove, lowStock, latestBriefAt }: OverviewData) {
  const uk = locale === "uk";
  const p = (path: string) => `/${locale}/admin${path}`;
  const today = new Date().toLocaleDateString(uk ? "uk-UA" : "en-GB", {
    timeZone: "Europe/Kyiv",
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const tiles = [
    {
      key: "dispatch",
      label: uk ? "Чекають відправки" : "Waiting to dispatch",
      hint: uk ? "Оплачені, без номера відстеження" : "Paid, no tracking number yet",
      count: toDispatch,
      href: p("/orders"),
    },
    {
      key: "requests",
      label: uk ? "Оптові запити" : "Wholesale requests",
      hint: uk ? "Надіслані або на обговоренні" : "Submitted or in discussion",
      count: openRequests?.length ?? null,
      href: p("/wholesale"),
    },
    {
      key: "approve",
      label: uk ? "Партнери на схвалення" : "Partners to approve",
      hint: uk ? "Зареєструвались, чекають доступу" : "Registered, waiting for access",
      count: toApprove,
      href: p("/partners"),
    },
    {
      key: "stock",
      label: uk ? "Низький залишок" : "Low stock",
      hint: uk ? "Позиції на рівні дозамовлення або нижче" : "Lines at or below reorder level",
      count: lowStock,
      href: p("/stock"),
    },
  ];

  const recentOrders = (orders ?? []).slice(0, 5);
  const recentRequests = (openRequests ?? []).slice(0, 5);

  return (
    <div className="min-h-screen px-4 sm:px-8 py-8" style={{ background: "var(--console-bg-2)" }}>
      <header className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold" style={{ color: "var(--console-text)" }}>
            {uk ? "Огляд" : "Overview"}
          </h1>
          <p className="text-[14px] mt-1 first-letter:uppercase" style={{ color: "var(--console-muted)" }}>
            {today}
          </p>
        </div>
        <Link href={p("/orders")} className="console-btn console-btn-primary">
          {uk ? "Відкрити замовлення" : "Open orders"}
        </Link>
      </header>

      {/* ---- What needs doing ---- */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {tiles.map((t) => {
          const waiting = t.count !== null && t.count > 0;
          return (
            <Link key={t.key} href={t.href} className="console-card console-card-link block p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="console-label !mb-0">{t.label}</span>
                {t.count === null ? (
                  <span className="console-chip console-chip-neutral">{uk ? "недоступно" : "unavailable"}</span>
                ) : waiting ? (
                  <span className="console-chip console-chip-warn">{uk ? "до дії" : "action"}</span>
                ) : (
                  <span className="console-chip console-chip-ok">{uk ? "все чисто" : "all clear"}</span>
                )}
              </div>
              <div
                className="mt-3 text-[40px] leading-none font-semibold tabular-nums"
                style={{ color: waiting ? "var(--console-text)" : "var(--console-faint)" }}
              >
                {t.count === null ? "—" : t.count}
              </div>
              <p className="mt-2 text-[12.5px]" style={{ color: "var(--console-muted)" }}>
                {t.hint}
              </p>
            </Link>
          );
        })}
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* ---- Latest orders ---- */}
        <section className="console-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: "1px solid var(--console-border)" }}>
            <h2 className="text-[15px] font-semibold" style={{ color: "var(--console-text)" }}>
              {uk ? "Останні замовлення" : "Latest orders"}
            </h2>
            <Link href={p("/orders")} className="text-[13px] font-medium" style={{ color: "var(--console-accent-ink)" }}>
              {uk ? "Усі →" : "All →"}
            </Link>
          </div>
          {orders === null ? (
            <p className="px-5 py-4 text-[13.5px]" style={{ color: "var(--console-alert)" }}>
              {uk ? "Не вдалося завантажити замовлення." : "Couldn't load orders."}
            </p>
          ) : recentOrders.length === 0 ? (
            <p className="px-5 py-4 text-[13.5px]" style={{ color: "var(--console-muted)" }}>
              {uk ? "Замовлень поки немає." : "No orders yet."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="console-table">
                <thead>
                  <tr>
                    <th>{uk ? "Номер" : "Order"}</th>
                    <th>{uk ? "Коли" : "When"}</th>
                    <th>{uk ? "Статус" : "Status"}</th>
                    <th className="!text-right">{uk ? "Сума" : "Total"}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((o) => (
                    <tr key={o.id}>
                      <td className="font-mono">{o.reference}</td>
                      <td style={{ color: "var(--console-muted)" }}>{formatWhen(o.createdAt, locale)}</td>
                      <td>
                        <span className={`console-chip ${needsDispatch(o) ? "console-chip-warn" : "console-chip-neutral"}`}>
                          {statusLabel(o.status, locale)}
                        </span>
                      </td>
                      <td className="text-right tabular-nums">{orderTotal(o).text}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ---- Open wholesale requests ---- */}
        <section className="console-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: "1px solid var(--console-border)" }}>
            <h2 className="text-[15px] font-semibold" style={{ color: "var(--console-text)" }}>
              {uk ? "Відкриті оптові запити" : "Open wholesale requests"}
            </h2>
            <Link href={p("/wholesale")} className="text-[13px] font-medium" style={{ color: "var(--console-accent-ink)" }}>
              {uk ? "Усі →" : "All →"}
            </Link>
          </div>
          {openRequests === null ? (
            <p className="px-5 py-4 text-[13.5px]" style={{ color: "var(--console-alert)" }}>
              {uk ? "Не вдалося завантажити запити." : "Couldn't load requests."}
            </p>
          ) : recentRequests.length === 0 ? (
            <p className="px-5 py-4 text-[13.5px]" style={{ color: "var(--console-muted)" }}>
              {uk ? "Нічого не чекає на відповідь." : "Nothing waiting for a reply."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="console-table">
                <thead>
                  <tr>
                    <th>{uk ? "Запит" : "Request"}</th>
                    <th>{uk ? "Партнер" : "Partner"}</th>
                    <th>{uk ? "Статус" : "Status"}</th>
                    <th className="!text-right">{uk ? "Сума" : "Total"}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRequests.map((r) => (
                    <tr key={r.id}>
                      <td className="font-mono">{r.reference}</td>
                      <td>{r.company}</td>
                      <td>
                        <span className="console-chip console-chip-warn">
                          {uk ? ADMIN_REQUEST_STATUS[r.status].uk : ADMIN_REQUEST_STATUS[r.status].en}
                        </span>
                      </td>
                      <td className="text-right tabular-nums">
                        {r.subtotalEur === null && r.subtotalUah === null
                          ? "—"
                          : formatMoney({ eur: r.subtotalEur ?? 0, uah: r.subtotalUah ?? 0 }, r.currency ?? "EUR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <p className="mt-6 text-[12.5px]" style={{ color: "var(--console-faint)" }}>
        {latestBriefAt
          ? `${uk ? "Останній тижневий бриф" : "Latest weekly brief"}: ${formatWhen(latestBriefAt, locale)} · `
          : ""}
        <Link href={p("/ops")} style={{ color: "var(--console-accent-ink)" }}>
          {uk ? "Мапа операцій →" : "Ops map →"}
        </Link>
      </p>
    </div>
  );
}
