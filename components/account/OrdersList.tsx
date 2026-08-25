import Link from "next/link";
import { t } from "@/lib/i18n-text";
import { orderTotalText, type CustomerOrder } from "@/lib/account-orders";
import { formatWhen, statusLabel } from "@/lib/orders-display";

/* ---------------------------------------------------------------------------
   Order history: one line per order, each a door to its detail page.

   IT USED TO BE AN ACCORDION that expanded a table of line items in place,
   which was the right call when there was nowhere else for them to go. There
   is now — /account/orders/[id] — and keeping both would mean two renderings
   of the same order that have to agree forever. The row shows what you scan
   for (which order, when, how much, where it has got to) and the detail page
   holds the rest.

   A SERVER COMPONENT NOW. The accordion was the only reason this shipped
   JavaScript; a list of links needs none.

   THE STATUS PILL IS NOT COLOUR-CODED BY MOOD. Green-for-good, red-for-bad
   turns an order history into a dashboard of alarms. Only the live step gets
   the accent; everything else is ink on the page's own surface — the same
   restraint the timeline uses.
--------------------------------------------------------------------------- */

export type { CustomerOrder };

export default function OrdersList({
  locale,
  orders,
  error,
}: {
  locale: string;
  orders: CustomerOrder[];
  error?: string | null;
}) {

  const L = {
    title: t(locale, { uk: "Замовлення", en: "Orders", ja: "ご注文", ar: "الطلبات" }),
    empty: t(locale, { uk: "Замовлень поки немає", en: "No orders yet", ja: "ご注文はまだありません", ar: "لا طلبات بعد" }),
    emptyHint: t(locale, { uk: "Коли ви зробите замовлення, воно з'явиться тут — зі статусом, накладною та нарахованими XP.", en: "Once you place an order it'll appear here — with its status, tracking, and the XP you earned.", ja: "ご注文いただくと、状況、追跡番号、獲得した XP とあわせてここに表示されます。", ar: "بمجرد تقديمك طلبًا سيظهر هنا — مع حالته وتتبّعه ونقاط الخبرة التي كسبتها." }),
    browse: t(locale, { uk: "Переглянути колекцію", en: "Explore the collection", ja: "コレクションを見る", ar: "تصفّح المجموعة" }),
    buildSetup: t(locale, { uk: "Зібрати сет", en: "Build a setup", ja: "セットを組む", ar: "كوّن طقمك" }),
    items: (n: number) => items(locale, n),
    order: t(locale, { uk: "Замовлення", en: "Order", ja: "ご注文", ar: "الطلب" }),
  };

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
          <p className="text-sm mt-1 mb-6 max-w-sm mx-auto" style={{ color: "var(--text-muted)" }}>{L.emptyHint}</p>
          <Link
            href={`/${locale}/products`}
            className="inline-block h-11 leading-[44px] px-7 rounded-full text-sm font-medium transition-opacity hover:opacity-85"
            style={{ background: "#111", color: "#fff" }}
          >
            {L.browse}
          </Link>
          <div className="mt-5">
            <Link
              href={`/${locale}/setup`}
              className="inline-flex items-center h-11 text-[13px] underline underline-offset-4 transition-opacity hover:opacity-70"
              style={{ color: "var(--text-muted)" }}
            >
              {L.buildSetup}
            </Link>
          </div>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((o) => {
            const count = o.items.reduce((s, i) => s + i.quantity, 0);
            const total = orderTotalText(o);
            const live = o.status !== "delivered" && o.status !== "cancelled";

            return (
              <li key={o.id}>
                <Link
                  href={`/${locale}/account/orders/${o.id}`}
                  className="rounded-2xl border px-5 py-4 flex items-center gap-4 transition-colors hover:bg-[color:var(--bg-soft)]"
                  style={{ borderColor: "var(--border)", display: "flex" }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium" style={{ color: "#111" }}>
                      {L.order} {o.reference}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {formatWhen(o.createdAt, locale)} · {L.items(count)}
                    </div>
                  </div>

                  <span
                    className="shrink-0 text-[11px] px-2.5 py-1 rounded-full border whitespace-nowrap"
                    style={{
                      color: live ? "var(--accent-ink)" : "var(--text-muted)",
                      borderColor: live ? "var(--accent-line)" : "var(--border)",
                    }}
                  >
                    {statusLabel(o.status, locale)}
                  </span>

                  <div className="text-base font-semibold tabular-nums shrink-0" style={{ color: "#111" }}>
                    {total.text}
                  </div>

                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="#111" strokeWidth="1.6" className="shrink-0" aria-hidden="true">
                    <path d="M7 4l6 6-6 6" />
                  </svg>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* Arabic counts a noun four different ways and writes no numeral at 1 or 2, so
   the count and the word cannot be composed the way the other three do. Same
   rule as checkout's itemCount — see components/checkout/OrderSummaryPanel. */
function items(locale: string, n: number): string {
  if (locale === "uk") return `${n} позицій`;
  if (locale === "ja") return `${n} 点`;
  if (locale === "ar") {
    if (n === 1) return "منتج واحد";
    if (n === 2) return "منتجان";
    if (n <= 10) return `${n} منتجات`;
    return `${n} منتجًا`;
  }
  return `${n} item${n === 1 ? "" : "s"}`;
}
