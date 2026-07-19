import "server-only";

/* ---------------------------------------------------------------------------
   Who counts as an admin.

   An allowlist of emails in ADMIN_EMAILS (comma-separated) rather than a role
   column, because this is a single-owner store: no migration to run, and
   changing who has access is an env edit rather than a data change.

   FAILS CLOSED. If ADMIN_EMAILS is unset or empty, nobody is an admin — a
   missing env var must never hand out privileges. That's the opposite of how
   the Supabase client degrades (missing config → logged out), and deliberately
   so: there, failing open costs a session; here it would cost every voucher.

   Set it in Vercel → Settings → Environment Variables as a NORMAL variable:
     ADMIN_EMAILS=you@tactical-hb.com,someone@else.com
--------------------------------------------------------------------------- */

function adminList(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = adminList();
  if (list.length === 0) return false; // unset → nobody, never everybody
  return list.includes(email.trim().toLowerCase());
}
