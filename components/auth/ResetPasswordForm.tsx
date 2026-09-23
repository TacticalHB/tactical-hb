"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { t } from "@/lib/i18n-text";
import { useAuth } from "@/components/AuthContext";
import { pwOk, pwHint } from "@/lib/password-rules";

/* ---------------------------------------------------------------------------
   Step two: the link has been followed, so set the new password.

   THE LINK IS THE CREDENTIAL, AND THE BROWSER CLIENT HAS ALREADY SPENT IT.
   Supabase's recovery link lands here carrying a token in the URL fragment;
   createBrowserClient picks it up on construction (detectSessionInUrl) and
   turns it into a session. So by the time this component can do anything there
   is either a session — the link was good — or there is not.

   WHICH IS WHY THIS WAITS RATHER THAN ASKS ONCE. That exchange is asynchronous
   and races the first render, so a single getSession() on mount reports "no
   session" for a perfectly good link roughly as often as not. This listens for
   the auth event as well and only calls the link dead after a grace period.

   AN EXPIRED LINK SAYS SO, AND SAYS WHAT TO DO. Supabase puts the reason in
   the fragment as error/error_description; the exact wording is theirs and not
   worth showing a customer, but the fact of it is the difference between "this
   link has expired, ask for another" and a form that silently does nothing.
--------------------------------------------------------------------------- */

/** How long to let the client finish the token exchange before giving up. */
const GRACE_MS = 5000;

type Stage = "checking" | "ready" | "invalid" | "done";

export default function ResetPasswordForm({ locale }: { locale: string }) {
  const { supabase } = useAuth();
  const router = useRouter();

  const [stage, setStage] = useState<Stage>("checking");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const L = {
    title: t(locale, {
      uk: "Новий пароль",
      en: "Choose a new password",
      ja: "新しいパスワードの設定",
      ar: "اختر كلمة مرور جديدة",
    }),
    subtitle: t(locale, {
      uk: "Введіть новий пароль для свого акаунта.",
      en: "Enter a new password for your account.",
      ja: "アカウントの新しいパスワードをご入力ください。",
      ar: "أدخل كلمة مرور جديدة لحسابك.",
    }),
    password: t(locale, { uk: "Новий пароль", en: "New password", ja: "新しいパスワード", ar: "كلمة مرور جديدة" }),
    save: t(locale, { uk: "Зберегти пароль", en: "Save password", ja: "パスワードを保存", ar: "حفظ كلمة المرور" }),
    saving: t(locale, { uk: "Зберігаємо…", en: "Saving…", ja: "保存中…", ar: "جارٍ الحفظ…" }),
    show: t(locale, { uk: "Показати", en: "Show", ja: "表示", ar: "إظهار" }),
    hide: t(locale, { uk: "Сховати", en: "Hide", ja: "非表示", ar: "إخفاء" }),
    checking: t(locale, {
      uk: "Перевіряємо посилання…",
      en: "Checking your link…",
      ja: "リンクを確認しています…",
      ar: "جارٍ التحقّق من الرابط…",
    }),
    invalidTitle: t(locale, {
      uk: "Посилання не діє",
      en: "That link has expired",
      ja: "リンクの有効期限が切れています",
      ar: "انتهت صلاحية الرابط",
    }),
    invalidBody: t(locale, {
      uk: "Посилання діє один раз і лише годину. Замовте нове — це займе хвилину.",
      en: "A reset link works once, and only for an hour. Ask for a new one — it takes a moment.",
      ja: "再設定リンクは一度きり、1時間のみ有効です。お手数ですが、もう一度お申し込みください。",
      ar: "رابط إعادة التعيين صالح لمرة واحدة ولمدة ساعة فقط. اطلب رابطًا جديدًا — لن يستغرق الأمر سوى لحظة.",
    }),
    askAgain: t(locale, {
      uk: "Надіслати нове посилання",
      en: "Send a new link",
      ja: "新しいリンクを送る",
      ar: "إرسال رابط جديد",
    }),
    doneTitle: t(locale, {
      uk: "Пароль змінено",
      en: "Password updated",
      ja: "パスワードを更新しました",
      ar: "تم تحديث كلمة المرور",
    }),
    doneBody: t(locale, {
      uk: "Ви увійшли в акаунт. Зараз перенаправимо вас.",
      en: "You're signed in. Taking you to your account.",
      ja: "ログインしました。アカウントへ移動します。",
      ar: "تم تسجيل دخولك. جارٍ نقلك إلى حسابك.",
    }),
    failed: t(locale, {
      uk: "Не вдалося зберегти пароль. Спробуйте ще раз.",
      en: "Couldn't save the password. Please try again.",
      ja: "パスワードを保存できませんでした。もう一度お試しください。",
      ar: "تعذّر حفظ كلمة المرور. حاول مرة أخرى.",
    }),
    unavailable: t(locale, {
      uk: "Зміна пароля тимчасово недоступна.",
      en: "Password reset is temporarily unavailable.",
      ja: "パスワードの再設定を一時的にご利用いただけません。",
      ar: "إعادة تعيين كلمة المرور غير متاحة مؤقتًا.",
    }),
  };

  useEffect(() => {
    if (!supabase) return setStage("invalid");

    /* Supabase reports a dead link in the fragment rather than as a status, so
       this is the one case that can be answered immediately. */
    if (typeof window !== "undefined" && /error(_code|_description)?=/.test(window.location.hash)) {
      return setStage("invalid");
    }

    let settled = false;
    const ready = () => {
      if (settled) return;
      settled = true;
      setStage("ready");
    };

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) ready();
    });

    /* PASSWORD_RECOVERY is the event this flow actually produces; SIGNED_IN
       covers the client having already finished before we subscribed. */
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        ready();
      }
    });

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        setStage("invalid");
      }
    }, GRACE_MS);

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [supabase]);

  const submit = async () => {
    setError(null);
    if (!supabase) return setError(L.unavailable);
    if (!pwOk(password)) return setError(pwHint(locale));
    setSaving(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (err) return setError(L.failed);
    setStage("done");
    /* The recovery session IS a session, so there is nowhere to sign in to —
       they are already there. Straight to the account. */
    setTimeout(() => router.push(`/${locale}/account`), 1200);
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-6 flex justify-center" style={{ background: "#ffffff" }}>
      <div className="w-full max-w-[420px]">
        {stage === "checking" && (
          <p className="text-sm" style={{ color: "#707072" }}>{L.checking}</p>
        )}

        {stage === "invalid" && (
          <>
            <h1 className="text-3xl font-semibold leading-tight mb-2" style={{ color: "#111" }}>
              {L.invalidTitle}
            </h1>
            <p className="text-sm mb-8" style={{ color: "#707072" }}>{L.invalidBody}</p>
            <Link
              href={`/${locale}/forgot-password`}
              className="inline-flex items-center justify-center h-12 px-8 rounded-full text-[15px] font-medium transition-opacity hover:opacity-85"
              style={{ background: "#111", color: "#fff" }}
            >
              {L.askAgain}
            </Link>
          </>
        )}

        {stage === "done" && (
          <>
            <h1 className="text-3xl font-semibold leading-tight mb-2" style={{ color: "#111" }}>
              {L.doneTitle}
            </h1>
            <p className="text-sm" style={{ color: "#707072" }}>{L.doneBody}</p>
          </>
        )}

        {stage === "ready" && (
          <>
            <h1 className="text-3xl font-semibold leading-tight mb-2" style={{ color: "#111" }}>
              {L.title}
            </h1>
            <p className="text-sm mb-8" style={{ color: "#707072" }}>{L.subtitle}</p>

            {error && (
              <div className="mb-4 text-sm px-4 py-3 rounded-lg" style={{ background: "#fdecec", color: "#b42318" }}>
                {error}
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="flex flex-col gap-4">
              <div className="relative">
                <input
                  id="rp-password"
                  className="field rounded-lg pr-16"
                  type={showPw ? "text" : "password"}
                  placeholder={L.password}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-[12px] tracking-[0.08em] uppercase"
                  style={{ color: "#707072" }}
                >
                  {showPw ? L.hide : L.show}
                </button>
              </div>

              <p className="text-[13px]" style={{ color: "#8a8a8e" }}>{pwHint(locale)}</p>

              <button
                type="submit"
                disabled={saving || !password}
                className="h-12 rounded-full text-[15px] font-medium transition-opacity hover:opacity-85 disabled:opacity-50"
                style={{ background: "#111", color: "#fff" }}
              >
                {saving ? L.saving : L.save}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
