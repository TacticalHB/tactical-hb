"use client";

import { useContext } from "react";
import { Ctx, type FavouritesCtx } from "@/components/FavouritesProvider";

/**
 * Favourites for guests and logged-in users.
 *
 *   const { favourites, isLoading, error, isFavourited, toggleFavourite } = useFavourites();
 *
 * Behaviour (owned by <FavouritesProvider>, mounted once in the locale layout):
 *  • Guest      -> localStorage
 *  • Logged in  -> public.favourites in Supabase (RLS: own rows only)
 *  • On SIGNED_IN, guest hearts are merged into the DB (union) and the guest
 *    store is cleared, so nothing is lost and nothing merges twice.
 *  • toggleFavourite is optimistic and rolls back + toasts on failure.
 */
export function useFavourites(): FavouritesCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useFavourites must be used within <FavouritesProvider>");
  return ctx;
}

export default useFavourites;
