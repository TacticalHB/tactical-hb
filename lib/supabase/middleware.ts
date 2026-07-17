import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { readSupabaseEnv } from "./env";

/** Refresh the Supabase auth session and attach any rotated cookies to the
    given response. Must run in middleware so Server Components see a fresh
    session. Call getUser() (not getSession) so tokens are validated/rotated.

    NEVER THROWS — and that is the entire point.
    This runs in middleware, so an uncaught error here doesn't break sign-in,
    it returns HTTP 500 for every page on the site: storefront, products, the
    lot. That happened once already. A missing check wasn't enough, because
    the env var can be present but *malformed*: createServerClient throws
    "Invalid supabaseUrl" on anything that isn't a valid http(s) URL, and
    NEXT_PUBLIC_* values are inlined at build time, so a bad value in Vercel
    lies dormant until the next deploy and then takes down the whole site.

    Worst case here must be "visitor appears logged out", never "site down". */
export async function updateSession(request: NextRequest, response: NextResponse) {
  const env = readSupabaseEnv();
  if (!env) return response; // unusable config -> skip refresh, keep the site up

  try {
    const supabase = createServerClient(
      env.url,
      env.key,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    await supabase.auth.getUser();
  } catch (e) {
    // Malformed env, Supabase unreachable, token refresh blowing up — none of
    // these are worth a 500 on a product page. Log and carry on logged-out.
    console.error(
      "[middleware] session refresh failed, continuing unauthenticated:",
      e instanceof Error ? e.message : e
    );
  }

  return response;
}
