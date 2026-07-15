"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthContext";

export default function LoginForm({ locale }: { locale: string }) {
  const uk = locale === "uk";
  const { supabase } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const L = {
    title: uk ? "З поверненням" : "Welcome back",
    subtitle: uk ? "Увійдіть у свій акаунт Tactical HB." : "Sign in to your Tactical HB account.",
    email: uk ? "Електронна пошта" : "Email address",
    password: uk ? "Пароль" : "Password",
    signIn: uk ? "Увійти" : "Sign in",
    noAcc: uk ? "Ще не з нами?" : "Not a member yet?",
    join: uk ? "Приєднатися" : "Join us",
    badEmail: uk ? "Введіть дійсну електронну пошту." : "Enter a valid email address.",
    badCreds: uk ? "Невірна пошта або пароль." : "Incorrect email or password.",
  };

  const submit = async () => {
    setError(null);
    if (!supabase) return setError(uk ? "Вхід тимчасово недоступний." : "Sign-in is temporarily unavailable.");
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError(L.badEmail);
    if (!password) return setError(L.badCreds);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setError(L.badCreds);
    const redirect = searchParams.get("redirect");
    router.push(redirect || `/${locale}/account`);
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-6 flex justify-center" style={{ background: "#ffffff" }}>
      <div className="w-full max-w-[420px]">
        <h1 className="text-3xl font-semibold leading-tight mb-2" style={{ color: "#111" }}>{L.title}</h1>
        <p className="text-sm mb-8" style={{ color: "#707072" }}>{L.subtitle}</p>

        {error && (
          <div className="mb-4 text-sm px-4 py-3 rounded-lg" style={{ background: "#fdecec", color: "#b42318" }}>{error}</div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="flex flex-col gap-4">
          <input className="field rounded-lg" type="email" placeholder={L.email} value={email}
            onChange={(e) => setEmail(e.target.value)} autoFocus autoComplete="email" />
          <div className="relative">
            <input className="field rounded-lg pr-12" type={showPw ? "text" : "password"} placeholder={L.password}
              value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs uppercase tracking-wide" style={{ color: "#707072" }}>
              {showPw ? (uk ? "Сховати" : "Hide") : (uk ? "Показати" : "Show")}
            </button>
          </div>
          <button type="submit" disabled={loading}
            className="h-12 rounded-full text-[15px] font-medium disabled:opacity-60 mt-2"
            style={{ background: "#111", color: "#fff" }}>
            {loading ? "…" : L.signIn}
          </button>
        </form>

        <p className="text-sm mt-8" style={{ color: "#707072" }}>
          {L.noAcc} <Link href={`/${locale}/register`} className="underline" style={{ color: "#111" }}>{L.join}</Link>
        </p>
      </div>
    </div>
  );
}
