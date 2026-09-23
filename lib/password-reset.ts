import "server-only";
import { esc } from "@/lib/email";
import { CARD, INK, MUTED, FAINT, ACCENT_FILL, ACCENT_TEXT, FONT, emailShell } from "@/lib/email-theme";
import { localeDir } from "@/i18n/routing";

/* ---------------------------------------------------------------------------
   "Reset your password."

   FOUR STOREFRONTS, NOT TWO. The order and shipping letters carry English and
   Ukrainian because they are read after a purchase, and a purchase has already
   told us a great deal about who the reader is. This one is read by somebody
   locked out — the single worst moment to hand a person a language they do not
   speak and a button they have to guess at. It costs four strings.

   THE LINK IS THE WHOLE LETTER. No product rows, no still, no unsubscribe:
   there is nothing to unsubscribe from and a marketing footer on a security
   email is how a reader decides it is a phishing attempt. The one thing that
   matters is set large, said twice — once as a button and once as the bare URL
   underneath — because a client that mangles the button leaves a person with
   no way through at all.

   IT SAYS WHAT TO DO IF IT WASN'T THEM, and says it plainly: ignore this,
   nothing has changed. That sentence is the difference between a reset email
   and an alarming one, and it is true — requesting a link changes no password.
--------------------------------------------------------------------------- */

type Copy = {
  subject: string;
  preheader: string;
  headline: string;
  intro: string;
  cta: string;
  fallback: string;
  expiry: string;
  ignore: string;
  closing: string;
};

const COPY: Record<string, Copy> = {
  en: {
    subject: "Reset your Tactical HB password",
    preheader: "The link below works once, and expires in an hour.",
    headline: "Reset your password",
    intro: "Someone asked to reset the password for this address. Choose a new one with the button below.",
    cta: "Choose a new password",
    fallback: "If the button doesn't work, paste this into your browser:",
    expiry: "The link works once and expires in an hour.",
    ignore: "If this wasn't you, ignore this email — nothing has changed and your password still works.",
    closing: "Tactical HB",
  },
  uk: {
    subject: "Відновлення пароля Tactical HB",
    preheader: "Посилання діє один раз і спливає за годину.",
    headline: "Відновлення пароля",
    intro: "Для цієї адреси запитали зміну пароля. Оберіть новий за кнопкою нижче.",
    cta: "Обрати новий пароль",
    fallback: "Якщо кнопка не працює, скопіюйте це посилання у браузер:",
    expiry: "Посилання діє один раз і спливає за годину.",
    ignore: "Якщо це були не ви — просто проігноруйте лист. Нічого не змінилося, ваш пароль діє далі.",
    closing: "Tactical HB",
  },
  ja: {
    subject: "Tactical HB のパスワード再設定",
    preheader: "リンクは一度だけ有効で、1時間で期限切れになります。",
    headline: "パスワードの再設定",
    intro: "このメールアドレスのパスワード再設定がリクエストされました。下のボタンから新しいパスワードをご設定ください。",
    cta: "新しいパスワードを設定",
    fallback: "ボタンが動作しない場合は、次のURLをブラウザに貼り付けてください：",
    expiry: "リンクは一度だけ有効で、1時間で期限切れになります。",
    ignore: "お心当たりがない場合は、このメールを破棄してください。変更は行われておらず、現在のパスワードはそのままご利用いただけます。",
    closing: "Tactical HB",
  },
  ar: {
    subject: "إعادة تعيين كلمة مرور Tactical HB",
    preheader: "الرابط صالح لمرة واحدة وتنتهي صلاحيته خلال ساعة.",
    headline: "إعادة تعيين كلمة المرور",
    intro: "طُلبت إعادة تعيين كلمة المرور لهذا البريد الإلكتروني. اختر كلمة مرور جديدة عبر الزر أدناه.",
    cta: "اختيار كلمة مرور جديدة",
    fallback: "إذا لم يعمل الزر، انسخ هذا الرابط إلى متصفحك:",
    expiry: "الرابط صالح لمرة واحدة وتنتهي صلاحيته خلال ساعة.",
    ignore: "إذا لم تكن أنت من طلب ذلك، فتجاهل هذه الرسالة — لم يتغيّر شيء وكلمة مرورك ما زالت صالحة.",
    closing: "Tactical HB",
  },
};

export function resetCopy(locale: string): Copy {
  return COPY[locale] ?? COPY.en;
}

export function buildResetEmail(o: { locale: string; url: string }): {
  subject: string;
  html: string;
  text: string;
} {
  const t = resetCopy(o.locale);
  const lang = COPY[o.locale] ? o.locale : "en";
  const dir = localeDir(lang);
  /* The URL is escaped for the href AND printed as text. Both matter: the
     first stops a crafted link breaking out of the attribute, the second is
     the only route through for a reader whose client eats buttons. */
  const href = esc(o.url);

  const inner = `
        <!-- Headline -->
        <tr><td align="center" style="padding-bottom:12px">
          <h1 style="margin:0;font-family:${FONT};font-size:27px;line-height:1.25;font-weight:700;color:${INK}">
            ${esc(t.headline)}
          </h1>
        </td></tr>
        <tr><td align="center" style="padding-bottom:28px">
          <p style="margin:0;font-family:${FONT};font-size:15px;line-height:1.6;color:${MUTED};max-width:440px">
            ${esc(t.intro)}
          </p>
        </td></tr>

        <!-- The button -->
        <tr><td align="center" style="padding-bottom:18px">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="border-collapse:separate;border-spacing:0;margin:0 auto">
            <tr><td style="background-color:${ACCENT_FILL};border-radius:999px">
              <a href="${href}" style="display:block;padding:17px 42px;font-family:${FONT};font-size:15px;line-height:15px;font-weight:700;letter-spacing:.02em;color:${ACCENT_TEXT};text-decoration:none">${esc(t.cta)}</a>
            </td></tr>
          </table>
        </td></tr>

        <!-- The same link as text, for clients that mangle the button -->
        <tr><td style="padding:10px 0 4px">
          <div style="background:${CARD};border-radius:14px;padding:18px 20px">
            <div style="font-family:${FONT};font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:${FAINT};padding-bottom:8px">
              ${esc(t.fallback)}
            </div>
            <div style="font-family:${FONT};font-size:13px;line-height:1.6;color:${INK};word-break:break-all">
              <a href="${href}" style="color:${INK};text-decoration:underline">${href}</a>
            </div>
          </div>
        </td></tr>

        <!-- Expiry, then the sentence that stops this reading as an attack -->
        <tr><td style="padding-top:22px">
          <p style="margin:0;font-family:${FONT};font-size:14px;line-height:1.6;color:${MUTED}">
            ${esc(t.expiry)}
          </p>
        </td></tr>
        <tr><td style="padding-top:12px">
          <p style="margin:0;font-family:${FONT};font-size:14px;line-height:1.6;color:${MUTED}">
            ${esc(t.ignore)}
          </p>
        </td></tr>
        <tr><td style="padding-top:26px">
          <p style="margin:0;font-family:${FONT};font-size:14px;line-height:1.6;color:${MUTED}">
            ${esc(t.closing)}
          </p>
        </td></tr>`;

  const html = emailShell({ lang, dir, title: esc(t.subject), inner });

  const text = [
    t.headline,
    "",
    t.intro,
    "",
    o.url,
    "",
    t.expiry,
    t.ignore,
    "",
    "TACTICAL HB",
  ].join("\n");

  return { subject: t.subject, html, text };
}
