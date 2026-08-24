"use client";

import { useState } from "react";
import { t } from "@/lib/i18n-text";
import { useAuth } from "@/components/AuthContext";
import { openCookieSettings } from "@/lib/cookie-consent";

const pwOk = (pw: string) => pw.length >= 8 && /[a-z]/.test(pw) && /[A-Z]/.test(pw) && /[0-9]/.test(pw);

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="py-8 border-t" style={{ borderColor: "var(--border)" }}>
      <h2 className="text-lg font-semibold mb-5" style={{ color: "#111" }}>{title}</h2>
      {children}
    </section>
  );
}

export default function SettingsForm({ locale }: { locale: string }) {
  const { supabase, user, profile, refreshProfile } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [dob, setDob] = useState("");
  const [marketing, setMarketing] = useState(false);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  const [savingDetails, setSavingDetails] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [savingComms, setSavingComms] = useState(false);
  const [msg, setMsg] = useState<{ k: string; text: string; ok: boolean } | null>(null);

  /* Fill the form from the profile as it arrives, and again if it changes.

     Adjusted during render rather than in an effect, so the fields are already
     populated on the frame they appear instead of flashing empty first. Keyed
     on the VALUES, not the object: the profile is refetched on save and comes
     back as a new object with the same contents, and re-running on that would
     overwrite whatever the customer had typed since. */
  const profileKey = profile
    ? `${profile.first_name ?? ""}|${profile.surname ?? ""}|${profile.date_of_birth ?? ""}|${profile.marketing_opt_in ? 1 : 0}`
    : null;
  const [filledFrom, setFilledFrom] = useState<string | null>(null);
  if (profile && filledFrom !== profileKey) {
    setFilledFrom(profileKey);
    setFirstName(profile.first_name || "");
    setSurname(profile.surname || "");
    setDob(profile.date_of_birth || "");
    setMarketing(!!profile.marketing_opt_in);
  }

  const L = {
    details: t(locale, { uk: "Особисті дані", en: "Account Details", ja: "アカウント情報" }),
    firstName: t(locale, { uk: "Ім'я", en: "First name", ja: "名" }),
    surname: t(locale, { uk: "Прізвище", en: "Surname", ja: "姓" }),
    email: t(locale, { uk: "Електронна пошта", en: "Email", ja: "メールアドレス" }),
    dob: t(locale, { uk: "Дата народження", en: "Date of birth", ja: "生年月日" }),
    save: t(locale, { uk: "Зберегти", en: "Save", ja: "保存する" }),
    password: t(locale, { uk: "Пароль", en: "Password", ja: "パスワード" }),
    newPassword: t(locale, { uk: "Новий пароль", en: "New password", ja: "新しいパスワード" }),
    pwHint: t(locale, { uk: "Мінімум 8 символів, великі й малі літери та цифра", en: "Min 8 characters, upper & lower case and a number", ja: "8文字以上、大文字・小文字・数字を含む" }),
    updatePw: t(locale, { uk: "Оновити пароль", en: "Update password", ja: "パスワードを更新" }),
    comms: t(locale, { uk: "Налаштування сповіщень", en: "Communication Preferences", ja: "配信設定" }),
    marketing: t(locale, { uk: "Отримувати новини, пропозиції та переваги учасника", en: "Emails about updates, offers and member benefits", ja: "最新情報、ご案内、会員特典のメール" }),
    privacy: t(locale, { uk: "Приватність", en: "Privacy", ja: "プライバシー" }),
    cookieBody: t(locale, { uk: "Керуйте тим, які файли cookie ми можемо використовувати. Необхідні cookie завжди увімкнені.", en: "Manage which cookies we're allowed to use. Necessary cookies are always on.", ja: "利用する Cookie を管理できます。必須 Cookie は常に有効です。" }),
    cookieBtn: t(locale, { uk: "Налаштування cookie", en: "Cookie settings", ja: "Cookie 設定" }),
    saved: t(locale, { uk: "Збережено", en: "Saved", ja: "保存しました" }),
    pwUpdated: t(locale, { uk: "Пароль оновлено", en: "Password updated", ja: "パスワードを更新しました" }),
    pwWeak: t(locale, { uk: "Пароль не відповідає вимогам.", en: "Password doesn't meet the requirements.", ja: "パスワードが条件を満たしていません。" }),
    err: t(locale, { uk: "Не вдалося зберегти. Спробуйте ще раз.", en: "Couldn't save. Please try again.", ja: "保存できませんでした。もう一度お試しください。" }),
  };

  const flash = (k: string, text: string, ok = true) => setMsg({ k, text, ok });

  const saveDetails = async () => {
    if (!supabase || !user) return;
    setSavingDetails(true);
    const patch = { first_name: firstName, surname, date_of_birth: dob || null };
    const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
    await supabase.auth.updateUser({ data: patch });
    await refreshProfile();
    setSavingDetails(false);
    flash("details", error ? L.err : L.saved, !error);
  };

  const savePassword = async () => {
    if (!supabase) return;
    if (!pwOk(password)) return flash("pw", L.pwWeak, false);
    setSavingPw(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSavingPw(false);
    if (error) return flash("pw", error.message, false);
    setPassword("");
    flash("pw", L.pwUpdated, true);
  };

  const saveComms = async () => {
    if (!supabase || !user) return;
    setSavingComms(true);
    const { error } = await supabase.from("profiles").update({ marketing_opt_in: marketing }).eq("id", user.id);
    await supabase.auth.updateUser({ data: { marketing_opt_in: marketing } });
    await refreshProfile();
    setSavingComms(false);
    flash("comms", error ? L.err : L.saved, !error);
  };

  const note = (k: string) =>
    msg?.k === k ? (
      <span className="text-sm ml-3" style={{ color: msg.ok ? "#0a7d2c" : "#b42318" }}>{msg.text}</span>
    ) : null;

  const btn = "h-11 px-6 rounded-full text-sm font-medium disabled:opacity-60";

  return (
    <div>
      <h1 className="text-3xl font-semibold mb-2" style={{ color: "#111" }}>{t(locale, { uk: "Налаштування", en: "Account Settings", ja: "アカウント設定" })}</h1>

      <Section title={L.details}>
        <div className="flex flex-col gap-4 max-w-md">
          <div className="flex gap-3">
            <input className="field rounded-lg" placeholder={L.firstName} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            <input className="field rounded-lg" placeholder={L.surname} value={surname} onChange={(e) => setSurname(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>{L.email}</label>
            <input className="field rounded-lg" value={user?.email || ""} disabled style={{ opacity: 0.7 }} />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>{L.dob}</label>
            <input type="date" className="field rounded-lg" value={dob} onChange={(e) => setDob(e.target.value)} />
          </div>
          <div className="flex items-center">
            <button onClick={saveDetails} disabled={savingDetails} className={btn} style={{ background: "#111", color: "#fff" }}>
              {savingDetails ? "…" : L.save}
            </button>
            {note("details")}
          </div>
        </div>
      </Section>

      <Section title={L.password}>
        <div className="flex flex-col gap-3 max-w-md">
          <div className="relative">
            <input className="field rounded-lg pr-12" type={showPw ? "text" : "password"} placeholder={L.newPassword}
              value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs uppercase" style={{ color: "#707072" }}>
              {showPw ? (t(locale, { uk: "Сховати", en: "Hide", ja: "隠す" })) : (t(locale, { uk: "Показати", en: "Show", ja: "表示" }))}
            </button>
          </div>
          <p className="text-xs" style={{ color: "var(--text-faint)" }}>{L.pwHint}</p>
          <div className="flex items-center">
            <button onClick={savePassword} disabled={savingPw || !password} className={btn} style={{ background: "#111", color: "#fff" }}>
              {savingPw ? "…" : L.updatePw}
            </button>
            {note("pw")}
          </div>
        </div>
      </Section>

      <Section title={L.comms}>
        <label className="flex items-start gap-3 text-sm max-w-md" style={{ color: "#111" }}>
          <input type="checkbox" className="mt-0.5 w-4 h-4" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />
          <span>{L.marketing}</span>
        </label>
        <div className="flex items-center mt-4">
          <button onClick={saveComms} disabled={savingComms} className={btn} style={{ background: "#111", color: "#fff" }}>
            {savingComms ? "…" : L.save}
          </button>
          {note("comms")}
        </div>
      </Section>

      <Section title={L.privacy}>
        <p className="text-sm mb-4 max-w-md" style={{ color: "var(--text-muted)" }}>{L.cookieBody}</p>
        {/* Reopens the same granular modal as the footer link */}
        <button onClick={openCookieSettings} className={`${btn} border`} style={{ borderColor: "var(--border-strong)", color: "#111" }}>
          {L.cookieBtn}
        </button>
      </Section>
    </div>
  );
}
