"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { t } from "@/lib/i18n-text";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/AuthContext";
import { applyForWholesaleAccount } from "@/app/actions/wholesale";
import { PW_TEXT, authErrorText, confirmEmailCode, passwordOk, passwordRules, setPassword as savePassword } from "@/lib/signup-flow";

/* ---------------------------------------------------------------------------
   Applying for a wholesale account.

   THE EMAIL IS VERIFIED BEFORE THE COMPANY IS NAMED. Same one-time-code loop
   as retail registration, and it matters more here: the whole approval
   decision rests on being able to write back to a real trade address, and an
   unverified mailbox would let anyone register as anyone's distributor.

   WHAT THIS FORM CANNOT DO IS LET ANYONE IN. It finishes by creating a
   `pending` partner row, and pending sees no dealer prices and can submit
   nothing. The success screen says so in as many words, because an applicant
   who thinks they have an account and finds a locked portal will email support
   instead of waiting.
--------------------------------------------------------------------------- */

export default function WholesaleRegisterForm({ locale }: { locale: string }) {
  const { supabase } = useAuth();
  const router = useRouter();
  /* The business-type labels come from the `wholesale` namespace the enquiry
     form already uses, rather than being retyped here. Two spellings of
     "Shisha Lounge / Bar" reaching sales from two forms is how a filter stops
     matching. */
  const w = useTranslations("wholesale");

  const [step, setStep] = useState<"email" | "details" | "done">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  /* Confirmed as soon as the code is entered — see lib/signup-flow. */
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [company, setCompany] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [note, setNote] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const L = {
    title: t(locale, {
      en: "Apply for a wholesale account",
      uk: "Заявка на оптовий акаунт",
      ja: "卸売アカウントのお申し込み",
      ar: "التقديم للحصول على حساب جملة",
    }),
    intro: t(locale, {
      en: "Trade accounts are approved by hand. Register here, and we'll review your application before your account is opened.",
      uk: "Оптові акаунти відкриваємо вручну. Зареєструйтеся тут — ми розглянемо заявку, перш ніж відкрити доступ.",
      ja: "取引アカウントは一件ずつ審査のうえ開設しています。こちらでご登録いただくと、内容を確認したのちアカウントを開設します。",
      ar: "تُعتمد حسابات الجملة يدويًا. سجّل هنا وسنراجع طلبك قبل فتح حسابك.",
    }),
    emailLabel: t(locale, { en: "Work email address", uk: "Робоча електронна пошта", ja: "会社のメールアドレス", ar: "البريد الإلكتروني للعمل" }),
    sendCode: t(locale, { en: "Send verification code", uk: "Надіслати код", ja: "確認コードを送信", ar: "أرسل رمز التحقق" }),
    sentTo: t(locale, { en: "We've sent a code to", uk: "Ми надіслали код на", ja: "コードをお送りしました：", ar: "أرسلنا رمزًا إلى" }),
    edit: t(locale, { en: "Edit", uk: "Змінити", ja: "変更", ar: "تعديل" }),
    code: t(locale, { en: "Verification code", uk: "Код підтвердження", ja: "確認コード", ar: "رمز التحقق" }),
    company: t(locale, { en: "Company name", uk: "Назва компанії", ja: "会社名", ar: "اسم الشركة" }),
    contact: t(locale, { en: "Contact name", uk: "Контактна особа", ja: "ご担当者名", ar: "اسم جهة الاتصال" }),
    phone: t(locale, { en: "Telephone", uk: "Телефон", ja: "電話番号", ar: "رقم الهاتف" }),
    country: t(locale, { en: "Country", uk: "Країна", ja: "国", ar: "الدولة" }),
    city: t(locale, { en: "City", uk: "Місто", ja: "都市", ar: "المدينة" }),
    businessType: t(locale, { en: "Type of business", uk: "Тип бізнесу", ja: "事業形態", ar: "نوع النشاط" }),
    choose: t(locale, { en: "Please choose one", uk: "Оберіть варіант", ja: "ひとつお選びください", ar: "اختر واحدًا" }),
    needType: t(locale, { en: "Please choose your type of business.", uk: "Оберіть тип бізнесу.", ja: "事業形態をお選びください。", ar: "يرجى اختيار نوع نشاطك." }),
    note: t(locale, {
      en: "Tell us about your business (optional)",
      uk: "Розкажіть про ваш бізнес (необов'язково)",
      ja: "事業内容をお聞かせください（任意）",
      ar: "أخبرنا عن نشاطك التجاري (اختياري)",
    }),
    password: t(locale, { en: "Password", uk: "Пароль", ja: "パスワード", ar: "كلمة المرور" }),
    confirm: t(locale, { en: "Confirm", uk: "Підтвердити", ja: "確認", ar: "تأكيد" }),
    codeOk: t(locale, { en: "Email confirmed", uk: "Пошту підтверджено", ja: "メールアドレスを確認しました", ar: "تم تأكيد البريد الإلكتروني" }),
    resend: t(locale, { en: "Send a new code", uk: "Надіслати новий код", ja: "新しいコードを送信", ar: "أرسل رمزًا جديدًا" }),
    submit: t(locale, { en: "Submit application", uk: "Надіслати заявку", ja: "申し込む", ar: "إرسال الطلب" }),
    doneTitle: t(locale, {
      en: "Application received",
      uk: "Заявку отримано",
      ja: "お申し込みを受け付けました",
      ar: "تم استلام طلبك",
    }),
    doneBody: t(locale, {
      en: "Our team will review your details and email you once your account is open. Wholesale prices and ordering stay locked until then.",
      uk: "Ми розглянемо ваші дані й напишемо, щойно акаунт буде відкрито. До того часу оптові ціни та замовлення недоступні.",
      ja: "内容を確認のうえ、アカウント開設時にメールでご連絡します。それまで卸価格とご注文はご利用いただけません。",
      ar: "سيراجع فريقنا بياناتك ويراسلك بمجرد فتح حسابك. وتبقى أسعار الجملة والطلب مقفلة حتى ذلك الحين.",
    }),
    doneNext: t(locale, {
      en: "If you haven't already, email us your completed application form and trade documents — that's usually what we're waiting on.",
      uk: "Якщо ще не надсилали — надішліть нам заповнену форму заявки та документи. Зазвичай саме на них ми чекаємо.",
      ja: "申込書と取引書類をまだお送りでない場合は、メールでお送りください。多くの場合それが確認待ちの最後の一点です。",
      ar: "إن لم تكن قد أرسلت استمارة الطلب والمستندات التجارية بعد، فأرسلها إلينا — فهي عادةً ما ننتظره.",
    }),
    backToWholesale: t(locale, { en: "Back to Wholesale", uk: "Назад до опту", ja: "卸売のページへ戻る", ar: "العودة إلى الجملة" }),
    haveAccount: t(locale, { en: "Already approved?", uk: "Вже маєте доступ?", ja: "すでに承認済みですか？", ar: "معتمَد بالفعل؟" }),
    signIn: t(locale, { en: "Sign in", uk: "Увійти", ja: "ログイン", ar: "تسجيل الدخول" }),
    unavailable: t(locale, {
      en: "Registration is temporarily unavailable.",
      uk: "Реєстрація тимчасово недоступна.",
      ja: "ご登録を一時的にご利用いただけません。",
      ar: "التسجيل غير متاح مؤقتًا.",
    }),
    badEmail: t(locale, { en: "Enter a valid email address.", uk: "Введіть дійсну електронну пошту.", ja: "有効なメールアドレスをご入力ください。", ar: "أدخل بريدًا إلكترونيًا صالحًا." }),
    needCode: t(locale, { en: "Enter the code from your email.", uk: "Введіть код з листа.", ja: "メールに記載のコードをご入力ください。", ar: "أدخل الرمز الوارد في بريدك." }),
    needCompany: t(locale, { en: "Please enter your company name.", uk: "Вкажіть назву компанії.", ja: "会社名をご入力ください。", ar: "يرجى إدخال اسم شركتك." }),
    weakPw: t(locale, { en: "Password doesn't meet the requirements.", uk: "Пароль не відповідає вимогам.", ja: "パスワードが条件を満たしていません。", ar: "كلمة المرور لا تستوفي المتطلبات." }),
    taken: t(locale, {
      en: "That company is already registered to another account. Email us and we'll sort it out.",
      uk: "Ця компанія вже зареєстрована на інший акаунт. Напишіть нам, і ми розберемося.",
      ja: "この会社は別のアカウントで登録済みです。メールでご連絡ください。",
      ar: "هذه الشركة مسجّلة بالفعل لحساب آخر. راسلنا وسنعالج الأمر.",
    }),
    failed: t(locale, {
      en: "We couldn't submit your application. Please try again.",
      uk: "Не вдалося надіслати заявку. Спробуйте ще раз.",
      ja: "お申し込みを送信できませんでした。もう一度お試しください。",
      ar: "تعذّر إرسال طلبك. يرجى المحاولة مرة أخرى.",
    }),
  };

  const label = "block text-xs tracking-[0.2em] uppercase mb-2";
  const labelStyle = { color: "var(--text-faint)" };

  const sendCode = async () => {
    setError(null);
    if (!supabase) return setError(L.unavailable);
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError(L.badEmail);
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (err) return setError(authErrorText(err, locale));
    setVerified(false);
    setCode("");
    setStep("details");
  };

  const confirmCode = async () => {
    setError(null);
    if (!supabase) return setError(L.unavailable);
    if (!code.trim()) return setError(L.needCode);
    setVerifying(true);
    const res = await confirmEmailCode(supabase, email, code);
    setVerifying(false);
    if (!res.ok) return setError(authErrorText(res.error, locale));
    setVerified(true);
  };

  const submit = async () => {
    setError(null);
    if (!supabase) return setError(L.unavailable);
    if (!verified && !code.trim()) return setError(L.needCode);
    if (!company.trim()) return setError(L.needCompany);
    if (!businessType) return setError(L.needType);
    if (passwordRules(password).cyrillic) return setError(t(locale, PW_TEXT.cyrillic));
    if (!passwordOk(password)) return setError(L.weakPw);

    setLoading(true);

    /* Confirms the code if that has not happened yet; a session already
       confirmed for this address skips it, so a retry never re-sends a used
       code. Existing retail customers verify as "email", new ones may verify
       as "signup" — confirmEmailCode tries both. */
    const verify = await confirmEmailCode(supabase, email, code);
    if (!verify.ok) {
      setLoading(false);
      return setError(authErrorText(verify.error, locale));
    }
    setVerified(true);

    // Keeping the password an existing account already has is fine.
    const pw = await savePassword(supabase, password);
    if (!pw.ok) {
      setLoading(false);
      return setError(authErrorText(pw.error, locale));
    }

    const result = await applyForWholesaleAccount({
      company: company.trim(),
      contactName: contactName.trim(),
      phone: phone.trim(),
      country: country.trim(),
      city: city.trim(),
      businessType,
      note: note.trim(),
      locale,
    });
    setLoading(false);

    if (!result.ok) {
      return setError(result.error === "taken" ? L.taken : L.failed);
    }
    setStep("done");
    router.refresh();
  };

  const r = passwordRules(password);

  if (step === "done") {
    return (
      <div className="max-w-[560px]">
        <h1 className="font-display text-4xl md:text-5xl mb-6" style={{ color: "var(--text)" }}>
          {L.doneTitle}
        </h1>
        <p className="text-base leading-relaxed mb-4" style={{ color: "var(--text-muted)" }}>
          {L.doneBody}
        </p>
        <p className="text-sm leading-relaxed mb-8" style={{ color: "var(--text-faint)" }}>
          {L.doneNext}
        </p>
        <Link
          href={`/${locale}/wholesale`}
          className="inline-flex h-12 px-8 rounded-full items-center justify-center text-[15px] font-medium transition-opacity hover:opacity-85"
          style={{ background: "var(--accent)", color: "#111114" }}
        >
          {L.backToWholesale}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[520px]">
      <h1 className="font-display text-4xl md:text-5xl mb-4" style={{ color: "var(--text)" }}>
        {L.title}
      </h1>
      <p className="text-base leading-relaxed mb-8" style={{ color: "var(--text-muted)" }}>
        {L.intro}
      </p>

      {error && (
        <div className="mb-5 text-sm px-4 py-3 rounded-lg" style={{ background: "#fdecec", color: "#b42318" }}>
          {error}
        </div>
      )}

      {step === "email" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendCode();
          }}
          className="flex flex-col gap-5"
        >
          <div>
            <label className={label} style={labelStyle} htmlFor="wh-email">
              {L.emailLabel}
            </label>
            <input
              id="wh-email"
              className="field"
              type="email"
              dir="ltr"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="h-12 rounded-full text-[15px] font-medium transition-opacity hover:opacity-85 disabled:opacity-50"
            style={{ background: "var(--accent)", color: "#111114" }}
          >
            {L.sendCode}
          </button>
          <p className="text-sm" style={{ color: "var(--text-faint)" }}>
            {L.haveAccount}{" "}
            <Link
              href={`/${locale}/login?redirect=${encodeURIComponent(`/${locale}/wholesale/portal`)}`}
              className="underline underline-offset-4"
              style={{ color: "var(--text)" }}
            >
              {L.signIn}
            </Link>
          </p>
        </form>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex flex-col gap-5"
        >
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {L.sentTo} <span dir="ltr" style={{ color: "var(--text)" }}>{email}</span>{" "}
            <button
              type="button"
              onClick={() => setStep("email")}
              className="underline underline-offset-4"
              style={{ color: "var(--text-faint)" }}
            >
              {L.edit}
            </button>
          </p>

          <div>
            <label className={label} style={labelStyle} htmlFor="wh-code">
              {L.code}
            </label>
            {verified ? (
              <p className="text-sm font-medium" style={{ color: "var(--accent-ink)" }}>✓ {L.codeOk}</p>
            ) : (
              <>
                <div className="flex gap-2">
                  <input
                    id="wh-code"
                    className="field flex-1"
                    dir="ltr"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={confirmCode}
                    disabled={verifying}
                    className="h-12 px-5 rounded-full text-[14px] font-medium shrink-0 disabled:opacity-50"
                    style={{ background: "var(--accent)", color: "#111114" }}
                  >
                    {verifying ? "…" : L.confirm}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={sendCode}
                  disabled={loading}
                  className="mt-2 text-xs underline underline-offset-4"
                  style={{ color: "var(--text-faint)" }}
                >
                  {L.resend}
                </button>
              </>
            )}
          </div>

          <div>
            <label className={label} style={labelStyle} htmlFor="wh-company">
              {L.company}
            </label>
            <input
              id="wh-company"
              className="field"
              required
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className={label} style={labelStyle} htmlFor="wh-contact">
                {L.contact}
              </label>
              <input
                id="wh-contact"
                className="field"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
            </div>
            <div>
              <label className={label} style={labelStyle} htmlFor="wh-phone">
                {L.phone}
              </label>
              {/* LTR for the same reason the checkout's phone field is — a
                  leading "+" is bidi-neutral and flips to the far end. */}
              <input
                id="wh-phone"
                className="field"
                type="tel"
                dir="ltr"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className={label} style={labelStyle} htmlFor="wh-country">
                {L.country}
              </label>
              <input
                id="wh-country"
                className="field"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </div>
            <div>
              <label className={label} style={labelStyle} htmlFor="wh-city">
                {L.city}
              </label>
              <input
                id="wh-city"
                className="field"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className={label} style={labelStyle} htmlFor="wh-biz">
              {L.businessType}
            </label>
            {/* A select rather than the enquiry form's button row: this form is
                already long, and the label text is what gets stored either
                way. The VALUE is the label, so sales reads the same words from
                both doors — see the note on business_type in 0032. */}
            <select
              id="wh-biz"
              className="field"
              required
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
            >
              <option value="">{L.choose}</option>
              {/* Distribution, then shops and online retailers, then lounges
                  and bars — the same order as the enquiry form on /wholesale,
                  which asks the same question earlier in the same funnel. */}
              {[w("biz_distribution"), w("biz_shop"), w("biz_lounge")].map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={label} style={labelStyle} htmlFor="wh-note">
              {L.note}
            </label>
            <textarea
              id="wh-note"
              className="field"
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div>
            <label className={label} style={labelStyle} htmlFor="wh-pw">
              {L.password}
            </label>
            <input
              id="wh-pw"
              className="field"
              type="password"
              dir="ltr"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <ul className="mt-2 text-xs flex flex-col gap-1" style={{ color: "var(--text-faint)" }}>
              <li style={{ color: r.len ? "var(--accent-ink)" : undefined }}>{r.len ? "✓" : "○"} {t(locale, PW_TEXT.len)}</li>
              <li style={{ color: r.lower && r.upper ? "var(--accent-ink)" : undefined }}>{r.lower && r.upper ? "✓" : "○"} {t(locale, PW_TEXT.cases)}</li>
              <li style={{ color: r.digit ? "var(--accent-ink)" : undefined }}>{r.digit ? "✓" : "○"} {t(locale, PW_TEXT.digit)}</li>
            </ul>
            {r.cyrillic && (
              <p className="mt-2 text-xs" style={{ color: "#b42318" }}>{t(locale, PW_TEXT.cyrillic)}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="h-12 rounded-full text-[15px] font-medium transition-opacity hover:opacity-85 disabled:opacity-50"
            style={{ background: "var(--accent)", color: "#111114" }}
          >
            {L.submit}
          </button>
        </form>
      )}
    </div>
  );
}
