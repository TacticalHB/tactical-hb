"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { readSupabaseEnv } from "./env";

/** Browser Supabase client (public anon key; RLS protects all data).
    Returns null if the config is missing OR malformed, so the app degrades
    gracefully (logged-out) instead of crashing. This is constructed inside
    AuthProvider, which wraps every page — throwing here 500s the whole site,
    so the check must reject bad URLs, not just absent ones. */
export function createClient(): SupabaseClient | null {
  const env = readSupabaseEnv();
  if (!env) {
    if (typeof window !== "undefined") {
      console.error("Supabase env vars missing or malformed — auth features are disabled.");
    }
    return null;
  }
  return createBrowserClient(env.url, env.key);
}
