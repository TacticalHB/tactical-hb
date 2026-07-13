"use client";

/* Shared client-side favourites store (localStorage + in-tab event bus).
   Both the PDP heart and the navbar favourites menu read/write through here so
   they stay in sync live within the same tab, and across tabs via `storage`. */

export const FAVS_KEY = "tct-favs";
export const FAVS_EVENT = "tct-favs-changed";

export function getFavs(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(FAVS_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
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

export function toggleFav(slug: string): boolean {
  const favs = getFavs();
  const has = favs.includes(slug);
  setFavs(has ? favs.filter((s) => s !== slug) : [...favs, slug]);
  return !has;
}

export function removeFav(slug: string) {
  setFavs(getFavs().filter((s) => s !== slug));
}
