"use client";

import { createContext, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { clearFavs, getFavs, setFavs, FAVS_EVENT } from "@/lib/favourites";

/* ---------------------------------------------------------------------------
   Favourites state — one owner for the whole app.

   Why a provider rather than per-component state: HeartButton renders on every
   product card, plus the nav badge and the account page. If each instance kept
   its own state it would run its own fetch + merge and the hearts would drift
   out of sync with the badge. This holds a single list; `useFavourites()` reads it.

   Two modes:
     • GUEST     -> favourites live in localStorage (lib/favourites.ts)
     • LOGGED IN -> favourites live in public.favourites (RLS: own rows only)

   On SIGNED_IN we merge guest -> DB (union, nothing lost), then clear the guest
   store so it can't be merged twice.
--------------------------------------------------------------------------- */

export type FavouritesCtx = {
  favourites: string[];
  isLoading: boolean;
  error: string | null;
  /** Components branch on this (e.g. the favourites page shows a guest CTA). */
  isLoggedIn: boolean;
  isFavourited: (productId: string) => boolean;
  toggleFavourite: (productId: string) => Promise<void>;
};

export const Ctx = createContext<FavouritesCtx | null>(null);

export function FavouritesProvider({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: string;
}) {
  const uk = locale === "uk";
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [favourites, setFavourites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const T = {
    added: uk ? "Додано в обране" : "Added to favourites",
    removed: uk ? "Прибрано з обраного" : "Removed from favourites",
    failed: uk ? "Не вдалося зберегти. Спробуйте ще раз." : "Couldn't save. Please try again.",
    merged: (n: number) =>
      uk ? `${n} збережених товарів перенесено у ваш акаунт` : `${n} saved item${n === 1 ? "" : "s"} moved to your account`,
    guestPush: uk
      ? "Збережено локально. Створіть безкоштовний акаунт, щоб зберігати обране на всіх пристроях."
      : "Saved locally. Create a free account to keep your favourites across devices.",
    createAccount: uk ? "Створити акаунт" : "Create account",
    logIn: uk ? "Увійти" : "Log in",
  };

  /**
   * Guest "soft push": the heart still saved locally — this just nudges them to
   * create an account so it syncs across devices. A fixed toast id means rapid
   * hearting replaces the toast instead of stacking them up.
   */
  const softPush = useCallback(() => {
    toast.custom(
      (id) => (
        <div
          className="w-[340px] max-w-[calc(100vw-32px)] rounded-xl p-4"
          style={{ background: "#fff", border: "1px solid var(--border)", boxShadow: "0 10px 34px rgba(0,0,0,0.18)" }}
        >
          <p className="text-[13px] leading-snug" style={{ color: "var(--ink)" }}>{T.guestPush}</p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => { toast.dismiss(id); router.push(`/${locale}/register`); }}
              className="h-9 px-4 rounded-full text-xs font-medium"
              style={{ background: "var(--ink)", color: "#fff" }}
            >
              {T.createAccount}
            </button>
            <button
              onClick={() => { toast.dismiss(id); router.push(`/${locale}/login`); }}
              className="h-9 px-4 rounded-full text-xs font-medium border"
              style={{ borderColor: "var(--border-strong)", color: "var(--ink)" }}
            >
              {T.logIn}
            </button>
          </div>
        </div>
      ),
      { id: "guest-fav-push", duration: 6000 }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, router]);

  /** Read the signed-in user's favourites from Supabase. */
  const fetchFromDb = useCallback(
    async (uid: string): Promise<string[]> => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("favourites")
        .select("product_slug")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: { product_slug: string }) => r.product_slug);
    },
    [supabase]
  );

  /**
   * Merge any guest favourites into the DB, then clear the guest store.
   * Upsert ignores duplicates, so this is a union — nothing is lost either way.
   */
  const mergeGuestIntoDb = useCallback(
    async (uid: string) => {
      if (!supabase) return;
      const guest = getFavs();
      if (guest.length === 0) return;
      const rows = guest.map((product_slug) => ({ user_id: uid, product_slug }));
      const { error } = await supabase
        .from("favourites")
        .upsert(rows, { onConflict: "user_id,product_slug", ignoreDuplicates: true });
      if (error) throw error;
      clearFavs(); // cleanup so we never merge the same guest data twice
      toast.success(T.merged(guest.length));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [supabase]
  );

  /** Load the right source for the current auth state. */
  const load = useCallback(
    async (uid: string | null, didJustSignIn = false) => {
      setError(null);
      try {
        if (!uid) {
          // GUEST: localStorage is the source of truth.
          setFavourites(getFavs());
          return;
        }
        // LOGGED IN: merge anything the guest saved, then read the DB.
        if (didJustSignIn) await mergeGuestIntoDb(uid);
        setFavourites(await fetchFromDb(uid));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load favourites");
        // Fall back to guest data so the UI still works.
        setFavourites(getFavs());
      } finally {
        setIsLoading(false);
      }
    },
    [fetchFromDb, mergeGuestIntoDb]
  );

  /* Auth wiring: resolve the current session, then react to sign in/out. */
  useEffect(() => {
    if (!supabase) {
      setFavourites(getFavs());
      setIsLoading(false);
      return;
    }
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const uid = data.session?.user?.id ?? null;
      setUserId(uid);
      // On a page load with an existing session we still merge: a guest may
      // have hearted things in another tab before this one loaded.
      load(uid, !!uid);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (event === "SIGNED_IN") {
        setIsLoading(true);
        load(uid, true); // merge guest -> DB on fresh sign-in
      } else if (event === "SIGNED_OUT") {
        setIsLoading(true);
        load(null); // back to the (now empty) guest store
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase, load]);

  /* Keep guests in sync across tabs. */
  useEffect(() => {
    if (userId) return; // logged-in state comes from the DB, not localStorage
    const sync = () => setFavourites(getFavs());
    window.addEventListener(FAVS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(FAVS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [userId]);

  const isFavourited = useCallback((productId: string) => favourites.includes(productId), [favourites]);

  /** Optimistic toggle: update UI first, persist after, roll back on failure. */
  const toggleFavourite = useCallback(
    async (productId: string) => {
      const wasFav = favourites.includes(productId);
      const previous = favourites;
      const next = wasFav ? favourites.filter((s) => s !== productId) : [productId, ...favourites];

      setFavourites(next); // optimistic
      setError(null);

      try {
        if (!userId || !supabase) {
          // GUEST: persist to localStorage only. Adding nudges them to sign up
          // (their heart is already saved either way); removing just confirms.
          setFavs(next);
          if (wasFav) toast.success(T.removed);
          else softPush();
          return;
        }
        if (wasFav) {
          const { error } = await supabase.from("favourites").delete().eq("user_id", userId).eq("product_slug", productId);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("favourites")
            .upsert({ user_id: userId, product_slug: productId }, { onConflict: "user_id,product_slug" });
          if (error) throw error;
        }
        toast.success(wasFav ? T.removed : T.added);
      } catch (e) {
        setFavourites(previous); // rollback
        setError(e instanceof Error ? e.message : "Failed to update favourites");
        toast.error(T.failed);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [favourites, userId, supabase, softPush]
  );

  const value: FavouritesCtx = {
    favourites,
    isLoading,
    error,
    isLoggedIn: !!userId,
    isFavourited,
    toggleFavourite,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
