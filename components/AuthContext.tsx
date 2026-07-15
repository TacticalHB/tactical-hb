"use client";

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export type Profile = {
  id: string;
  first_name: string | null;
  surname: string | null;
  date_of_birth: string | null;
  marketing_opt_in: boolean;
};

type AuthCtx = {
  supabase: ReturnType<typeof createClient>;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within <AuthProvider>");
  return c;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(
    async (u: User | null) => {
      if (!u || !supabase) {
        setProfile(null);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("id, first_name, surname, date_of_birth, marketing_opt_in")
        .eq("id", u.id)
        .single();
      setProfile((data as Profile) ?? null);
    },
    [supabase]
  );

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let active = true;
    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      if (!active) return;
      const u = data.session?.user ?? null;
      setUser(u);
      loadProfile(u).finally(() => active && setLoading(false));
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      loadProfile(u);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase, loadProfile]);

  const refreshProfile = useCallback(() => loadProfile(user), [loadProfile, user]);
  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }, [supabase]);

  const value: AuthCtx = { supabase, user, profile, loading, refreshProfile, signOut };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
