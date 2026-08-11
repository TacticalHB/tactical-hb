import { getLocale } from "next-intl/server";
import NotFoundPanel from "@/components/NotFoundPanel";

/**
 * The 404 for notFound() thrown inside the storefront — a product slug that
 * does not exist, an order id that is not the signed-in customer's.
 *
 * Being inside (shop) is the point: it renders with the navbar, the footer and
 * the cart drawer, so a customer who lands here is still in the shop rather
 * than on a bare page with no way back to it.
 */
export default async function ShopNotFound() {
  const locale = await getLocale();
  return <NotFoundPanel locale={locale} />;
}
