import "server-only";
import { esc } from "@/lib/email";
import { CARD, INK, MUTED, FONT, ACCENT_FILL, ACCENT_TEXT, emailShell } from "@/lib/email-theme";
import type { AccountStatus } from "@/lib/wholesale-display";
import enMsg from "@/messages/en.json";
import ukMsg from "@/messages/uk.json";
import jaMsg from "@/messages/ja.json";
import arMsg from "@/messages/ar.json";

/* ---- Which kind of business did they say they were? -----------------------

   business_type is stored as the LABEL the applicant picked, in the language
   they picked it in — "Shisha Lounge / Bar", "Кальянна / Бар", "لاونج شيشة /
   بار". That is deliberate (0032): the enquiry form emails the label too, so
   sales reads identical words from both doors.

   It does mean the decline letter has to work backwards from a label to a
   category. Matching against every locale's own labels rather than hardcoding
   strings here keeps the two in step — if a label is ever reworded in
   messages/*.json, this follows it instead of quietly stopping matching.
--------------------------------------------------------------------------- */

export type BizCategory = "shop" | "distribution" | "lounge";

const LABELS: Record<BizCategory, string[]> = {
  shop: [enMsg, ukMsg, jaMsg, arMsg].map((m) => m.wholesale.biz_shop),
  distribution: [enMsg, ukMsg, jaMsg, arMsg].map((m) => m.wholesale.biz_distribution),
  lounge: [enMsg, ukMsg, jaMsg, arMsg].map((m) => m.wholesale.biz_lounge),
};

export function resolveBizCategory(stored: string | null | undefined): BizCategory | null {
  const v = (stored ?? "").trim().toLowerCase();
  if (!v) return null;
  for (const key of Object.keys(LABELS) as BizCategory[]) {
    if (LABELS[key].some((label) => label.trim().toLowerCase() === v)) return key;
  }
  // A row typed by hand in the CRM, or an older label. The letter falls back
  // to wording that asks for evidence without naming a category — better than
  // guessing wrong and telling a distributor to send photographs of a shop.
  return null;
}

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

/* The decline letter is assembled rather than fixed, because the useful part
   of it is category-specific. `trading` completes "we could not confirm you
   are trading as …" and `evidence` completes "reply with …". The null row is
   the fallback when the category could not be resolved. */
type DeclineCopy = {
  subject: string;
  headline: string;
  greeting: string;
  opening: string;
  reason: (trading: string) => string;
  invite: (evidence: string) => string;
  trading: Record<BizCategory | "unknown", string>;
  evidence: Record<BizCategory | "unknown", string>;
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
      "Wholesale pricing and ordering are available now. Sign in and set the quantities you need, then send the list — we confirm availability and email you the payment details. Nothing is charged on the site.",
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

const DECLINED: Record<string, DeclineCopy> = {
  en: {
    subject: "About your wholesale application | Tactical HB",
    headline: "About your wholesale application",
    greeting: "Hi,",
    opening:
      "Thank you for applying for a Tactical HB wholesale account, and for the time you put into the application.",
    reason: (trading) =>
      `From what we received we weren't able to confirm that you are trading as ${trading}, so we can't open a trade account on this application as it stands.`,
    invite: (evidence) =>
      `That may simply be a gap in the paperwork rather than the whole picture. If you can reply to this email with ${evidence}, we'll gladly look at it again.`,
    trading: {
      shop: "a retail shop or online store",
      distribution: "a distributor",
      lounge: "a shisha lounge or bar",
      unknown: "a trade business",
    },
    evidence: {
      shop: "photographs of your shop, or a link to your online store, along with your business registration",
      distribution:
        "your business registration and details of the brands or territories you currently distribute",
      lounge: "photographs of your venue and its trading address, along with your business registration",
      unknown:
        "your business registration and either photographs or a link to your shop, venue or online store",
    },
    signOff: "Best regards,",
    signature: "Tactical HB Team.",
  },
  uk: {
    subject: "Щодо вашої заявки на оптовий акаунт | Tactical HB",
    headline: "Щодо вашої заявки",
    greeting: "Вітаємо,",
    opening:
      "Дякуємо за заявку на оптовий акаунт Tactical HB і за час, який ви на неї витратили.",
    reason: (trading) =>
      `З наданих матеріалів ми не змогли підтвердити, що ви працюєте як ${trading}, тому за цією заявкою відкрити оптовий акаунт не можемо.`,
    invite: (evidence) =>
      `Можливо, це лише брак документів, а не повна картина. Якщо надішлете у відповідь на цей лист ${evidence}, ми з радістю розглянемо заявку ще раз.`,
    trading: {
      shop: "роздрібний або онлайн-магазин",
      distribution: "дистриб'ютор",
      lounge: "кальянна або бар",
      unknown: "оптовий бізнес",
    },
    evidence: {
      shop: "фотографії магазину або посилання на ваш онлайн-магазин разом із реєстраційними документами",
      distribution:
        "реєстраційні документи та інформацію про бренди чи території, які ви наразі представляєте",
      lounge: "фотографії закладу та його адресу разом із реєстраційними документами",
      unknown:
        "реєстраційні документи та фотографії або посилання на ваш магазин, заклад чи онлайн-магазин",
    },
    signOff: "З повагою,",
    signature: "Команда Tactical HB.",
  },
  ja: {
    subject: "卸売アカウントのお申し込みについて | Tactical HB",
    headline: "お申し込みについて",
    greeting: "お世話になっております。",
    opening:
      "Tactical HB の卸売アカウントにお申し込みいただき、またお時間を割いてご準備いただき、ありがとうございました。",
    reason: (trading) =>
      `いただいた資料からは、${trading}として営業されていることを確認できませんでした。そのため、今回のお申し込みでは取引アカウントを開設いたしかねます。`,
    invite: (evidence) =>
      `書類が揃っていないだけということも考えられます。${evidence}をこのメールへのご返信でお送りいただければ、あらためて審査いたします。`,
    trading: {
      shop: "小売店またはオンラインショップ",
      distribution: "ディストリビューター",
      lounge: "シーシャラウンジまたはバー",
      unknown: "卸売のお取引先",
    },
    evidence: {
      shop: "店舗の写真またはオンラインショップの URL と、事業者登録の書類",
      distribution: "事業者登録の書類と、現在お取り扱いのブランドまたは地域の詳細",
      lounge: "店舗の写真と営業所在地、および事業者登録の書類",
      unknown: "事業者登録の書類と、店舗・施設・オンラインショップの写真または URL",
    },
    signOff: "何卒よろしくお願いいたします。",
    signature: "Tactical HB チーム",
  },
  ar: {
    subject: "بخصوص طلبك للحصول على حساب جملة | Tactical HB",
    headline: "بخصوص طلبك",
    greeting: "مرحبًا،",
    opening:
      "شكرًا لتقدّمك بطلب حساب جملة لدى Tactical HB، وعلى الوقت الذي خصّصته لإعداده.",
    reason: (trading) =>
      `لم نتمكّن من التأكّد، بناءً على ما وصلنا، من أن نشاطك هو ${trading}، ولذلك لا يمكننا فتح حساب تجاري بناءً على هذا الطلب بصيغته الحالية.`,
    invite: (evidence) =>
      `وقد يكون الأمر مجرد نقص في المستندات لا أكثر. فإن أرسلت ردًّا على هذه الرسالة ${evidence}، سيسعدنا مراجعة طلبك من جديد.`,
    /* Nominative, because the sentence above is now "…that your business IS
       X" rather than "…that you work X". */
    trading: {
      shop: "متجر للبيع بالتجزئة أو متجر إلكتروني",
      distribution: "التوزيع",
      lounge: "لاونج شيشة أو بار",
      unknown: "نشاط تجاري",
    },
    evidence: {
      shop: "صورًا لمتجرك أو رابطًا لمتجرك الإلكتروني، مع السجل التجاري",
      distribution: "السجل التجاري وتفاصيل العلامات أو المناطق التي توزّعها حاليًا",
      lounge: "صورًا للمكان وعنوان مزاولة النشاط، مع السجل التجاري",
      unknown: "السجل التجاري وصورًا أو رابطًا لمتجرك أو مكانك أو متجرك الإلكتروني",
    },
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
  siteUrl: string,
  /** What they applied as — decides which evidence the decline asks for. */
  businessType?: string | null
): DecisionMail {
  if (status !== "approved" && status !== "rejected") return null;

  /* The decline is assembled from its parts; the approval is a fixed letter.
     Keeping them separate rather than forcing one shape means the approval
     never has to carry an empty "reason" it does not have. */
  const t: Copy =
    status === "approved"
      ? APPROVED[locale] ?? APPROVED.en
      : (() => {
          const d = DECLINED[locale] ?? DECLINED.en;
          const cat = resolveBizCategory(businessType) ?? "unknown";
          return {
            subject: d.subject,
            headline: d.headline,
            greeting: d.greeting,
            paragraphs: [d.opening, d.reason(d.trading[cat]), d.invite(d.evidence[cat])],
            signOff: d.signOff,
            signature: d.signature,
          };
        })();
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
