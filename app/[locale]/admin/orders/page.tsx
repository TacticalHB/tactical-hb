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
import OrderUkrposhtaForm from "@/components/admin/OrderUkrposhtaForm";
import { carrierName, isShippingCarrier } from "@/lib/shipping-carriers";

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
  paid: { bg: "var(--console-ok-soft)", fg: "var(--console-ok)" },
  processing: { bg: "var(--console-warn-soft)", fg: "var(--console-warn)" },
  shipped: { bg: "var(--console-info-soft)", fg: "var(--console-info)" },
  delivered: { bg: "var(--console-panel-2)", fg: "var(--console-muted)" },
  cancelled: { bg: "var(--console-alert-soft)", fg: "var(--console-alert)" },
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] tracking-[0.12em] uppercase mb-1" style={{ color: "var(--console-muted)" }}>
        {label}
      </div>
      <div className="text-[13.5px] leading-relaxed" style={{ color: "var(--console-text)" }}>
        {children}
      </div>
    </div>
  );
}

function OrderCard({ order, locale, uk }: { order: AdminOrder; locale: string; uk: boolean }) {
  const total = orderTotal(order);
  const tone = STATUS_TONE[order.status] ?? STATUS_TONE.delivered;

  return (
    <article className="rounded-lg" style={{ border: "1px solid var(--console-border)", background: "var(--console-panel)" }}>
      {/* Header — the scannable line: who, when, how much, what state. */}
      <header
        className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3.5"
        style={{ borderBottom: "1px solid var(--console-border)", background: "var(--console-panel-2)" }}
      >
        <span className="font-mono text-[13.5px] tracking-wider" style={{ color: "var(--console-text)" }}>
          {order.reference}
        </span>
        <span
          className="text-[11px] tracking-[0.1em] uppercase px-2 py-0.5 rounded"
          style={{ background: tone.bg, color: tone.fg }}
        >
          {statusLabel(order.status, locale)}
        </span>
        {order.source !== "monobank" && (
          <span className="text-[11px] px-2 py-0.5 rounded" style={{ background: "var(--console-panel-2)", color: "var(--console-muted)" }}>
            {order.source}
          </span>
        )}
        {order.isGuest && (
          <span className="text-[11px]" style={{ color: "var(--console-muted)" }}>
            {uk ? "гість" : "guest"}
          </span>
        )}

        <span className="ml-auto text-[12.5px]" style={{ color: "var(--console-muted)" }}>
          {formatWhen(order.createdAt, locale)}
        </span>
        <span className="text-[15px] font-medium tabular-nums" style={{ color: "var(--console-text)" }}>
          {total.text}
        </span>
      </header>

      <div className="px-5 py-4 grid gap-5 md:grid-cols-3">
        <Field label={uk ? "Клієнт" : "Customer"}>
          {order.name ?? <span style={{ color: "var(--console-faint)" }}>—</span>}
          {order.email && (
            <>
              <br />
              <a href={`mailto:${order.email}`} className="underline underline-offset-2" style={{ color: "var(--console-text)" }}>
                {order.email}
              </a>
            </>
          )}
          {order.phone && (
            <>
              <br />
              <a href={`tel:${order.phone.replace(/\s/g, "")}`} style={{ color: "var(--console-text)" }}>
                {order.phone}
              </a>
            </>
          )}
        </Field>

        <Field label={uk ? "Доставка" : "Delivery"}>
          <span className="font-medium">{deliveryLabel(order.deliveryKind, locale)}</span>
          {/* WHO IS CARRYING IT, which used to be answerable from the
              destination alone and no longer is: an international order may be
              on Nova Post or on Ukrposhta, and the packing bench needs to know
              which before it prints anything.

              A null carrier is rendered as Nova Post rather than as a gap —
              every order placed before the choice existed went that way, so
              the blank is a known fact rather than missing data. */}
          {order.deliveryKind === "international" && (
            <>
              <br />
              <span style={{ color: "var(--console-muted)" }}>
                {isShippingCarrier(order.carrier)
                  ? carrierName(order.carrier, locale)
                  : carrierName("nova_poshta", locale)}
              </span>
            </>
          )}
          {order.deliveryDetail && (
            <>
              <br />
              <span style={{ color: "var(--console-muted)" }}>{order.deliveryDetail}</span>
            </>
          )}
          {/* The barcode used to be printed here read-only. It is editable in
              the footer now, and one number in two places on the same card is
              two things to keep in step. */}
          {order.deliveryNotes && (
            <>
              <br />
              <span style={{ color: "var(--console-muted)" }}>
                {uk ? "Примітка: " : "Notes: "}
                {order.deliveryNotes}
              </span>
            </>
          )}
        </Field>

        <Field label={uk ? "Товари" : "Products"}>
          {order.items.length === 0 ? (
            <span style={{ color: "var(--console-faint)" }}>—</span>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {order.items.map((it, i) => (
                <li key={`${it.productId}-${i}`} className="flex gap-2">
                  <span className="tabular-nums shrink-0" style={{ color: "var(--console-muted)" }}>
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
        <div className="px-5 pb-3 flex flex-wrap gap-x-4 text-[12px]" style={{ color: "var(--console-muted)" }}>
          {total.sub && <span>{total.sub}</span>}
          {order.voucherCode && (
            <span>
              {uk ? "ваучер" : "voucher"} <span className="font-mono">{order.voucherCode}</span>
              {order.discountEur > 0 && ` −€${order.discountEur.toFixed(2)}`}
            </span>
          )}
        </div>
      )}

      {/* PRRO status. A paid order with no fiscal receipt is a tax exposure, so
          it reads as an alert rather than a quiet absence. */}
      <div
        className="px-5 py-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px]"
        style={{ borderTop: "1px solid var(--console-border)" }}
      >
        <span className="text-[11px] tracking-[0.12em] uppercase" style={{ color: "var(--console-muted)" }}>
          {uk ? "ПРРО" : "Fiscal"}
        </span>
        {order.fiscalReceiptId ? (
          <>
            <span style={{ color: "var(--console-ok)" }}>{uk ? "Чек видано" : "Receipt issued"}</span>
            <span className="font-mono text-[11.5px]" style={{ color: "var(--console-muted)" }}>
              {order.fiscalReceiptId}
            </span>
            {order.fiscalisedAt && (
              <span style={{ color: "var(--console-faint)" }}>{formatWhen(order.fiscalisedAt, locale)}</span>
            )}
          </>
        ) : order.fiscalError ? (
          <>
            <span style={{ color: "var(--console-alert)" }}>
              {uk ? "ЧЕК НЕ ВИДАНО" : "NO RECEIPT"}
            </span>
            <span style={{ color: "var(--console-muted)" }}>{order.fiscalError}</span>
          </>
        ) : (
          <span style={{ color: "var(--console-warn)" }}>
            {uk ? "Не фіскалізовано" : "Not fiscalised"}
          </span>
        )}
      </div>

      {/* WHICH NUMBER THIS ORDER NEEDS.

          Neither field is shown to every order — a domestic branch delivery
          has no use for a customs barcode, and an Ukrposhta export has no
          waybill — but neither can hide a number that already exists, which is
          why each condition ends with "or it already has one". A number nobody
          can see is a number nobody can correct.

          An international order shows the Ukrposhta field even when its
          carrier column says otherwise: those are the parcels bought at a
          counter while booking is off, and the carrier is not always recorded
          before the paper receipt exists. */}
      <footer className="px-5 py-4 flex flex-wrap gap-x-8 gap-y-4" style={{ borderTop: "1px solid var(--console-border)" }}>
        {(order.carrier !== "ukrposhta" || order.ttn) && (
          <OrderTtnForm orderId={order.id} initial={order.ttn} locale={locale} />
        )}
        {(order.carrier === "ukrposhta" ||
          order.deliveryKind === "international" ||
          order.ukrposhtaBarcode) && (
          <OrderUkrposhtaForm orderId={order.id} initial={order.ukrposhtaBarcode} locale={locale} />
        )}
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
    <div className="min-h-screen pt-10 pb-24" style={{ background: "var(--console-bg-2)" }}>
      <div className="page-container">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold mb-1" style={{ color: "var(--console-text)" }}>
            {uk ? "Замовлення" : "Orders"}
          </h1>
          <p className="text-[14.5px]" style={{ color: "var(--console-muted)" }}>
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
            style={{ border: "1px solid rgba(196,92,92,0.35)", background: "var(--console-alert-soft)", color: "var(--console-alert)" }}
          >
            {uk
              ? "Перевірте, чи виконано міграцію 0012_order_status_ttn.sql у Supabase, та чи задано SUPABASE_SERVICE_ROLE_KEY."
              : "Check that migration 0012_order_status_ttn.sql has been run in Supabase, and that SUPABASE_SERVICE_ROLE_KEY is set."}
          </div>
        )}

        {orders !== null && orders.length === 0 && (
          <p className="text-[14.5px]" style={{ color: "var(--console-muted)" }}>
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
