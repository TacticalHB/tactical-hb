import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { readSupabaseEnv } from "./env";

/** Server Supabase client for Server Components / Route Handlers / Server Actions.
    Reads & refreshes the auth session from cookies.
    Returns null when the config is missing OR malformed — see ./env. */
export async function createClient() {
  const env = readSupabaseEnv();
  if (!env) return null;

  const cookieStore = await cookies();
  return createServerClient(
    env.url,
    env.key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // Called from a Server Component render can throw — safe to ignore
          // because the session is refreshed by middleware (proxy.ts) too.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}
