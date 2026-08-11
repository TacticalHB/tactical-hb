import type { Metadata } from "next";

/**
 * Checkout is never indexed.
 *
 * app/robots.ts disallows this path too, but the two do different jobs:
 * robots stops a crawler FETCHING the page, while noindex stops the URL being
 * listed at all — and a disallowed URL can still be indexed on the strength of
 * an external link alone, with nothing but the anchor text to describe it.
 * A checkout in a search result is a dead end at best and a half-finished order at worst.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
