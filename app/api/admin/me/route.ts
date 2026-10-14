import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { isWholesaleUser } from "@/lib/wholesale-portal";

/* ---------------------------------------------------------------------------
   Am *I* an admin? — the one question this answers, and only about the caller.

   Exists because ADMIN_EMAILS is server-only, yet the person icon in the shop
   nav is a client component that must decide where a click lands: the account
   dropdown for a customer, straight into the console for an admin (Phase E).
   Always 200 with a boolean; it reveals nothing about anyone else and nothing
   about which emails are on the list.

   `wholesale` rides along (14 Oct 2026) so the same menu can drop the Loyalty
   link for a wholesale account without a second request. Also only about the
   caller.
--------------------------------------------------------------------------- */

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const wholesale = user ? await isWholesaleUser(user.id) : false;
  return Response.json({ admin: isAdminEmail(user?.email), wholesale });
}
