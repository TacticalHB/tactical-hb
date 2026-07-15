"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthContext";

const pwRules = (pw: string) => ({
  len: pw.length >= 8,
  cases: /[a-z]/.test(pw) && /[A-Z]/.test(pw),
  num: /[0-9]/.test(pw),
});

export default function RegisterForm({ locale }: { locale: string }) {
  const uk = locale === "uk";
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
    title: uk ? "Приєднуйтесь до Tactical HB" : "Now let's make you a member.",
    emailLabel: uk ? "Електронна пошта" : "Email address",
    continue: uk ? "Продовжити" : "Continue",
    sentTo: uk ? "Ми надіслали код на" : "We've sent a code to",
    edit: uk ? "Змінити" : "Edit",
    code: uk ? "Код підтвердження" : "Verification code",
    firstName: uk ? "Ім'я" : "First name",
    surname: uk ? "Прізвище" : "Surname",
    dob: uk ? "Дата народження" : "Date of Birth",
    day: uk ? "День" : "Day",
    month: uk ? "Місяць" : "Month",
    year: uk ? "Рік" : "Year",
    password: uk ? "Пароль" : "Password",
    min8: uk ? "Мінімум 8 символів" : "Minimum of 8 characters",
    mixed: uk ? "Великі, малі літери та цифра" : "Uppercase, lowercase letters and one number",
    marketing: uk ? "Отримувати новини та пропозиції Tactical HB" : "Sign up for emails to get updates, offers and member benefits.",
    terms: uk ? "Я погоджуюсь з Умовами використання та Політикою конфіденційності" : "I agree to the Terms of Use and Privacy Policy.",
    create: uk ? "Створити акаунт" : "Create Account",
    haveAcc: uk ? "Вже маєте акаунт?" : "Already a member?",
    signIn: uk ? "Увійти" : "Sign in",
    badEmail: uk ? "Введіть дійсну електронну пошту." : "Enter a valid email address.",
    needCode: uk ? "Введіть код з листа." : "Enter the code from your email.",
    needName: uk ? "Вкажіть ім'я та прізвище." : "Please enter your first name and surname.",
    needDob: uk ? "Вкажіть дату народження." : "Please enter your date of birth.",
    weakPw: uk ? "Пароль не відповідає вимогам." : "Password doesn't meet the requirements.",
    needTerms: uk ? "Потрібно прийняти умови." : "You must agree to the Terms & Privacy Policy.",
  };

  const sendCode = async () => {
    setError(null);
    if (!supabase) return setError(uk ? "Реєстрація тимчасово недоступна." : "Sign-up is temporarily unavailable.");
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError(L.badEmail);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    setLoading(false);
    if (error) return setError(error.message);
    setStep("details");
  };

  const submit = async () => {
    setError(null);
    if (!supabase) return setError(uk ? "Реєстрація тимчасово недоступна." : "Sign-up is temporarily unavailable.");
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
      return setError(vErr?.message || (uk ? "Невірний код." : "Invalid or expired code."));
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
              <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs uppercase tracking-wide" style={{ color: "#707072" }}>
                {showPw ? (uk ? "Сховати" : "Hide") : (uk ? "Показати" : "Show")}
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
