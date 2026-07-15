import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

/** Refresh the Supabase auth session and attach any rotated cookies to the
    given response. Must run in middleware so Server Components see a fresh
    session. Call getUser() (not getSession) so tokens are validated/rotated. */
export async function updateSession(request: NextRequest, response: NextResponse) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response; // env missing -> skip session refresh, keep site up

  const supabase = createServerClient(
    url,
    key,
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
  return response;
}
