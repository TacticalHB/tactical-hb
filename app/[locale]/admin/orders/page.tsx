import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/require-user";
import { isAdminEmail } from "@/lib/admin";
import { fetchAdminOrders } from "@/lib/orders-admin";
import {
  orderTotal,
  deliveryLabel,
  statusLabel,
  formatWhen,
  type AdminOrder,
} from "@/lib/orders-display";
import OrderTtnForm from "@/components/admin/OrderTtnForm";

/* ---------------------------------------------------------------------------
   Admin: every order, newest first.

   Guarded twice over. This page 404s for non-admins — notFound() rather than a
   "forbidden" page, so its existence isn't advertised to customers poking at
   URLs. The TTN action re-checks independently, because that's the real
   boundary; this check only keeps the UI honest.

   Orders are read live on every request: an admin looking at this list is
   working a dispatch queue, and a cached page would show parcels as unshipped
   after they'd gone out.
--------------------------------------------------------------------------- */

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, { bg: string; fg: string }> = {
  paid: { bg: "#e7f2ec", fg: "#2f6b4f" },
  shipped: { bg: "#e8eef7", fg: "#2f5480" },
  delivered: { bg: "#eeedea", fg: "#5f5e5a" },
  cancelled: { bg: "#f9e9e8", fg: "#96322c" },
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] tracking-[0.12em] uppercase mb-1" style={{ color: "#8a8a8d" }}>
        {label}
      </div>
      <div className="text-[13.5px] leading-relaxed" style={{ color: "#111" }}>
        {children}
      </div>
    </div>
  );
}

function OrderCard({ order, locale, uk }: { order: AdminOrder; locale: string; uk: boolean }) {
  const total = orderTotal(order);
  const tone = STATUS_TONE[order.status] ?? STATUS_TONE.delivered;

  return (
    <article className="rounded-lg" style={{ border: "1px solid var(--border)", background: "#fff" }}>
      {/* Header — the scannable line: who, when, how much, what state. */}
      <header
        className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3.5"
        style={{ borderBottom: "1px solid var(--border)", background: "#fcfcfb" }}
      >
        <span className="font-mono text-[13.5px] tracking-wider" style={{ color: "#111" }}>
          {order.reference}
        </span>
        <span
          className="text-[11px] tracking-[0.1em] uppercase px-2 py-0.5 rounded"
          style={{ background: tone.bg, color: tone.fg }}
        >
          {statusLabel(order.status, uk)}
        </span>
        {order.source !== "monobank" && (
          <span className="text-[11px] px-2 py-0.5 rounded" style={{ background: "#f1efe8", color: "#6f6d66" }}>
            {order.source}
          </span>
        )}
        {order.isGuest && (
          <span className="text-[11px]" style={{ color: "#8a8a8d" }}>
            {uk ? "гість" : "guest"}
          </span>
        )}

        <span className="ml-auto text-[12.5px]" style={{ color: "#707072" }}>
          {formatWhen(order.createdAt, uk)}
        </span>
        <span className="text-[15px] font-medium tabular-nums" style={{ color: "#111" }}>
          {total.text}
        </span>
      </header>

      <div className="px-5 py-4 grid gap-5 md:grid-cols-3">
        <Field label={uk ? "Клієнт" : "Customer"}>
          {order.name ?? <span style={{ color: "#a3a3a6" }}>—</span>}
          {order.email && (
            <>
              <br />
              <a href={`mailto:${order.email}`} className="underline underline-offset-2" style={{ color: "#111" }}>
                {order.email}
              </a>
            </>
          )}
          {order.phone && (
            <>
              <br />
              <a href={`tel:${order.phone.replace(/\s/g, "")}`} style={{ color: "#111" }}>
                {order.phone}
              </a>
            </>
          )}
        </Field>

        <Field label={uk ? "Доставка" : "Delivery"}>
          <span className="font-medium">{deliveryLabel(order.deliveryKind, uk)}</span>
          {order.deliveryDetail && (
            <>
              <br />
              <span style={{ color: "#4a4a4d" }}>{order.deliveryDetail}</span>
            </>
          )}
          {order.deliveryNotes && (
            <>
              <br />
              <span style={{ color: "#8a8a8d" }}>
                {uk ? "Примітка: " : "Notes: "}
                {order.deliveryNotes}
              </span>
            </>
          )}
        </Field>

        <Field label={uk ? "Товари" : "Products"}>
          {order.items.length === 0 ? (
            <span style={{ color: "#a3a3a6" }}>—</span>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {order.items.map((it, i) => (
                <li key={`${it.productId}-${i}`} className="flex gap-2">
                  <span className="tabular-nums shrink-0" style={{ color: "#707072" }}>
                    {it.qty}×
                  </span>
                  <span>{it.name}</span>
                </li>
              ))}
            </ul>
          )}
        </Field>
      </div>

      {/* Money detail + voucher, only when there's something to say. */}
      {(total.sub || order.voucherCode) && (
        <div className="px-5 pb-3 flex flex-wrap gap-x-4 text-[12px]" style={{ color: "#8a8a8d" }}>
          {total.sub && <span>{total.sub}</span>}
          {order.voucherCode && (
            <span>
              {uk ? "ваучер" : "voucher"} <span className="font-mono">{order.voucherCode}</span>
              {order.discountEur > 0 && ` −€${order.discountEur.toFixed(2)}`}
            </span>
          )}
        </div>
      )}

      <footer className="px-5 py-4" style={{ borderTop: "1px solid var(--border)" }}>
        <OrderTtnForm orderId={order.id} initial={order.ttn} locale={locale} />
      </footer>
    </article>
  );
}

export default async function AdminOrdersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { user } = await requireUser(locale);
  if (!isAdminEmail(user.email)) notFound();

  const uk = locale === "uk";
  const orders = await fetchAdminOrders();

  return (
    <div className="min-h-screen pt-28 pb-24" style={{ background: "#f7f6f4" }}>
      <div className="page-container">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold mb-1" style={{ color: "#111" }}>
            {uk ? "Замовлення" : "Orders"}
          </h1>
          <p className="text-[14.5px]" style={{ color: "#707072" }}>
            {orders === null
              ? uk
                ? "Не вдалося завантажити замовлення."
                : "Couldn't load orders."
              : uk
                ? `${orders.length} ${orders.length === 1 ? "замовлення" : "замовлень"} · найновіші зверху`
                : `${orders.length} ${orders.length === 1 ? "order" : "orders"} · newest first`}
          </p>
        </header>

        {orders === null && (
          <div
            className="rounded-lg px-5 py-4 text-[14px]"
            style={{ border: "1px solid #e6d4d2", background: "#fdf6f5", color: "#96322c" }}
          >
            {uk
              ? "Перевірте, чи виконано міграцію 0012_order_status_ttn.sql у Supabase, та чи задано SUPABASE_SERVICE_ROLE_KEY."
              : "Check that migration 0012_order_status_ttn.sql has been run in Supabase, and that SUPABASE_SERVICE_ROLE_KEY is set."}
          </div>
        )}

        {orders !== null && orders.length === 0 && (
          <p className="text-[14.5px]" style={{ color: "#707072" }}>
            {uk ? "Замовлень поки немає." : "No orders yet."}
          </p>
        )}

        {orders !== null && orders.length > 0 && (
          <div className="flex flex-col gap-4">
            {orders.map((o) => (
              <OrderCard key={o.id} order={o} locale={locale} uk={uk} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
