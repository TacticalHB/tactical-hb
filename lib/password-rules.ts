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

/** Each rule on its own, for a checklist that ticks as the person types.
    LATIN ONLY, on purpose, and said so: the auth server's own character check
    is ASCII, so a Ukrainian-keyboard password used to fail with no reason
    given (6 Oct 2026). `cyrillic` lets the page name that case. */
export function passwordRules(pw: string) {
  return {
    len: pw.length >= PASSWORD_MIN,
    lower: /[a-z]/.test(pw),
    upper: /[A-Z]/.test(pw),
    digit: /[0-9]/.test(pw),
    cyrillic: /[\u0400-\u04FF]/.test(pw),
  };
}

export function pwOk(pw: string): boolean {
  const r = passwordRules(pw);
  return r.len && r.lower && r.upper && r.digit && !r.cyrillic;
}

/** Why it was refused, in the reader's language. One sentence, not a checklist. */
export function pwHint(locale: string): string {
  return t(locale, {
    uk: "Пароль: щонайменше 8 символів, з великою й малою латинською літерою та цифрою.",
    en: "Password: at least 8 characters, with a capital and a small Latin letter and a number.",
    ja: "パスワードは8文字以上で、英字の大文字・小文字・数字をそれぞれ含めてください。",
    ar: "كلمة المرور: 8 أحرف على الأقل، مع حرف لاتيني كبير وآخر صغير ورقم.",
  });
}
