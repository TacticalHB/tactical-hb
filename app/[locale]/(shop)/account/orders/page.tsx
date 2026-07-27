import { requireUser } from "@/lib/supabase/require-user";
import OrdersList, { type OrderWithItems } from "@/components/account/OrdersList";

/* Page size — a single knob to turn when we add pagination/filters.
   To paginate later: swap .limit() for .range(from, to) and pass a page param. */
const PAGE_SIZE = 20;

export default async function OrdersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { supabase, user } = await requireUser(locale); // signed-in only

  // One round-trip: orders + their line items via the order_items FK.
  // RLS scopes orders to the user, and order_items inherit that ownership.
  const { data, error } = await supabase
    .from("orders")
    .select("id, amount_eur, source, created_at, order_items(id, product_id, product_name, quantity, price_eur)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  const orders: OrderWithItems[] = (data ?? []).map((o) => ({
    id: String(o.id),
    amount_eur: Number(o.amount_eur),
    source: String(o.source),
    created_at: String(o.created_at),
    items: (o.order_items ?? []).map((it) => ({
      id: String(it.id),
      product_id: String(it.product_id),
      product_name: it.product_name ? String(it.product_name) : null,
      quantity: Number(it.quantity),
      price_eur: Number(it.price_eur),
    })),
  }));

  return <OrdersList locale={locale} orders={orders} error={error?.message ?? null} />;
}
