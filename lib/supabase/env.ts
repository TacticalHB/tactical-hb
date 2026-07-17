/**
 * Read and VALIDATE the public Supabase env pair.
 *
 * Returns null when the config is unusable — missing *or* malformed — so every
 * caller can degrade to "logged out" instead of throwing.
 *
 * Why validation, not just a presence check:
 * @supabase/ssr throws "Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL"
 * the moment you hand it anything that isn't a real URL. Because NEXT_PUBLIC_*
 * values are inlined at BUILD time, a bad value in the Vercel dashboard is
 * invisible on the running site and only detonates on the next deploy — which
 * then looks like "the last commit broke the site" when it did nothing of the
 * sort. Worse, this construction happens in middleware and in AuthProvider,
 * which wrap every route, so one bad character returns HTTP 500 for the entire
 * storefront. That is exactly what happened on 2026-07-17.
 *
 * The rule: bad Supabase config costs you auth, never the whole site.
 *
 * NOTE: process.env.NEXT_PUBLIC_* must be referenced literally here — Next
 * inlines these by static text replacement, so they cannot be read dynamically.
 */
export function readSupabaseEnv(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  } catch {
    return null; // not a URL at all (truncated, a key pasted into the URL field, …)
  }

  return { url, key };
}
