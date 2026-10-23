import "server-only";
import { esc } from "@/lib/email";
import { ACCENT_FILL, ACCENT_TEXT, CARD, INK, MUTED, FONT, emailShell } from "@/lib/email-theme";

/* ---------------------------------------------------------------------------
   The wholesale letters an applicant gets before they are approved: the letter
   a registration gets, and the one reminder. (The reply to the /wholesale
   enquiry form went with the form on 23 Oct 2026 — registering is the only
   way in now.)

   THE PDF IS RETIRED (23 Oct 2026). These letters used to attach a two-page
   application form to be filled in and emailed back — and applicants kept
   missing it, then waited to be approved without ever sending it. The same
   questions are now asked on the site straight after registering, with the
   trade documents uploaded there (lib/wholesale-application), so each letter
   here carries ONE button to that step instead of an attachment.

   Same shell, palette and wordmark as the order confirmation and the shipping
   notification — all import lib/email-theme, so they cannot drift apart. Each
   is a LETTER rather than a receipt: centred headline, left-aligned body in a
   single white card, an orange button under it.
--------------------------------------------------------------------------- */

type Copy = {
  subject: string;
  headline: string;
  greeting: string;
  paragraphs: string[];
  cta: string;
  signOff: string;
  signature: string;
};

export type WholesaleReply = {
  subject: string;
  html: string;
  text: string;
  /** Kept for the callers' shape; always empty since the PDF was retired. */
  attachments: { filename: string; path: string }[];
};

function letter(t: Copy, locale: string, ctaUrl: string): WholesaleReply {
  const dir = locale === "ar" ? "rtl" : "ltr";
  const para = (s: string, top: number) => `
            <tr><td dir="${dir}" style="font-family:${FONT};font-size:15px;line-height:1.65;color:${INK};padding-top:${top}px">
              ${esc(s)}
            </td></tr>`;

  const inner = `
        <!-- Headline -->
        <tr><td align="center" style="padding-bottom:30px">
          <h1 style="margin:0;font-family:${FONT};font-size:27px;line-height:1.25;font-weight:700;color:${INK}">
            ${esc(t.headline)}
          </h1>
        </td></tr>

        <!-- Letter -->
        <tr><td style="background:${CARD};border-radius:14px;padding:26px 24px">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            ${para(t.greeting, 0)}
            ${t.paragraphs.map((p) => para(p, 16)).join("")}
            <tr><td dir="${dir}" style="font-family:${FONT};font-size:15px;line-height:1.65;color:${MUTED};padding-top:24px">
              ${esc(t.signOff)}<br>
              <span style="color:${INK}">${esc(t.signature)}</span>
            </td></tr>
          </table>
        </td></tr>

        <!-- The one thing to do -->
        <tr><td align="center" style="padding-top:26px">
          <a href="${esc(ctaUrl)}" style="display:inline-block;background:${ACCENT_FILL};color:${ACCENT_TEXT};font-family:${FONT};font-size:15px;font-weight:600;text-decoration:none;padding:14px 28px;border-radius:999px">
            ${esc(t.cta)}
          </a>
        </td></tr>`;

  const html = emailShell({ lang: locale, title: esc(t.subject), inner });
  const text = [t.greeting, "", ...t.paragraphs.flatMap((p) => [p, ""]), `${t.cta}: ${ctaUrl}`, "", t.signOff, t.signature, "", "TACTICAL HB"].join("\n");
  return { subject: t.subject, html, text, attachments: [] };
}

/* ---- The registration letter ----------------------------------------------- */

/* A registration has to answer a question the enquiry never raised: the
   applicant now has an ACCOUNT, and it does nothing yet. So the copy states
   the order of events — finish the application, we review, access opens —
   and never implies the account is live. Usually they finish the application
   on the very next screen; this letter is the way back for anyone who left. */
const REGISTRATION: Record<string, Copy> = {
  en: {
    subject: "Your wholesale application — next steps | Tactical HB",
    headline: "Your wholesale application",
    greeting: "Hi,",
    paragraphs: [
      "Thank you for registering for a Tactical HB wholesale account.",
      "Your account has been created, but it is not active yet. To open it, finish your application on our site: a few business details and a photo or PDF of your company registration or tax document. If you already did that straight after registering, there's nothing more to do.",
      "Once your application is complete, our team reviews it within 2–3 business days. We will email you as soon as your account is approved, and wholesale pricing and ordering become available the next time you sign in.",
      "If you have any questions, simply reply to this email.",
    ],
    cta: "Finish your application",
    signOff: "Best regards,",
    signature: "Tactical HB Team.",
  },
  uk: {
    subject: "Ваша заявка на оптовий акаунт — наступні кроки | Tactical HB",
    headline: "Ваша заявка на оптовий акаунт",
    greeting: "Вітаємо,",
    paragraphs: [
      "Дякуємо за реєстрацію оптового акаунта Tactical HB.",
      "Ваш акаунт створено, але він ще не активний. Щоб відкрити його, завершіть заявку на нашому сайті: кілька даних про ваш бізнес і фото або PDF документа про реєстрацію чи податкового документа. Якщо ви вже зробили це одразу після реєстрації — більше нічого не потрібно.",
      "Щойно заявка буде заповнена, наша команда розгляне її протягом 2–3 робочих днів. Ми напишемо вам одразу після схвалення — оптові ціни та замовлення стануть доступними при наступному вході.",
      "Якщо у вас є запитання, просто дайте відповідь на цей лист.",
    ],
    cta: "Завершити заявку",
    signOff: "З повагою,",
    signature: "Команда Tactical HB.",
  },
  ja: {
    subject: "卸売アカウントのお申し込み — 次のステップ | Tactical HB",
    headline: "卸売アカウントのお申し込み",
    greeting: "お世話になっております。",
    paragraphs: [
      "Tactical HB の卸売アカウントにご登録いただきありがとうございます。",
      "アカウントは作成されましたが、まだ有効ではありません。ご利用を開始するには、サイト上でお申し込みを完了してください。事業に関するいくつかの情報と、会社登記書類または納税書類の写真か PDF をご用意ください。ご登録直後にすでに完了されている場合は、これ以上の手続きは不要です。",
      "お申し込みの完了後、2〜3 営業日以内に審査いたします。承認が完了しましたらメールでお知らせし、次回ログイン時から卸価格とご注文をご利用いただけます。",
      "ご不明な点は、このメールにご返信ください。",
    ],
    cta: "お申し込みを完了する",
    signOff: "何卒よろしくお願いいたします。",
    signature: "Tactical HB チーム",
  },
  ar: {
    subject: "طلب حساب الجملة — الخطوات التالية | Tactical HB",
    headline: "طلب حساب الجملة",
    greeting: "مرحبًا،",
    paragraphs: [
      "شكرًا لتسجيلك للحصول على حساب جملة لدى Tactical HB.",
      "أُنشئ حسابك، لكنه غير مُفعّل بعد. ولفتحه، أكمل طلبك على موقعنا: بعض بيانات نشاطك التجاري وصورة أو ملف PDF لسجل الشركة أو المستند الضريبي. وإن كنت قد أكملته مباشرة بعد التسجيل، فلا حاجة لأي خطوة أخرى.",
      "وبمجرد اكتمال طلبك، يراجعه فريقنا خلال 2–3 أيام عمل. وسنراسلك فور اعتماد حسابك، عندها تتاح أسعار الجملة والطلب في المرة التالية التي تسجّل فيها الدخول.",
      "وإن كان لديك أي استفسار، يكفي أن ترد على هذه الرسالة.",
    ],
    cta: "أكمل طلبك",
    signOff: "مع خالص التقدير،",
    signature: "فريق Tactical HB",
  },
};

/** The letter a wholesale registration gets. `siteUrl` must be absolute. */
export function buildWholesaleRegistrationReply(locale: string, siteUrl: string): WholesaleReply {
  const lang = REGISTRATION[locale] ? locale : "en";
  return letter(REGISTRATION[lang], lang, `${siteUrl.replace(/\/$/, "")}/${lang}/wholesale/portal`);
}

/* ---- The one reminder ------------------------------------------------------ */

/* Sent once, two days after registering, to an applicant who has not finished
   the application (lib/wholesale-reminders). Short on purpose: the account
   exists, one step is left, here is the button. */
const REMINDER: Record<string, Copy> = {
  en: {
    subject: "One step left to open your wholesale account | Tactical HB",
    headline: "One step left",
    greeting: "Hi,",
    paragraphs: [
      "Your Tactical HB wholesale account is waiting on your application — we can't review it until it's complete.",
      "It takes about five minutes: a few business details and a photo or PDF of your company registration or tax document. Anything you've already filled in is saved.",
    ],
    cta: "Finish your application",
    signOff: "Best regards,",
    signature: "Tactical HB Team.",
  },
  uk: {
    subject: "Залишився один крок до оптового акаунта | Tactical HB",
    headline: "Залишився один крок",
    greeting: "Вітаємо,",
    paragraphs: [
      "Ваш оптовий акаунт Tactical HB чекає на заявку — ми не можемо розглянути її, доки вона не заповнена.",
      "Це займе близько п'яти хвилин: кілька даних про ваш бізнес і фото або PDF документа про реєстрацію чи податкового документа. Усе, що ви вже заповнили, збережено.",
    ],
    cta: "Завершити заявку",
    signOff: "З повагою,",
    signature: "Команда Tactical HB.",
  },
  ja: {
    subject: "卸売アカウント開設まであと一歩です | Tactical HB",
    headline: "あと一歩です",
    greeting: "お世話になっております。",
    paragraphs: [
      "Tactical HB の卸売アカウントは、お申し込みの完了をお待ちしています。完了するまで審査を開始できません。",
      "所要時間は約5分です。事業に関するいくつかの情報と、会社登記書類または納税書類の写真か PDF をご用意ください。入力済みの内容は保存されています。",
    ],
    cta: "お申し込みを完了する",
    signOff: "何卒よろしくお願いいたします。",
    signature: "Tactical HB チーム",
  },
  ar: {
    subject: "خطوة واحدة لفتح حساب الجملة | Tactical HB",
    headline: "تبقّت خطوة واحدة",
    greeting: "مرحبًا،",
    paragraphs: [
      "حساب الجملة لدى Tactical HB بانتظار طلبك — ولا يمكننا مراجعته قبل اكتماله.",
      "يستغرق الأمر نحو خمس دقائق: بعض بيانات نشاطك التجاري وصورة أو ملف PDF لسجل الشركة أو المستند الضريبي. وكل ما عبّأته محفوظ.",
    ],
    cta: "أكمل طلبك",
    signOff: "مع خالص التقدير،",
    signature: "فريق Tactical HB",
  },
};

export function buildApplicationReminder(locale: string, siteUrl: string): WholesaleReply {
  const lang = REMINDER[locale] ? locale : "en";
  return letter(REMINDER[lang], lang, `${siteUrl.replace(/\/$/, "")}/${lang}/wholesale/portal`);
}
