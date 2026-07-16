import { redirect } from "next/navigation";
import { createClient } from "./server";

/**
 * Guard for account pages that need a signed-in user.
 *
 * The /account layout deliberately does NOT redirect, because
 * /account/favourites is reachable by guests (they see their local hearts plus
 * a sign-in CTA). So each protected page calls this instead.
 */
export async function requireUser(locale: string) {
  const supabase = await createClient();
  if (!supabase) redirect(`/${locale}/login`);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login?redirect=/${locale}/account`);
  return { supabase, user };
}
