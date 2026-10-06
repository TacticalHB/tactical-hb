import type { SupabaseClient } from "@supabase/supabase-js";
import { t } from "@/lib/i18n-text";

/* ---------------------------------------------------------------------------
   The pieces both sign-up forms share — retail (/register) and wholesale
   (/wholesale/register).

   WHY THIS EXISTS (6 Oct 2026). A wholesale application failed on 5 Oct and
   left an account that was created but never confirmed, with no application
   behind it. Three faults, all in both forms:

   1. THE CODE WAS CHECKED LAST. The emailed code was only verified when the
      whole form was submitted, so filling in the details could outlast it,
      and the "expired" error surfaced beside the password field, in English.
      Now the code is confirmed on its own, up front (confirmEmailCode), and a
      session that is already confirmed for this address is never asked for
      the used code again — so a retry works.
   2. THE PASSWORD RULES WERE SILENT ABOUT LATIN. "Upper and lower case" only
      ever counted A–Z / a–z, so a Ukrainian-keyboard password failed with no
      reason given. The rules stay Latin (the auth server's own character
      check is ASCII), but each one is now its own line, and Cyrillic is named.
   3. RAW AUTH ERRORS. Supabase's messages reached the page verbatim, in
      English. authErrorText translates the ones a person can act on, and
      keeping your current password ("same_password") is not an error at all —
      an existing customer applying for trade hit exactly that.
--------------------------------------------------------------------------- */

type L4 = { uk: string; en: string; ja: string; ar: string };

/* The rule itself lives in lib/password-rules (shared with the reset and
   settings forms); re-exported here so a sign-up form imports one module. */
export { passwordRules, pwOk as passwordOk } from "@/lib/password-rules";

export const PW_TEXT: Record<"len" | "cases" | "digit" | "cyrillic", L4> = {
  len: { uk: "Щонайменше 8 символів", en: "At least 8 characters", ja: "8文字以上", ar: "8 أحرف على الأقل" },
  cases: {
    uk: "Велика й мала латинська літера (A–Z, a–z)",
    en: "A capital and a small Latin letter (A–Z, a–z)",
    ja: "英字の大文字と小文字（A–Z、a–z）",
    ar: "حرف لاتيني كبير وآخر صغير (A–Z، a–z)",
  },
  digit: { uk: "Хоча б одна цифра", en: "At least one digit", ja: "数字を1つ以上", ar: "رقم واحد على الأقل" },
  cyrillic: {
    uk: "Пароль містить кириличні літери — перемкніть клавіатуру на англійську.",
    en: "The password contains Cyrillic letters — switch the keyboard to English.",
    ja: "パスワードにキリル文字が含まれています。キーボードを英語に切り替えてください。",
    ar: "تحتوي كلمة المرور على أحرف كيريلية — بدّل لوحة المفاتيح إلى الإنجليزية.",
  },
};

type AuthErr = { code?: string; message?: string; status?: number; reasons?: string[] } | null | undefined;

/** A Supabase auth error, as a sentence the visitor can act on, in their language. */
export function authErrorText(err: AuthErr, locale: string): string {
  const code = err?.code ?? "";
  const msg = (err?.message ?? "").toLowerCase();
  if (code === "otp_expired" || msg.includes("expired") || (msg.includes("invalid") && msg.includes("token"))) {
    return t(locale, {
      uk: "Код недійсний або застарів. Надішліть новий код і введіть його.",
      en: "That code is wrong or has expired. Send a new code and enter it.",
      ja: "コードが正しくないか、有効期限が切れています。新しいコードを送信して入力してください。",
      ar: "الرمز غير صحيح أو منتهي الصلاحية. أرسل رمزًا جديدًا وأدخله.",
    });
  }
  if (code === "weak_password" || msg.includes("password")) {
    if (err?.reasons?.includes("pwned") || msg.includes("pwned") || msg.includes("known to be weak") || msg.includes("leaked")) {
      return t(locale, {
        uk: "Цей пароль трапляється у відомих витоках даних. Оберіть інший.",
        en: "This password appears in known data leaks. Please choose another.",
        ja: "このパスワードは過去の情報漏えいで確認されています。別のパスワードをお選びください。",
        ar: "ظهرت كلمة المرور هذه في تسريبات بيانات معروفة. يُرجى اختيار أخرى.",
      });
    }
    return t(locale, {
      uk: "Пароль не підходить: щонайменше 8 символів, велика й мала латинська літера та цифра.",
      en: "That password won't work: at least 8 characters, a capital and a small Latin letter, and a digit.",
      ja: "このパスワードは使用できません。8文字以上、英字の大文字・小文字、数字を含めてください。",
      ar: "كلمة المرور غير مقبولة: 8 أحرف على الأقل، وحرف لاتيني كبير وآخر صغير، ورقم.",
    });
  }
  if (code.startsWith("over_") || err?.status === 429 || msg.includes("rate limit")) {
    return t(locale, {
      uk: "Забагато спроб. Зачекайте хвилину й спробуйте знову.",
      en: "Too many attempts. Please wait a minute and try again.",
      ja: "試行回数が多すぎます。1分ほどお待ちになってから、もう一度お試しください。",
      ar: "محاولات كثيرة. يُرجى الانتظار دقيقة ثم المحاولة مجددًا.",
    });
  }
  if (code === "email_address_invalid" || msg.includes("email")) {
    return t(locale, {
      uk: "Перевірте адресу електронної пошти.",
      en: "Please check the email address.",
      ja: "メールアドレスをご確認ください。",
      ar: "يُرجى التحقق من عنوان البريد الإلكتروني.",
    });
  }
  return t(locale, {
    uk: "Щось пішло не так. Спробуйте ще раз.",
    en: "Something went wrong. Please try again.",
    ja: "問題が発生しました。もう一度お試しください。",
    ar: "حدث خطأ ما. يُرجى المحاولة مرة أخرى.",
  });
}

/**
 * Confirm the emailed code. Already signed in as this address (a retry after a
 * later step failed, or the code was confirmed a moment ago)? Then there is
 * nothing to verify — the used code would only fail now.
 */
export async function confirmEmailCode(
  supabase: SupabaseClient,
  email: string,
  code: string,
): Promise<{ ok: true; userId: string } | { ok: false; error: AuthErr }> {
  const { data: current } = await supabase.auth.getUser();
  if (current.user && current.user.email?.toLowerCase() === email.trim().toLowerCase() && current.user.email_confirmed_at) {
    return { ok: true, userId: current.user.id };
  }
  const token = code.replace(/\s+/g, "");
  /* A brand-new sign-up can verify as "signup", an existing address as
     "email"; try both, as before. */
  let v = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (v.error) v = await supabase.auth.verifyOtp({ email, token, type: "signup" });
  if (v.error || !v.data.user) return { ok: false, error: v.error };
  return { ok: true, userId: v.data.user.id };
}

/** Set the password (and optional profile data). Keeping the current one is fine. */
export async function setPassword(
  supabase: SupabaseClient,
  password: string,
  data?: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; error: AuthErr }> {
  const { error } = await supabase.auth.updateUser(data ? { password, data } : { password });
  if (!error) return { ok: true };
  if (error.code === "same_password") {
    // Same password as before: save the profile data on its own, then carry on.
    if (data) {
      const second = await supabase.auth.updateUser({ data });
      if (second.error) return { ok: false, error: second.error };
    }
    return { ok: true };
  }
  return { ok: false, error: error as AuthErr };
}
