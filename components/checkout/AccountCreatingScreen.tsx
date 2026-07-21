"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthContext";

/* ---------------------------------------------------------------------------
   "Your account is being created…" — the interstitial between delivery and
   payment, shown only when the shopper opted in.

   Sign-up here is the same email-OTP flow as /register, so it genuinely cannot
   complete without the emailed code. The benefits list gives the wait a
   purpose rather than pretending work is happening in the background.

   Skippable by design: a failed or slow sign-up must never trap someone who
   came here to buy something.
--------------------------------------------------------------------------- */

const pwRules = (pw: string) => ({
  len: pw.length >= 8,
  cases: /[a-z]/.test(pw) && /[A-Z]/.test(pw),
  num: /[0-9]/.test(pw),
});

export default function AccountCreatingScreen({
  locale,
  email,
  firstName,
  surname,
  onDone,
  onSkip,
}: {
  locale: string;
  email: string;
  firstName: string;
  surname: string;
  /** Account created — continue to payment. */
  onDone: () => void;
  /** Continue to payment as a guest instead. */
  onSkip: () => void;
}) {
  const uk = locale === "uk";
  const { supabase, refreshProfile } = useAuth();

  const [sending, setSending] = useState(true);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // React 18 StrictMode double-invokes effects in dev; without this the OTP
  // would be sent twice and the first code silently invalidated.
  const sentRef = useRef(false);

  const L = {
    title: uk ? "Створюємо ваш акаунт…" : "Your account is being created…",
    sentTo: uk ? "Ми надіслали код підтвердження на" : "We've sent a verification code to",
    benefitsTitle: uk ? "Що ви отримаєте" : "What you'll get",
    b1: uk ? "Відстеження замовлень та історія покупок" : "Track your orders and view your purchase history",
    b2: uk ? "Бонусна програма та ваучери" : "Loyalty progress and vouchers",
    b3: uk ? "Збережені улюблені товари" : "Save your favourite products",
    b4: uk ? "Швидше оформлення наступного разу" : "Faster checkout next time",
    code: uk ? "Код підтвердження" : "Verification code",
    password: uk ? "Пароль" : "Create a password",
    min8: uk ? "Мінімум 8 символів" : "Minimum of 8 characters",
    mixed: uk ? "Великі, малі літери та цифра" : "Uppercase, lowercase and a number",
    confirm: uk ? "Підтвердити та продовжити" : "Confirm and continue",
    skip: uk ? "Продовжити без акаунта" : "Continue as guest instead",
    resend: uk ? "Надіслати код ще раз" : "Resend code",
    sendingMsg: uk ? "Надсилаємо код…" : "Sending your code…",
    needCode: uk ? "Введіть код з листа." : "Enter the code from your email.",
    weakPw: uk ? "Пароль не відповідає вимогам." : "Password doesn't meet the requirements.",
    unavailable: uk ? "Реєстрація тимчасово недоступна." : "Sign-up is temporarily unavailable.",
    badCode: uk ? "Невірний або протермінований код." : "Invalid or expired code.",
  };

  const send = async () => {
    if (!supabase) {
      setError(L.unavailable);
      setSending(false);
      return;
    }
    setSending(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    setSending(false);
    if (error) setError(error.message);
  };

  useEffect(() => {
    if (sentRef.current) return;
    sentRef.current = true;
    void send();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async () => {
    setError(null);
    if (!supabase) return setError(L.unavailable);
    if (!code.trim()) return setError(L.needCode);
    const r = pwRules(password);
    if (!(r.len && r.cases && r.num)) return setError(L.weakPw);

    setBusy(true);
    // New sign-ups verify as "signup", existing addresses as "email" — try both.
    let verify = await supabase.auth.verifyOtp({ email, token: code.trim(), type: "email" });
    if (verify.error) {
      verify = await supabase.auth.verifyOtp({ email, token: code.trim(), type: "signup" });
    }
    const { data, error: vErr } = verify;
    if (vErr || !data.user) {
      setBusy(false);
      return setError(vErr?.message || L.badCode);
    }
    const { error: uErr } = await supabase.auth.updateUser({
      password,
      data: { first_name: firstName, surname },
    });
    if (uErr) {
      setBusy(false);
      return setError(uErr.message);
    }
    await supabase.from("profiles").upsert({ id: data.user.id, first_name: firstName, surname });
    await refreshProfile();
    setBusy(false);
    onDone();
  };

  const r = pwRules(password);
  const benefits = [L.b1, L.b2, L.b3, L.b4];

  return (
    <div className="max-w-[520px]">
      <h1 className="font-display text-3xl md:text-4xl mb-3" style={{ color: "var(--text)" }}>{L.title}</h1>
      <p className="text-[14px] mb-8" style={{ color: "var(--text-muted)" }}>
        {sending ? L.sendingMsg : <>{L.sentTo} <span style={{ color: "var(--text)" }}>{email}</span></>}
      </p>

      <div className="p-6 mb-8" style={{ background: "var(--bg-soft)" }}>
        <p className="text-[11px] tracking-[0.2em] uppercase mb-4" style={{ color: "var(--text-faint)" }}>
          {L.benefitsTitle}
        </p>
        <ul className="flex flex-col gap-3">
          {benefits.map((b) => (
            <li key={b} className="flex gap-3 items-start text-[14px]" style={{ color: "var(--text)" }}>
              <svg width="15" height="15" viewBox="0 0 14 14" fill="none" aria-hidden="true"
                className="shrink-0 mt-0.5" style={{ color: "var(--accent)" }}>
                <path d="M2.5 7.5l3 3 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {b}
            </li>
          ))}
        </ul>
      </div>

      {error && (
        <div className="mb-5 text-sm px-4 py-3" style={{ background: "#fdecec", color: "#b42318" }}>{error}</div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); void submit(); }} className="flex flex-col gap-4">
        <div>
          <label className="block text-[11px] tracking-[0.2em] uppercase mb-2" style={{ color: "var(--text-faint)" }}>
            {L.code}
          </label>
          <input
            className="field tracking-[0.3em]"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={sending}
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={sending}
            className="text-[12px] underline underline-offset-4 mt-2 transition-opacity hover:opacity-70 disabled:opacity-40"
            style={{ color: "var(--text-muted)" }}
          >
            {L.resend}
          </button>
        </div>

        <div>
          <label className="block text-[11px] tracking-[0.2em] uppercase mb-2" style={{ color: "var(--text-faint)" }}>
            {L.password}
          </label>
          <div className="relative">
            <input
              className="field pr-16"
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] uppercase tracking-wide"
              style={{ color: "var(--text-muted)" }}
            >
              {showPw ? (uk ? "Сховати" : "Hide") : (uk ? "Показати" : "Show")}
            </button>
          </div>
          <ul className="text-[12px] flex flex-col gap-1 mt-2">
            <li style={{ color: r.len ? "#0a7d2c" : "var(--text-faint)" }}>{r.len ? "✓" : "○"} {L.min8}</li>
            <li style={{ color: r.cases && r.num ? "#0a7d2c" : "var(--text-faint)" }}>{r.cases && r.num ? "✓" : "○"} {L.mixed}</li>
          </ul>
        </div>

        <button
          type="submit"
          disabled={busy || sending}
          className="h-12 rounded-full text-[15px] font-medium transition-opacity hover:opacity-85 disabled:opacity-50 mt-2"
          style={{ background: "var(--accent)", color: "#111114" }}
        >
          {busy ? "…" : L.confirm}
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="text-[13px] underline underline-offset-4 transition-opacity hover:opacity-70"
          style={{ color: "var(--text-muted)" }}
        >
          {L.skip}
        </button>
      </form>
    </div>
  );
}
