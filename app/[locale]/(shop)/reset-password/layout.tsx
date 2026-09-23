import type { Metadata } from "next";

/**
 * Never indexed, for the same reason /login isn't.
 *
 * app/robots.ts disallows this path too, and the two do different jobs: robots
 * stops a crawler fetching the page, noindex stops the URL being listed at all
 * — and a disallowed URL can still be indexed on the strength of an external
 * link alone. A password form has no business ranking for anything.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
