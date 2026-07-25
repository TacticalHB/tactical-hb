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
