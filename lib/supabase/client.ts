"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Browser Supabase client (public anon key; RLS protects all data).
    Returns null if env vars are missing so the app degrades gracefully
    (logged-out) instead of crashing. */
export function createClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    if (typeof window !== "undefined") {
      console.error("Supabase env vars missing — auth features are disabled.");
    }
    return null;
  }
  return createBrowserClient(url, key);
}
