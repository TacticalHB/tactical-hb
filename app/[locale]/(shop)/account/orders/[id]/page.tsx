import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/require-user";
import {
  CUSTOMER_ORDER_COLUMNS,
  orderTotalText,
  timelineFor,
  toCustomerOrder,
} from "@/lib/account-orders";
import { formatWhen, statusLabel } from "@/lib/orders-display";
import { trackingUrl } from "@/lib/nova-poshta-tracking";
import { products } from "@/lib/products";
import OrderTimeline from "@/components/account/OrderTimeline";

/* ---------------------------------------------------------------------------
   One order, as its owner sees it.

   OWNERSHIP IS ENFORCED TWICE, and neither is decoration.

   The query carries `.eq("user_id", user.id)` alongside the id, so a customer
   pasting somebody else's uuid selects zero rows and gets a 404 — the same
   answer they would get for an id that never existed, which is deliberate: a
   403 would confirm the order is real and belongs to someone.

   Underneath that, RLS on `orders` ("orders self read", auth.uid() = user_id)
   would refuse the row anyway, and order_items inherit it. Belt and braces on
   purpose: the filter is the thing a future refactor is most likely to drop,
   and RLS is what still holds when it does.

   THE COLUMNS ARE AN ALLOWLIST. CUSTOMER_ORDER_COLUMNS names what a customer
   may see; the buyer's phone, the fiscal receipt, the courier refs and the ops
   notes are simply not selected, so no future render of this page can leak
   them by accident.

   NOT DYNAMIC BY ACCIDENT: requireUser reads cookies, which opts this route
   out of static rendering on its own.
--------------------------------------------------------------------------- */

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const uk = locale === "uk";
  const { supabase, user } = await requireUser(locale);

  // A malformed id must not reach the database as a uuid comparison error.
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { data } = await supabase
    .from("orders")
    .select(CUSTOMER_ORDER_COLUMNS)
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) notFound();

  const order = toCustomerOrder(data as unknown as Record<string, unknown>);
  const total = orderTotalText(order);
  const steps = timelineFor(order.status, uk);
  const cancelled = order.status === "cancelled";

  const L = {
    back: uk ? "Усі замовлення" : "All orders",
    order: uk ? "Замовлення" : "Order",
    placed: uk ? "Оформлено" : "Placed",
    status: uk ? "Статус" : "Status",
    items: uk ? "Позиції" : "Items",
    qty: uk ? "К-сть" : "Qty",
    total: uk ? "Разом" : "Total",
    delivery: uk ? "Доставка" : "Delivery",
    tracking: uk ? "Номер накладної" : "Tracking number",
    track: uk ? "Відстежити посилку" : "Track shipment",
    cancelled: uk
      ? "Це замовлення скасовано. Якщо це помилка — відповідайте на лист із підтвердженням."
      : "This order was cancelled. If that looks wrong, reply to your confirmation email.",
    help: uk
      ? "Питання щодо замовлення? Просто відповідайте на лист із підтвердженням — він приходить із адреси, яку ми читаємо."
      : "Questions about this order? Reply to your confirmation email — it comes from an address we read.",
    addons: { lid: uk ? "З кришкою" : "With Lid", rubber: uk ? "З гумкою" : "With Rubber" },
  };

  const money = (eur: number | null, uah: number | null) =>
    uah !== null ? `₴${Math.round(uah).toLocaleString("uk-UA")}` : eur !== null ? `€${eur.toFixed(2)}` : "—";

  return (
    <div>
      <Link
        href={`/${locale}/account/orders`}
        className="text-[13px] underline underline-offset-4 transition-opacity hover:opacity-70"
        style={{ color: "var(--text-muted)" }}
      >
        ← {L.back}
      </Link>

      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 mt-5 mb-1">
        <h1 className="text-2xl font-semibold" style={{ color: "#111" }}>
          {L.order} {order.reference}
        </h1>
        <div className="text-lg font-semibold tabular-nums" style={{ color: "#111" }}>{total.text}</div>
      </div>
      <p className="text-[13px] mb-8" style={{ color: "var(--text-muted)" }}>
        {L.placed} {formatWhen(order.createdAt, uk)}
        {total.sub ? <span className="ml-2">· {total.sub}</span> : null}
      </p>

      {/* Where it has got to */}
      <div className="rounded-2xl border px-6 py-7" style={{ borderColor: "var(--border)" }}>
        {steps ? (
          <OrderTimeline steps={steps} />
        ) : (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {cancelled ? L.cancelled : statusLabel(order.status, uk)}
          </p>
        )}

        {/* Tracking appears the moment a waybill exists — the same number the
            shipped email carries, pointing at the same public page. */}
        {order.ttn && (
          <div className="mt-7 pt-6 flex flex-wrap items-center gap-x-8 gap-y-3" style={{ borderTop: "1px solid var(--border)" }}>
            <div>
              <div className="text-[10px] tracking-[0.2em] uppercase mb-1" style={{ color: "var(--text-faint)" }}>
                {L.tracking}
              </div>
              <div className="text-[15px] font-medium tabular-nums tracking-wide" style={{ color: "#111" }}>
                {order.ttn}
              </div>
            </div>
            <a
              href={trackingUrl(order.ttn)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block h-10 leading-[40px] px-6 rounded-full text-[13px] font-medium transition-opacity hover:opacity-85"
              style={{ background: "#111", color: "#fff" }}
            >
              {L.track}
            </a>
          </div>
        )}
      </div>

      {/* What was bought */}
      <h2 className="text-lg font-semibold mt-10 mb-4" style={{ color: "#111" }}>{L.items}</h2>
      <ul className="flex flex-col">
        {order.items.map((it, i) => {
          const product = products.find((p) => p.slug === it.slug);
          const image = product?.gridImage || product?.image || null;
          const finish = [
            it.variant,
            it.lid ? L.addons.lid : null,
            it.rubber ? L.addons.rubber : null,
          ].filter(Boolean).join(" · ");

          return (
            <li
              key={it.id}
              className="flex items-center gap-5 py-5"
              style={{ borderTop: i > 0 ? "1px solid var(--border)" : "none" }}
            >
              {/* #f5f5f5 — the studio plate the photography is shot on, the
                  same literal the grid and the cart line use. */}
              <div className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden" style={{ background: "#f5f5f5" }}>
                {image && (
                  <Image src={image} alt={it.name ?? it.slug} fill sizes="64px" className="object-contain p-1.5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                {/* The stored name, not the catalogue's: a product renamed since
                    the order must not rewrite what the customer bought. */}
                <div className="text-[15px] font-medium leading-snug" style={{ color: "#111" }}>
                  {it.name ?? it.slug}
                </div>
                {finish && (
                  <div className="text-[13px] mt-0.5" style={{ color: "var(--text-muted)" }}>{finish}</div>
                )}
                <div className="text-[13px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {L.qty} {it.quantity}
                </div>
              </div>
              <div className="text-[15px] tabular-nums shrink-0" style={{ color: "#111" }}>
                {money(it.priceEur, it.priceUah)}
              </div>
            </li>
          );
        })}
      </ul>

      {order.destination && (
        <>
          <h2 className="text-lg font-semibold mt-10 mb-3" style={{ color: "#111" }}>{L.delivery}</h2>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>{order.destination}</p>
        </>
      )}

      <p className="text-[13px] leading-relaxed mt-10 max-w-xl" style={{ color: "var(--text-faint)" }}>
        {L.help}
      </p>
    </div>
  );
}
