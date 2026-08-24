"use client";

import { useState } from "react";
import { t } from "@/lib/i18n-text";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthContext";

export default function LoginForm({ locale }: { locale: string }) {
  const { supabase } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const L = {
    title: t(locale, { uk: "З поверненням", en: "Welcome back", ja: "おかえりなさい", ar: "أهلًا بعودتك" }),
    subtitle: t(locale, { uk: "Увійдіть у свій акаунт Tactical HB.", en: "Sign in to your Tactical HB account.", ja: "Tactical HB のアカウントにログインしてください。", ar: "سجّل الدخول إلى حسابك في Tactical HB." }),
    email: t(locale, { uk: "Електронна пошта", en: "Email address", ja: "メールアドレス", ar: "البريد الإلكتروني" }),
    password: t(locale, { uk: "Пароль", en: "Password", ja: "パスワード", ar: "كلمة المرور" }),
    signIn: t(locale, { uk: "Увійти", en: "Sign in", ja: "ログイン", ar: "تسجيل الدخول" }),
    noAcc: t(locale, { uk: "Ще не з нами?", en: "Not a member yet?", ja: "アカウントをお持ちでない方", ar: "لست عضوًا بعد؟" }),
    join: t(locale, { uk: "Приєднатися", en: "Join us", ja: "登録する", ar: "انضم إلينا" }),
    badEmail: t(locale, { uk: "Введіть дійсну електронну пошту.", en: "Enter a valid email address.", ja: "有効なメールアドレスをご入力ください。", ar: "أدخل بريدًا إلكترونيًا صالحًا." }),
    badCreds: t(locale, { uk: "Невірна пошта або пароль.", en: "Incorrect email or password.", ja: "メールアドレスまたはパスワードが正しくありません。", ar: "البريد الإلكتروني أو كلمة المرور غير صحيحة." }),
  };

  const submit = async () => {
    setError(null);
    if (!supabase) return setError(t(locale, { uk: "Вхід тимчасово недоступний.", en: "Sign-in is temporarily unavailable.", ja: "ログインを一時的にご利用いただけません。", ar: "تسجيل الدخول غير متاح مؤقتًا." }));
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
            <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center min-w-11 h-11 text-xs uppercase tracking-wide" style={{ color: "#707072" }}>
              {showPw ? (t(locale, { uk: "Сховати", en: "Hide", ja: "隠す", ar: "إخفاء" })) : (t(locale, { uk: "Показати", en: "Show", ja: "表示", ar: "إظهار" }))}
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
