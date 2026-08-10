import { requireUser } from "@/lib/supabase/require-user";
import { CUSTOMER_ORDER_COLUMNS, toCustomerOrder } from "@/lib/account-orders";
import OrdersList from "@/components/account/OrdersList";

/* Page size — a single knob to turn when we add pagination/filters.
   To paginate later: swap .limit() for .range(from, to) and pass a page param. */
const PAGE_SIZE = 20;

/* ---------------------------------------------------------------------------
   The customer's order history.

   SCOPED TWICE, like the detail page: `.eq("user_id", user.id)` here, and the
   "orders self read" RLS policy (auth.uid() = user_id) underneath it. The
   filter is what a refactor drops; RLS is what still holds when it does.

   GUEST ORDERS ARE NOT CLAIMED BY EMAIL. An order placed without an account
   has user_id null, and matching those on email alone would let anyone who
   registered with an address see every order ever placed with it — an account
   takeover dressed up as a convenience. They appear here only if something
   with authority has attached a user_id to them, which nothing does today.
--------------------------------------------------------------------------- */

export default async function OrdersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { supabase, user } = await requireUser(locale); // signed-in only

  const { data, error } = await supabase
    .from("orders")
    .select(CUSTOMER_ORDER_COLUMNS)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  const orders = (data ?? []).map((o) => toCustomerOrder(o as unknown as Record<string, unknown>));

  return <OrdersList locale={locale} orders={orders} error={error?.message ?? null} />;
}
