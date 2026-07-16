import "server-only";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

/* ---------------------------------------------------------------------------
   Service-role Supabase client — SERVER ONLY.

   Bypasses RLS, so it must never reach the browser. The `server-only` import
   above makes the build fail if this file is ever pulled into a client bundle.

   Needs SUPABASE_SERVICE_ROLE_KEY (note: NOT NEXT_PUBLIC_*, or it would be
   inlined into client JS). Add it in .env.local and in Vercel →
   Settings → Environment Variables.

   Used for trusted writes the customer must not be able to make themselves —
   today: marking a voucher used; soon: the Shopify order webhook.
--------------------------------------------------------------------------- */

export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Supabase admin client unavailable: set SUPABASE_SERVICE_ROLE_KEY (and NEXT_PUBLIC_SUPABASE_URL) in your environment."
    );
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
