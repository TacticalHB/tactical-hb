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
