"use client";

/* ---------------------------------------------------------------------------
   Guest favourites storage (localStorage only).

   This is the *guest* layer. Logged-in users are backed by the `favourites`
   table in Supabase — see components/FavouritesProvider.tsx, which owns the
   guest-vs-user logic and merges this store into the DB on sign-in.
--------------------------------------------------------------------------- */

/** A row of public.favourites (product_slug is text: slug or any product id). */
export interface Favourite {
  user_id: string;
  product_slug: string;
  created_at: string;
}

export const FAVS_KEY = "tct-favs";
/** Fired in-tab whenever the guest store changes, so other tabs/instances sync. */
export const FAVS_EVENT = "tct-favs-changed";

export function getFavs(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(FAVS_KEY) || "[]");
    return Array.isArray(raw) ? raw.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

export function setFavs(next: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FAVS_KEY, JSON.stringify(next));
  } catch {}
  window.dispatchEvent(new CustomEvent(FAVS_EVENT, { detail: next }));
}

/** Called after a successful merge into Supabase so guest data isn't re-merged. */
export function clearFavs() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(FAVS_KEY);
  } catch {}
  window.dispatchEvent(new CustomEvent(FAVS_EVENT, { detail: [] }));
}
