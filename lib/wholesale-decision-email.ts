import "server-only";
import { esc } from "@/lib/email";
import { CARD, INK, MUTED, FONT, ACCENT_FILL, ACCENT_TEXT, emailShell } from "@/lib/email-theme";
import type { AccountStatus } from "@/lib/wholesale-display";

/* ---------------------------------------------------------------------------
   What a partner hears when a human decides.

   THE APPROVAL LETTER IS THE ONLY THING THAT TELLS THEM. Approving unlocks the
   portal silently — the partner is not sitting on the page refreshing, they
   posted a PDF days ago and went back to work. Without this letter the whole
   flow ends in a door that quietly unlocked and nobody knocked on.

   THE DECLINE LETTER ARGUES NOTHING. It says the outcome, leaves the door open
   for a conversation by email, and stops. A rejection that explains itself in
   detail invites a rebuttal, and this is a commercial judgement rather than a
   test somebody failed.

   Suspension deliberately sends NOTHING. It is used mid-relationship, often
   over an unpaid invoice or a dispute already in someone's inbox, and an
   automatic "your access has been withdrawn" landing in the middle of that
   conversation would be the wrong voice at the wrong moment. The person doing
   the suspending is already writing to them.
--------------------------------------------------------------------------- */

type Copy = {
  subject: string;
  headline: string;
  greeting: string;
  paragraphs: string[];
  cta?: string;
  signOff: string;
  signature: string;
};

const APPROVED: Record<string, Copy> = {
  en: {
    subject: "Your wholesale account is open | Tactical HB",
    headline: "Your wholesale account is open",
    greeting: "Hi,",
    paragraphs: [
      "Your application has been reviewed and approved. Thank you for the paperwork.",
      "Dealer pricing and ordering are available now. Sign in and set the quantities you need, then send the list — we confirm availability and email you the payment details. Nothing is charged on the site.",
    ],
    cta: "Open the trade portal",
    signOff: "Best regards,",
    signature: "Tactical HB Team.",
  },
  uk: {
    subject: "Ваш оптовий акаунт відкрито | Tactical HB",
    headline: "Ваш оптовий акаунт відкрито",
    greeting: "Вітаємо,",
    paragraphs: [
      "Ми розглянули та схвалили вашу заявку. Дякуємо за надіслані документи.",
      "Оптові ціни та замовлення вже доступні. Увійдіть, вкажіть потрібні кількості та надішліть список — ми підтвердимо наявність і надішлемо реквізити для оплати. На сайті нічого не списується.",
    ],
    cta: "Перейти до оптового порталу",
    signOff: "З повагою,",
    signature: "Команда Tactical HB.",
  },
  ja: {
    subject: "卸売アカウントを開設しました | Tactical HB",
    headline: "卸売アカウントを開設しました",
    greeting: "お世話になっております。",
    paragraphs: [
      "お申し込みを審査し、承認いたしました。書類のご提出をありがとうございました。",
      "卸価格とご注文が現在ご利用いただけます。ログインして必要な数量を入力し、リストをお送りください。在庫を確認のうえ、お支払い方法をメールでご案内します。サイト上でのご請求はございません。",
    ],
    cta: "取引ポータルを開く",
    signOff: "何卒よろしくお願いいたします。",
    signature: "Tactical HB チーム",
  },
  ar: {
    subject: "تم فتح حساب الجملة الخاص بك | Tactical HB",
    headline: "تم فتح حساب الجملة الخاص بك",
    greeting: "مرحبًا،",
    paragraphs: [
      "راجعنا طلبك واعتمدناه. وشكرًا لك على إرسال المستندات.",
      "أسعار الجملة والطلب متاحة الآن. سجّل الدخول وحدّد الكميات التي تحتاجها ثم أرسل القائمة — سنؤكّد التوفّر ونرسل إليك تفاصيل الدفع بالبريد الإلكتروني. ولا يُخصم أي مبلغ على الموقع.",
    ],
    cta: "افتح بوابة التجارة",
    signOff: "مع خالص التقدير،",
    signature: "فريق Tactical HB",
  },
};

const DECLINED: Record<string, Copy> = {
  en: {
    subject: "About your wholesale application | Tactical HB",
    headline: "About your wholesale application",
    greeting: "Hi,",
    paragraphs: [
      "Thank you for applying for a Tactical HB wholesale account, and for the time you put into the application.",
      "We are not able to open a trade account on this application. If your circumstances change, or you think we have missed something, do reply to this email and we will take another look.",
    ],
    signOff: "Best regards,",
    signature: "Tactical HB Team.",
  },
  uk: {
    subject: "Щодо вашої заявки на оптовий акаунт | Tactical HB",
    headline: "Щодо вашої заявки",
    greeting: "Вітаємо,",
    paragraphs: [
      "Дякуємо за заявку на оптовий акаунт Tactical HB і за час, який ви на неї витратили.",
      "За цією заявкою ми не можемо відкрити оптовий акаунт. Якщо обставини зміняться або ви вважаєте, що ми щось не врахували — дайте відповідь на цей лист, і ми подивимося ще раз.",
    ],
    signOff: "З повагою,",
    signature: "Команда Tactical HB.",
  },
  ja: {
    subject: "卸売アカウントのお申し込みについて | Tactical HB",
    headline: "お申し込みについて",
    greeting: "お世話になっております。",
    paragraphs: [
      "Tactical HB の卸売アカウントにお申し込みいただき、またお時間を割いてご準備いただき、ありがとうございました。",
      "今回のお申し込みでは取引アカウントの開設を見送らせていただきました。状況が変わった場合や、行き違いがあるとお考えの場合は、このメールにご返信ください。あらためて確認いたします。",
    ],
    signOff: "何卒よろしくお願いいたします。",
    signature: "Tactical HB チーム",
  },
  ar: {
    subject: "بخصوص طلبك للحصول على حساب جملة | Tactical HB",
    headline: "بخصوص طلبك",
    greeting: "مرحبًا،",
    paragraphs: [
      "شكرًا لتقدّمك بطلب حساب جملة لدى Tactical HB، وعلى الوقت الذي خصّصته لإعداده.",
      "لا يمكننا فتح حساب تجاري بناءً على هذا الطلب. وإن تغيّرت ظروفك أو رأيت أننا أغفلنا شيئًا، فردّ على هذه الرسالة وسننظر في الأمر مجددًا.",
    ],
    signOff: "مع خالص التقدير،",
    signature: "فريق Tactical HB",
  },
};

export type DecisionMail = { subject: string; html: string; text: string } | null;

/**
 * The letter for a decision, or null when the decision sends none.
 *
 * Returning null rather than throwing keeps the caller honest: "suspended has
 * no letter" is a product decision, not an error, and the admin action treats
 * a null as success.
 */
export function buildDecisionMail(
  status: AccountStatus,
  locale: string,
  siteUrl: string
): DecisionMail {
  const table = status === "approved" ? APPROVED : status === "rejected" ? DECLINED : null;
  if (!table) return null;

  const t = table[locale] ?? table.en;
  const dir = locale === "ar" ? "rtl" : "ltr";
  const base = siteUrl.replace(/\/$/, "");
  const portal = `${base}/${locale}/wholesale/portal`;

  const para = (s: string, top: number) => `
            <tr><td dir="${dir}" style="font-family:${FONT};font-size:15px;line-height:1.65;color:${INK};padding-top:${top}px">
              ${esc(s)}
            </td></tr>`;

  const button = t.cta
    ? `
        <tr><td align="center" style="padding-top:26px">
          <a href="${esc(portal)}" style="display:inline-block;background:${ACCENT_FILL};color:${ACCENT_TEXT};font-family:${FONT};font-size:15px;font-weight:600;text-decoration:none;padding:14px 28px;border-radius:999px">
            ${esc(t.cta)}
          </a>
        </td></tr>`
    : "";

  const inner = `
        <tr><td align="center" style="padding-bottom:30px">
          <h1 style="margin:0;font-family:${FONT};font-size:27px;line-height:1.25;font-weight:700;color:${INK}">
            ${esc(t.headline)}
          </h1>
        </td></tr>

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
        ${button}`;

  const text = [
    t.greeting,
    "",
    ...t.paragraphs.flatMap((p) => [p, ""]),
    ...(t.cta ? [`${t.cta}: ${portal}`, ""] : []),
    t.signOff,
    t.signature,
    "",
    "TACTICAL HB",
  ].join("\n");

  return { subject: t.subject, html: emailShell({ lang: locale, title: esc(t.subject), inner }), text };
}
