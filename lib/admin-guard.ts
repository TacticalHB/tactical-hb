import "server-only";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { isAdminEmail } from "@/lib/admin";

/* ---------------------------------------------------------------------------
   The two admin checks, in one place.

   THESE ARE NOT INTERCHANGEABLE, and the split is the point.

   requireAdminPage() guards a screen. requireAdminActor() guards a mutation,
   and it is the real boundary: Next exposes every server action as its own
   POST endpoint, so a check that lives only on the page is theatre — anyone
   holding the action id could write. Every action calls it for itself, exactly
   as saveOrderTtn() has always done.

   Deliberately NOT done in a layout. Layouts don't re-render on navigation
   between sibling routes, so a session that lapses mid-visit would keep an
   already-rendered admin shell alive; the Next authentication guide says as
   much. Checks belong next to the data.
--------------------------------------------------------------------------- */

/**
 * Guard an admin page. 404s rather than showing "forbidden", so the existence
 * of /admin isn't advertised to a customer poking at URLs — the same choice
 * /admin/orders already makes.
 */
export async function requireAdminPage(locale: string): Promise<{ email: string }> {
  const { user } = await requireUser(locale);
  if (!isAdminEmail(user.email)) notFound();
  return { email: user.email! };
}

/**
 * Establish who is calling a server action.
 *
 * Returns the admin's email — which the stock and cost tables record as
 * created_by, so every manual change carries a name — or null, which the
 * caller must turn into a refusal. Deliberately vague to the caller: a
 * stranger probing the endpoint learns nothing about who is an admin.
 */
export async function requireAdminActor(): Promise<string | null> {
  const supabase = await createClient();
  const caller = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!isAdminEmail(caller?.email)) {
    console.warn("[admin] refused an action for", caller?.email ?? "anonymous");
    return null;
  }
  return caller!.email!;
}
