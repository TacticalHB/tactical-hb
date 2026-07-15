import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Server Supabase client for Server Components / Route Handlers / Server Actions.
    Reads & refreshes the auth session from cookies. */
export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const cookieStore = await cookies();
  return createServerClient(
    url,
    key,
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
