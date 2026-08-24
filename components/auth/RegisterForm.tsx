"use client";

import { useState } from "react";
import { t } from "@/lib/i18n-text";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthContext";

const pwRules = (pw: string) => ({
  len: pw.length >= 8,
  cases: /[a-z]/.test(pw) && /[A-Z]/.test(pw),
  num: /[0-9]/.test(pw),
});

export default function RegisterForm({ locale }: { locale: string }) {
  const { supabase, refreshProfile } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<"email" | "details">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [dob, setDob] = useState({ d: "", m: "", y: "" });
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const L = {
    title: t(locale, { uk: "Приєднуйтесь до Tactical HB", en: "Now let's make you a member.", ja: "アカウントを作成しましょう。", ar: "لنجعلك عضوًا الآن." }),
    emailLabel: t(locale, { uk: "Електронна пошта", en: "Email address", ja: "メールアドレス", ar: "البريد الإلكتروني" }),
    continue: t(locale, { uk: "Продовжити", en: "Continue", ja: "次へ", ar: "متابعة" }),
    sentTo: t(locale, { uk: "Ми надіслали код на", en: "We've sent a code to", ja: "コードをお送りしました：", ar: "أرسلنا رمزًا إلى" }),
    edit: t(locale, { uk: "Змінити", en: "Edit", ja: "変更", ar: "تعديل" }),
    code: t(locale, { uk: "Код підтвердження", en: "Verification code", ja: "確認コード", ar: "رمز التحقق" }),
    firstName: t(locale, { uk: "Ім'я", en: "First name", ja: "名", ar: "الاسم الأول" }),
    surname: t(locale, { uk: "Прізвище", en: "Surname", ja: "姓", ar: "اسم العائلة" }),
    dob: t(locale, { uk: "Дата народження", en: "Date of Birth", ja: "生年月日", ar: "تاريخ الميلاد" }),
    day: t(locale, { uk: "День", en: "Day", ja: "日", ar: "يوم" }),
    month: t(locale, { uk: "Місяць", en: "Month", ja: "月", ar: "شهر" }),
    year: t(locale, { uk: "Рік", en: "Year", ja: "年", ar: "سنة" }),
    password: t(locale, { uk: "Пароль", en: "Password", ja: "パスワード", ar: "كلمة المرور" }),
    min8: t(locale, { uk: "Мінімум 8 символів", en: "Minimum of 8 characters", ja: "8文字以上", ar: "8 أحرف على الأقل" }),
    mixed: t(locale, { uk: "Великі, малі літери та цифра", en: "Uppercase, lowercase letters and one number", ja: "大文字・小文字・数字を含む", ar: "حروف كبيرة وصغيرة ورقم واحد" }),
    marketing: t(locale, { uk: "Отримувати новини та пропозиції Tactical HB", en: "Sign up for emails to get updates, offers and member benefits.", ja: "最新情報、ご案内、会員特典をメールで受け取る。", ar: "اشترك في الرسائل لتصلك المستجدات والعروض ومزايا الأعضاء." }),
    terms: t(locale, { uk: "Я погоджуюсь з Умовами використання та Політикою конфіденційності", en: "I agree to the Terms of Use and Privacy Policy.", ja: "利用規約とプライバシーポリシーに同意します。", ar: "أوافق على شروط الاستخدام وسياسة الخصوصية." }),
    create: t(locale, { uk: "Створити акаунт", en: "Create Account", ja: "アカウントを作成", ar: "إنشاء حساب" }),
    haveAcc: t(locale, { uk: "Вже маєте акаунт?", en: "Already a member?", ja: "すでに会員の方", ar: "عضو بالفعل؟" }),
    signIn: t(locale, { uk: "Увійти", en: "Sign in", ja: "ログイン", ar: "تسجيل الدخول" }),
    badEmail: t(locale, { uk: "Введіть дійсну електронну пошту.", en: "Enter a valid email address.", ja: "有効なメールアドレスをご入力ください。", ar: "أدخل بريدًا إلكترونيًا صالحًا." }),
    needCode: t(locale, { uk: "Введіть код з листа.", en: "Enter the code from your email.", ja: "メールに記載のコードをご入力ください。", ar: "أدخل الرمز الوارد في بريدك." }),
    needName: t(locale, { uk: "Вкажіть ім'я та прізвище.", en: "Please enter your first name and surname.", ja: "姓と名をご入力ください。", ar: "يرجى إدخال اسمك الأول واسم العائلة." }),
    needDob: t(locale, { uk: "Вкажіть дату народження.", en: "Please enter your date of birth.", ja: "生年月日をご入力ください。", ar: "يرجى إدخال تاريخ ميلادك." }),
    weakPw: t(locale, { uk: "Пароль не відповідає вимогам.", en: "Password doesn't meet the requirements.", ja: "パスワードが条件を満たしていません。", ar: "كلمة المرور لا تستوفي المتطلبات." }),
    needTerms: t(locale, { uk: "Потрібно прийняти умови.", en: "You must agree to the Terms & Privacy Policy.", ja: "利用規約とプライバシーポリシーへの同意が必要です。", ar: "عليك الموافقة على الشروط وسياسة الخصوصية." }),
  };

  const sendCode = async () => {
    setError(null);
    if (!supabase) return setError(t(locale, { uk: "Реєстрація тимчасово недоступна.", en: "Sign-up is temporarily unavailable.", ja: "アカウント登録を一時的にご利用いただけません。", ar: "إنشاء الحساب غير متاح مؤقتًا." }));
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError(L.badEmail);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    setLoading(false);
    if (error) return setError(error.message);
    setStep("details");
  };

  const submit = async () => {
    setError(null);
    if (!supabase) return setError(t(locale, { uk: "Реєстрація тимчасово недоступна.", en: "Sign-up is temporarily unavailable.", ja: "アカウント登録を一時的にご利用いただけません。", ar: "إنشاء الحساب غير متاح مؤقتًا." }));
    const r = pwRules(password);
    if (!code.trim()) return setError(L.needCode);
    if (!firstName.trim() || !surname.trim()) return setError(L.needName);
    if (!dob.d || !dob.m || !dob.y) return setError(L.needDob);
    if (!(r.len && r.cases && r.num)) return setError(L.weakPw);
    if (!terms) return setError(L.needTerms);

    setLoading(true);
    // New-signup OTPs verify as type "signup"; login/existing OTPs as "email".
    // Try "email" first, fall back to "signup" so both cases work.
    let verify = await supabase.auth.verifyOtp({ email, token: code.trim(), type: "email" });
    if (verify.error) {
      verify = await supabase.auth.verifyOtp({ email, token: code.trim(), type: "signup" });
    }
    const { data, error: vErr } = verify;
    if (vErr || !data.user) {
      setLoading(false);
      return setError(vErr?.message || (t(locale, { uk: "Невірний код.", en: "Invalid or expired code.", ja: "コードが正しくないか、有効期限が切れています。", ar: "الرمز غير صحيح أو منتهي الصلاحية." })));
    }
    const date_of_birth = `${dob.y.padStart(4, "0")}-${dob.m.padStart(2, "0")}-${dob.d.padStart(2, "0")}`;
    const { error: uErr } = await supabase.auth.updateUser({
      password,
      data: { first_name: firstName, surname, date_of_birth, marketing_opt_in: marketing },
    });
    if (uErr) {
      setLoading(false);
      return setError(uErr.message);
    }
    await supabase.from("profiles").upsert({ id: data.user.id, first_name: firstName, surname, date_of_birth, marketing_opt_in: marketing });
    await refreshProfile();
    router.push(`/${locale}/account`);
  };

  const r = pwRules(password);

  return (
    <div className="min-h-screen pt-24 pb-16 px-6 flex justify-center" style={{ background: "#ffffff" }}>
      <div className="w-full max-w-[420px]">
        <h1 className="text-3xl font-semibold leading-tight mb-8" style={{ color: "#111" }}>{L.title}</h1>

        {error && (
          <div className="mb-4 text-sm px-4 py-3 rounded-lg" style={{ background: "#fdecec", color: "#b42318" }}>{error}</div>
        )}

        {step === "email" ? (
          <form onSubmit={(e) => { e.preventDefault(); sendCode(); }} className="flex flex-col gap-4">
            <input className="field rounded-lg" type="email" placeholder={L.emailLabel} value={email}
              onChange={(e) => setEmail(e.target.value)} autoFocus autoComplete="email" />
            <button type="submit" disabled={loading}
              className="h-12 rounded-full text-[15px] font-medium disabled:opacity-60"
              style={{ background: "#111", color: "#fff" }}>
              {loading ? "…" : L.continue}
            </button>
          </form>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="flex flex-col gap-4">
            <p className="text-sm" style={{ color: "#707072" }}>
              {L.sentTo} <span style={{ color: "#111" }}>{email}</span>{" "}
              <button type="button" className="underline" onClick={() => setStep("email")}>{L.edit}</button>
            </p>
            <input className="field rounded-lg tracking-[0.3em]" inputMode="numeric" placeholder={L.code} value={code}
              onChange={(e) => setCode(e.target.value)} autoFocus />
            <div className="flex gap-3">
              <input className="field rounded-lg" placeholder={L.firstName} value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" />
              <input className="field rounded-lg" placeholder={L.surname} value={surname} onChange={(e) => setSurname(e.target.value)} autoComplete="family-name" />
            </div>

            <div className="relative">
              <input className="field rounded-lg pr-12" type={showPw ? "text" : "password"} placeholder={L.password}
                value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
              <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center min-w-11 h-11 text-xs uppercase tracking-wide" style={{ color: "#707072" }}>
                {showPw ? (t(locale, { uk: "Сховати", en: "Hide", ja: "隠す", ar: "إخفاء" })) : (t(locale, { uk: "Показати", en: "Show", ja: "表示", ar: "إظهار" }))}
              </button>
            </div>
            <ul className="text-xs flex flex-col gap-1 -mt-1">
              <li style={{ color: r.len ? "#0a7d2c" : "#a0a0a0" }}>{r.len ? "✓" : "○"} {L.min8}</li>
              <li style={{ color: r.cases && r.num ? "#0a7d2c" : "#a0a0a0" }}>{r.cases && r.num ? "✓" : "○"} {L.mixed}</li>
            </ul>

            <div>
              <label className="block text-sm mb-1.5" style={{ color: "#111" }}>{L.dob}</label>
              <div className="flex gap-3">
                <input className="field rounded-lg text-center" inputMode="numeric" maxLength={2} placeholder={L.day} value={dob.d} onChange={(e) => setDob({ ...dob, d: e.target.value })} />
                <input className="field rounded-lg text-center" inputMode="numeric" maxLength={2} placeholder={L.month} value={dob.m} onChange={(e) => setDob({ ...dob, m: e.target.value })} />
                <input className="field rounded-lg text-center" inputMode="numeric" maxLength={4} placeholder={L.year} value={dob.y} onChange={(e) => setDob({ ...dob, y: e.target.value })} />
              </div>
            </div>

            <label className="flex items-start gap-3 text-sm mt-1" style={{ color: "#111" }}>
              <input type="checkbox" className="mt-0.5 w-4 h-4" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />
              <span>{L.marketing}</span>
            </label>
            <label className="flex items-start gap-3 text-sm" style={{ color: "#111" }}>
              <input type="checkbox" className="mt-0.5 w-4 h-4" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
              <span>{L.terms}</span>
            </label>

            <button type="submit" disabled={loading}
              className="h-12 rounded-full text-[15px] font-medium disabled:opacity-60 mt-2"
              style={{ background: "#111", color: "#fff" }}>
              {loading ? "…" : L.create}
            </button>
          </form>
        )}

        <p className="text-sm mt-8" style={{ color: "#707072" }}>
          {L.haveAcc} <Link href={`/${locale}/login`} className="underline" style={{ color: "#111" }}>{L.signIn}</Link>
        </p>
      </div>
    </div>
  );
}
