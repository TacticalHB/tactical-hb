import { t } from "@/lib/i18n-text";

/* ---------------------------------------------------------------------------
   What counts as a password here.

   ONE RULE, ONE HOME. This test was written inline at the top of
   components/account/SettingsForm and the reset form needed the same answer —
   so the choice was to move it or to write it twice. Twice is how the launch
   date ended up in seventeen places: the second copy is the one that does not
   get loosened, or tightened, when somebody changes their mind about what a
   password should be.

   NOT A SECURITY BOUNDARY. Supabase enforces its own minimum server side and
   that is what actually holds; this exists so a person finds out before they
   press the button rather than after. A rule that lives only in the client is
   a hint, and it is named and commented as one.
--------------------------------------------------------------------------- */

export const PASSWORD_MIN = 8;

export function pwOk(pw: string): boolean {
  return pw.length >= PASSWORD_MIN && /[a-z]/.test(pw) && /[A-Z]/.test(pw) && /[0-9]/.test(pw);
}

/** Why it was refused, in the reader's language. One sentence, not a checklist. */
export function pwHint(locale: string): string {
  return t(locale, {
    uk: "Пароль: щонайменше 8 символів, з великою й малою літерою та цифрою.",
    en: "Password: at least 8 characters, with an upper and lower case letter and a number.",
    ja: "パスワードは8文字以上で、大文字・小文字・数字をそれぞれ含めてください。",
    ar: "كلمة المرور: 8 أحرف على الأقل، مع حرف كبير وحرف صغير ورقم.",
  });
}
