import "server-only";
import { esc } from "@/lib/email";
import { CARD, INK, MUTED, FONT, emailShell } from "@/lib/email-theme";

/* ---------------------------------------------------------------------------
   The automatic reply to a wholesale enquiry, with the application form
   attached.

   Same shell, palette and wordmark as the order confirmation and the shipping
   notification — all three import lib/email-theme, so they cannot drift apart.

   This one is a LETTER rather than a receipt: no line items, no totals. The
   headline stays centred like its siblings, and the body sits left-aligned in a
   single white card, because centring a five-paragraph letter would read as a
   notice rather than a message from a person.

   The form itself is the point of the email, so the attachment is named for the
   customer's own filing (ASCII only — Cyrillic filenames still arrive mangled in
   some desktop clients) and the covering text says it is attached.
--------------------------------------------------------------------------- */

/** Where the two forms live, served as ordinary static assets. */
const FORM_PATH: Record<"uk" | "en", string> = {
  en: "/wholesale/wholesale-application-en.pdf",
  uk: "/wholesale/wholesale-application-uk.pdf",
};

const FORM_FILENAME: Record<"uk" | "en", string> = {
  en: "Tactical-HB-Wholesale-Application-Form.pdf",
  uk: "Tactical-HB-Wholesale-Application-Form-UA.pdf",
};

type Copy = {
  subject: string;
  headline: string;
  /** The letter, paragraph by paragraph. Greeting first, signature last. */
  greeting: string;
  paragraphs: string[];
  signOff: string;
  signature: string;
};

const COPY: Record<"uk" | "en", Copy> = {
  en: {
    subject: "Wholesale Partnership Enquiry – Next Steps | Tactical HB",
    headline: "Wholesale partnership — next steps",
    greeting: "Hi,",
    paragraphs: [
      "Thank you for your interest in becoming a wholesale partner of Tactical HB.",
      "We have received your enquiry. To proceed, please complete the attached Wholesale Partnership Application Form and return it to us together with the requested supporting documents.",
      "Once we receive your completed form, our team will review it within 2–3 business days and contact you to discuss partnership terms.",
      "If you have any questions, simply reply to this email.",
    ],
    signOff: "Best regards,",
    signature: "Tactical HB Team.",
  },
  uk: {
    subject: "Заявка на оптове партнерство – Наступні кроки | Tactical HB",
    headline: "Оптове партнерство — наступні кроки",
    greeting: "Вітаємо,",
    paragraphs: [
      "Дякуємо за інтерес до оптового партнерства з Tactical HB.",
      "Ми отримали вашу заявку. Щоб продовжити, будь ласка, заповніть додану Заявку на оптове партнерство та надішліть її нам разом із необхідними документами.",
      "Після отримання заповненої форми наша команда розгляне її протягом 2–3 робочих днів і зв'яжеться з вами для обговорення умов співпраці.",
      "Якщо у вас є запитання, просто дайте відповідь на цей лист.",
    ],
    signOff: "З повагою,",
    signature: "Команда Tactical HB.",
  },
};

export type WholesaleReply = {
  subject: string;
  html: string;
  text: string;
  attachments: { filename: string; path: string }[];
};

/**
 * Build the auto-reply for `locale`.
 *
 * `siteUrl` must be absolute — Resend fetches the attachment from it, so a
 * relative path would simply produce an email with no form attached.
 */
export function buildWholesaleReply(locale: string, siteUrl: string): WholesaleReply {
  const lang = locale === "uk" ? "uk" : "en";
  const t = COPY[lang];
  const base = siteUrl.replace(/\/$/, "");

  const para = (s: string, top: number) => `
            <tr><td style="font-family:${FONT};font-size:15px;line-height:1.65;color:${INK};padding-top:${top}px">
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
            <tr><td style="font-family:${FONT};font-size:15px;line-height:1.65;color:${MUTED};padding-top:24px">
              ${esc(t.signOff)}<br>
              <span style="color:${INK}">${esc(t.signature)}</span>
            </td></tr>
          </table>
        </td></tr>`;

  const html = emailShell({ lang, title: esc(t.subject), inner });

  const text = [
    t.greeting,
    "",
    ...t.paragraphs.flatMap((p) => [p, ""]),
    t.signOff,
    t.signature,
    "",
    "TACTICAL HB",
  ].join("\n");

  return {
    subject: t.subject,
    html,
    text,
    attachments: [{ filename: FORM_FILENAME[lang], path: `${base}${FORM_PATH[lang]}` }],
  };
}

/* ---------------------------------------------------------------------------
   The letter a REGISTRATION gets — as opposed to an enquiry.

   Why this is not buildWholesaleReply with a different subject: the enquiry
   letter answers "we got your message and here is the form". A registration
   has to answer a second question the enquiry never raised — the applicant
   now has an ACCOUNT, and that account does nothing yet. Somebody who fills in
   a password and is then shown a locked door will email support unless the
   letter says plainly why it is locked and what unlocks it.

   So the copy states the order of events: form back to us, we review, access
   opens. And it never implies the account is live.

   THE FORM IS ENGLISH FOR THREE OF THE FOUR STOREFRONTS, because that is how
   many PDFs exist. Rather than quietly attaching an English document to a
   Japanese letter, the Japanese and Arabic versions say so in their own
   language — an unexplained English attachment reads as a mistake, and a
   named one reads as a fact.
--------------------------------------------------------------------------- */

type RegCopy = Copy & {
  /** Only where the attached form is not in the reader's own language. */
  formNote?: string;
};

const REG_COPY: Record<string, RegCopy> = {
  en: {
    subject: "Your wholesale application — next steps | Tactical HB",
    headline: "Your wholesale application",
    greeting: "Hi,",
    paragraphs: [
      "Thank you for registering for a Tactical HB wholesale account.",
      "Your account has been created, but it is not active yet. To open it, please complete the attached Wholesale Partnership Application Form and email it back to us with the supporting documents it asks for.",
      "Once your completed form is with us, our team reviews it within 2–3 business days. We will email you as soon as your account is approved, and wholesale pricing and ordering become available the next time you sign in.",
      "If you have any questions, simply reply to this email.",
    ],
    signOff: "Best regards,",
    signature: "Tactical HB Team.",
  },
  uk: {
    subject: "Ваша заявка на оптовий акаунт — наступні кроки | Tactical HB",
    headline: "Ваша заявка на оптовий акаунт",
    greeting: "Вітаємо,",
    paragraphs: [
      "Дякуємо за реєстрацію оптового акаунта Tactical HB.",
      "Ваш акаунт створено, але він ще не активний. Щоб відкрити його, заповніть додану Заявку на оптове партнерство та надішліть її нам разом із документами, які в ній зазначені.",
      "Щойно ми отримаємо заповнену форму, наша команда розгляне її протягом 2–3 робочих днів. Ми напишемо вам одразу після схвалення — оптові ціни та замовлення стануть доступними при наступному вході.",
      "Якщо у вас є запитання, просто дайте відповідь на цей лист.",
    ],
    signOff: "З повагою,",
    signature: "Команда Tactical HB.",
  },
  ja: {
    subject: "卸売アカウントのお申し込み — 次のステップ | Tactical HB",
    headline: "卸売アカウントのお申し込み",
    greeting: "お世話になっております。",
    paragraphs: [
      "Tactical HB の卸売アカウントにご登録いただきありがとうございます。",
      "アカウントは作成されましたが、まだ有効ではありません。ご利用を開始するには、添付の申込書にご記入のうえ、記載の必要書類とあわせてメールでご返送ください。",
      "ご返送いただいた申込書を確認のうえ、2〜3 営業日以内に審査いたします。承認が完了しましたらメールでお知らせし、次回ログイン時から卸価格とご注文をご利用いただけます。",
      "ご不明な点は、このメールにご返信ください。",
    ],
    signOff: "何卒よろしくお願いいたします。",
    signature: "Tactical HB チーム",
    formNote: "※ 申込書は現在英語版のみのご用意となります。ご記入は英語でお願いいたします。",
  },
  ar: {
    subject: "طلب حساب الجملة — الخطوات التالية | Tactical HB",
    headline: "طلب حساب الجملة",
    greeting: "مرحبًا،",
    paragraphs: [
      "شكرًا لتسجيلك للحصول على حساب جملة لدى Tactical HB.",
      "أُنشئ حسابك، لكنه غير مُفعّل بعد. ولفتحه، يُرجى تعبئة استمارة طلب الشراكة المرفقة وإعادتها إلينا بالبريد الإلكتروني مع المستندات المطلوبة فيها.",
      "وبمجرد وصول الاستمارة مكتملة، يراجعها فريقنا خلال 2–3 أيام عمل. وسنراسلك فور اعتماد حسابك، عندها تتاح أسعار الجملة والطلب في المرة التالية التي تسجّل فيها الدخول.",
      "وإن كان لديك أي استفسار، يكفي أن ترد على هذه الرسالة.",
    ],
    signOff: "مع خالص التقدير،",
    signature: "فريق Tactical HB",
    formNote: "ملاحظة: الاستمارة متاحة حاليًا بالإنجليزية فقط. يُرجى تعبئتها بالإنجليزية.",
  },
};

/**
 * Build the registration letter for `locale`, with the application form on it.
 *
 * `siteUrl` must be absolute — Resend fetches the attachment over HTTP, so a
 * relative path produces an email with no form attached, which is the one
 * failure this whole letter exists to avoid.
 */
export function buildWholesaleRegistrationReply(locale: string, siteUrl: string): WholesaleReply {
  const t = REG_COPY[locale] ?? REG_COPY.en;
  // Ukrainian is the only non-English form that exists; everyone else gets the
  // English one, and ja/ar are told so by formNote above.
  const form: "uk" | "en" = locale === "uk" ? "uk" : "en";
  const base = siteUrl.replace(/\/$/, "");
  const dir = locale === "ar" ? "rtl" : "ltr";

  const para = (s: string, top: number) => `
            <tr><td dir="${dir}" style="font-family:${FONT};font-size:15px;line-height:1.65;color:${INK};padding-top:${top}px">
              ${esc(s)}
            </td></tr>`;

  const note = t.formNote
    ? `
            <tr><td dir="${dir}" style="font-family:${FONT};font-size:13px;line-height:1.6;color:${MUTED};padding-top:18px">
              ${esc(t.formNote)}
            </td></tr>`
    : "";

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
            ${note}
            <tr><td dir="${dir}" style="font-family:${FONT};font-size:15px;line-height:1.65;color:${MUTED};padding-top:24px">
              ${esc(t.signOff)}<br>
              <span style="color:${INK}">${esc(t.signature)}</span>
            </td></tr>
          </table>
        </td></tr>`;

  const html = emailShell({ lang: locale, title: esc(t.subject), inner });

  const text = [
    t.greeting,
    "",
    ...t.paragraphs.flatMap((p) => [p, ""]),
    ...(t.formNote ? [t.formNote, ""] : []),
    t.signOff,
    t.signature,
    "",
    "TACTICAL HB",
  ].join("\n");

  return {
    subject: t.subject,
    html,
    text,
    attachments: [{ filename: FORM_FILENAME[form], path: `${base}${FORM_PATH[form]}` }],
  };
}
