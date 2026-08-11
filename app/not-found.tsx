import { getLocale } from "next-intl/server";
import NotFoundPanel from "@/components/NotFoundPanel";

/**
 * The 404 for a URL that matches no route at all.
 *
 * This one renders in app/layout.tsx without the storefront chrome, so it has
 * no navbar to go back through — which is exactly why NotFoundPanel leads with
 * two links rather than relying on the header.
 *
 * getLocale() still resolves here: the proxy locale-prefixes every non-API,
 * non-file path before it reaches routing, so an unmatched /nonsense arrives
 * as /uk/nonsense and the locale is known even though no page matched.
 */
export default async function RootNotFound() {
  const locale = await getLocale();
  return <NotFoundPanel locale={locale} />;
}
