import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import ConsoleShell from "@/components/admin/ConsoleShell";

/* ---------------------------------------------------------------------------
   The console shell — chrome, not a guard.

   lib/admin-guard.ts is emphatic that auth checks live next to the data, in
   pages and actions, never in a layout — and that stays true. This layout
   decides only what FRAME renders: an admin gets the console (sidebar, exits),
   anyone else gets bare children, which immediately 404 or redirect through
   requireAdminPage. Without this check, a customer probing /uk/admin/stock
   would see the whole department list drawn around their 404 — the chrome
   itself would leak what the guard hides.

   The known layout caveat (no re-render on sibling navigation) costs nothing
   here: a lapsed admin session keeps an empty frame at worst, never data.
--------------------------------------------------------------------------- */

/**
 * The internal OS is never indexed.
 *
 * app/robots.ts disallows /{locale}/admin too, and the two do different jobs:
 * robots stops a crawler FETCHING the page, while this stops the URL being
 * listed from a link somewhere else — a disallowed page can still appear in
 * results as a bare URL. Every (shop) surface that must stay out already
 * carries this pair; the console did not, which only went unnoticed because
 * robots.txt said `Disallow: /` to the whole site until today.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;

  if (!isAdminEmail(user?.email)) return <>{children}</>;

  return <ConsoleShell locale={locale}>{children}</ConsoleShell>;
}
