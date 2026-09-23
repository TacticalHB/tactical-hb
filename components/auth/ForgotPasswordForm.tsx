"use client";

import { useState } from "react";
import Link from "next/link";
import { t } from "@/lib/i18n-text";
import { requestPasswordReset } from "@/app/actions/password-reset";

/* ---------------------------------------------------------------------------
   Step one: ask for the link.

   THE CONFIRMATION NEVER SAYS WHETHER THE ACCOUNT EXISTS. "If there's an
   account for that address, a link is on its way" is the whole sentence, and
   it is the same sentence for a customer of three years and for an address
   nobody has ever used. Saying "no account found" would turn this form into a
   way of testing whether a given person shops here. The server refuses to tell
   us either, so there is nothing here that could leak even by accident.

   ONE SUBMISSION PER VISIT. Once it has been sent the form is replaced rather
   than left sitting there with a live button: a second press tells the reader
   nothing new, and the rate limit behind it would quietly eat the third.
--------------------------------------------------------------------------- */

export default function ForgotPasswordForm({ locale }: { locale: string }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const L = {
    title: t(locale, {
      uk: "Забули пароль?",
      en: "Forgot your password?",
      ja: "パスワードをお忘れですか？",
      ar: "نسيت كلمة المرور؟",
    }),
    subtitle: t(locale, {
      uk: "Вкажіть свою пошту — надішлемо посилання для зміни пароля.",
      en: "Enter your email and we'll send you a link to set a new one.",
      ja: "メールアドレスをご入力ください。再設定用のリンクをお送りします。",
      ar: "أدخل بريدك الإلكتروني وسنرسل لك رابطًا لتعيين كلمة مرور جديدة.",
    }),
    email: t(locale, {
      uk: "Електронна пошта",
      en: "Email address",
      ja: "メールアドレス",
      ar: "البريد الإلكتروني",
    }),
    send: t(locale, {
      uk: "Надіслати посилання",
      en: "Send the link",
      ja: "リンクを送信",
      ar: "إرسال الرابط",
    }),
    sending: t(locale, { uk: "Надсилаємо…", en: "Sending…", ja: "送信中…", ar: "جارٍ الإرسال…" }),
    badEmail: t(locale, {
      uk: "Введіть дійсну електронну пошту.",
      en: "Enter a valid email address.",
      ja: "有効なメールアドレスをご入力ください。",
      ar: "أدخل بريدًا إلكترونيًا صالحًا.",
    }),
    sentTitle: t(locale, {
      uk: "Перевірте пошту",
      en: "Check your inbox",
      ja: "メールをご確認ください",
      ar: "تحقّق من بريدك",
    }),
    /* The deliberately uninformative sentence. See the note above. */
    sentBody: t(locale, {
      uk: "Якщо для цієї адреси є акаунт, посилання вже в дорозі. Воно діє один раз і спливає за годину.",
      en: "If there's an account for that address, a link is on its way. It works once and expires in an hour.",
      ja: "そのメールアドレスのアカウントがある場合、リンクをお送りしました。リンクは一度だけ有効で、1時間で期限切れになります。",
      ar: "إذا كان هناك حساب مرتبط بهذا البريد، فالرابط في طريقه إليك. وهو صالح لمرة واحدة وتنتهي صلاحيته خلال ساعة.",
    }),
    spam: t(locale, {
      uk: "Не бачите листа? Перевірте теку зі спамом.",
      en: "Don't see it? Check your spam folder.",
      ja: "見当たらない場合は、迷惑メールフォルダをご確認ください。",
      ar: "لا تراها؟ تحقّق من مجلد البريد العشوائي.",
    }),
    back: t(locale, {
      uk: "Повернутися до входу",
      en: "Back to sign in",
      ja: "ログインに戻る",
      ar: "العودة إلى تسجيل الدخول",
    }),
  };

  const submit = async () => {
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError(L.badEmail);
    setLoading(true);
    const res = await requestPasswordReset({ email, locale });
    setLoading(false);
    if (!res.ok) return setError(L.badEmail);
    setSent(true);
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-6 flex justify-center" style={{ background: "#ffffff" }}>
      <div className="w-full max-w-[420px]">
        {sent ? (
          <>
            <h1 className="text-3xl font-semibold leading-tight mb-2" style={{ color: "#111" }}>
              {L.sentTitle}
            </h1>
            <p className="text-sm mb-3" style={{ color: "#707072" }}>{L.sentBody}</p>
            <p className="text-sm mb-8" style={{ color: "#707072" }}>{L.spam}</p>
            <Link href={`/${locale}/login`} className="text-sm underline" style={{ color: "#111" }}>
              {L.back}
            </Link>
          </>
        ) : (
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
              <input
                id="fp-email"
                className="field rounded-lg"
                type="email"
                placeholder={L.email}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                autoComplete="email"
              />
              <button
                type="submit"
                disabled={loading}
                className="h-12 rounded-full text-[15px] font-medium transition-opacity hover:opacity-85 disabled:opacity-50"
                style={{ background: "#111", color: "#fff" }}
              >
                {loading ? L.sending : L.send}
              </button>
            </form>

            <p className="text-sm mt-6" style={{ color: "#707072" }}>
              <Link href={`/${locale}/login`} className="underline" style={{ color: "#111" }}>
                {L.back}
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
