import "server-only";
import { esc } from "@/lib/email";
import {
  CARD,
  FAINT,
  FONT,
  INK,
  LINE,
  MUTED,
  emailShell,
} from "@/lib/email-theme";
import { t } from "@/lib/i18n-text";
import type { WholesaleRequest } from "@/lib/wholesale-display";

/* ---------------------------------------------------------------------------
   The two letters a submitted request sends.

   TO STAFF — the whole request, in a table, with the admin link. This is the
   one that must never be the only record: the row is written first and the
   email is best-effort, because an inbox is not a database and a dropped
   letter must not lose an order.

   TO THE PARTNER — an acknowledgement carrying the reference and, crucially,
   what happens next. It states plainly that payment details follow by email,
   because the portal deliberately has no pay button and a partner who expected
   one needs telling where it went.

   NEITHER LETTER QUOTES A TOTAL IT DOES NOT HAVE. Where dealer prices are
   unset the amount column reads "quote on request", the same words the portal
   used — a partner should never see a number in the email that was not on the
   screen.
--------------------------------------------------------------------------- */

/* The palette comes from lib/email-theme, not a private copy of the same hex
   values. The old local constants happened to match, which is exactly how two
   sets of "the same" colours drift apart the first time one is adjusted. */

function siteUrl(): string {
  return (process.env.SITE_URL || "https://tactical-hb.com").replace(/\/$/, "");
}

/** UAH for the Ukrainian storefront, EUR everywhere else — the site's rule. */
function money(req: WholesaleRequest, eur: number | null, uah: number | null): string | null {
  if (req.locale === "uk") return uah === null ? null : `₴${Math.round(uah).toLocaleString("uk-UA")}`;
  return eur === null ? null : `€${eur.toFixed(2)}`;
}

function quoteOnRequest(locale: string): string {
  return t(locale, {
    en: "Quote on request",
    uk: "Ціна за запитом",
    ja: "お見積り",
    ar: "السعر عند الطلب",
  });
}

function linesTable(req: WholesaleRequest, locale: string): string {
  /* THE TABLE HAS TO MIRROR TOO. Without dir on the table itself the Arabic
     letter kept the columns in Latin order — Product on the left, the Arabic
     header text right-aligned inside it — and the full stop on the closing
     sentence migrated to the front of the line, which is the classic sign of
     Arabic text sitting in a left-to-right box.

     `align` takes physical values that email clients actually honour, so the
     logical start/end are computed here rather than left to CSS that half of
     them would drop. */
  const dir = locale === "ar" ? "rtl" : "ltr";
  const startAlign = dir === "rtl" ? "right" : "left";
  const endAlign = dir === "rtl" ? "left" : "right";

  const head = (s: string, align = startAlign) =>
    `<th align="${align}" style="padding:8px 10px;border-bottom:1px solid ${LINE};font:600 12px ${FONT};color:${MUTED};text-transform:uppercase;letter-spacing:.06em">${esc(s)}</th>`;
  const cell = (s: string, align = startAlign, ltr = false) =>
    `<td align="${align}"${ltr ? ' dir="ltr"' : ""} style="padding:10px;border-bottom:1px solid ${LINE};font:14px ${FONT};color:${INK}">${esc(s)}</td>`;

  const L = {
    product: t(locale, { en: "Product", uk: "Товар", ja: "製品", ar: "المنتج" }),
    qty: t(locale, { en: "Qty", uk: "К-сть", ja: "数量", ar: "الكمية" }),
    amount: t(locale, { en: "Amount", uk: "Сума", ja: "金額", ar: "المبلغ" }),
  };

  const rows = req.items
    .map((i) => {
      const amount = money(req, i.lineTotalEur, i.lineTotalUah) ?? quoteOnRequest(locale);
      /* The product name is pinned LTR: it is Latin in every locale, and
         "HMD TCT OP — Purple" carries a neutral em-dash that an RTL box would
         happily move to the wrong end. */
      return `<tr>${cell(i.name, startAlign, true)}${cell(String(i.qty), endAlign)}${cell(amount, endAlign)}</tr>`;
    })
    .join("");

  const total = money(req, req.subtotalEur, req.subtotalUah);
  const totalRow = total
    ? `<tr><td colspan="2" align="${endAlign}" style="padding:12px 10px;font:600 14px ${FONT};color:${INK}">${esc(
        t(locale, { en: "Total", uk: "Разом", ja: "合計", ar: "الإجمالي" })
      )}</td><td align="${endAlign}" style="padding:12px 10px;font:600 14px ${FONT};color:${INK}">${esc(total)}</td></tr>`
    : `<tr><td colspan="3" dir="${dir}" align="${startAlign}" style="padding:12px 10px;font:14px ${FONT};color:${MUTED}">${esc(
        t(locale, {
          en: "We will quote this request by email.",
          uk: "Ми надішлемо прорахунок цього запиту листом.",
          ja: "このリクエストのお見積りをメールでお送りします。",
          ar: "سنرسل لك عرض سعر لهذا الطلب عبر البريد الإلكتروني.",
        })
      )}</td></tr>`;

  /* No bottom margin: the partner's letter puts this inside a padded card, so
     a margin here just left a band of dead white under the last row. The staff
     letter is a bare div and spaces itself around the table instead. */
  return `<table cellpadding="0" cellspacing="0" width="100%" dir="${dir}" style="border-collapse:collapse">
    <tr>${head(L.product)}${head(L.qty, endAlign)}${head(L.amount, endAlign)}</tr>${rows}${totalRow}</table>`;
}

/* ---- To staff ------------------------------------------------------------- */

export function buildStaffRequestMail(req: WholesaleRequest): {
  subject: string;
  html: string;
  text: string;
} {
  const admin = `${siteUrl()}/en/admin/wholesale`;
  const rows: [string, string][] = [
    ["Reference", req.reference],
    ["Company", req.company],
    ["Email", req.email ?? "—"],
    ["Telephone", req.phone ?? "—"],
    ["Language", req.locale.toUpperCase()],
    ["Units", String(req.itemCount)],
  ];

  const infoRows = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 16px 4px 0;font:13px ${FONT};color:${MUTED}">${esc(
          k
        )}</td><td style="padding:4px 0;font:14px ${FONT};color:${INK}">${esc(v)}</td></tr>`
    )
    .join("");

  // Staff read in English regardless of the partner's storefront — the admin
  // console is English and Ukrainian, and a Japanese request should not arrive
  // in an inbox nobody there reads.
  const table = linesTable({ ...req, locale: "en" }, "en");

  const note = req.note
    ? `<div style="border-top:1px solid ${LINE};padding-top:14px;margin-bottom:20px">
         <p style="margin:0 0 6px;font:600 13px ${FONT};color:${MUTED}">Partner's note</p>
         <div style="white-space:pre-wrap;font:14px ${FONT};color:${INK}">${esc(req.note)}</div>
       </div>`
    : "";

  const html = `<div style="font:15px/1.6 ${FONT};color:${INK}">
    <p style="margin:0 0 16px"><strong>Wholesale request ${esc(req.reference)}</strong></p>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 20px">${infoRows}</table>
    <div style="margin:0 0 20px">${table}</div>
    ${note}
    <p style="margin:0 0 8px"><a href="${esc(admin)}" style="color:#C45A1A">Open in admin →</a></p>
    <p style="margin:0;font:13px ${FONT};color:${MUTED}">
      No payment has been taken. Reply to the partner with payment details when you are ready.
    </p>
  </div>`;

  const text = [
    `Wholesale request ${req.reference}`,
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    ...req.items.map(
      (i) => `${i.qty} × ${i.name}${i.lineTotalEur !== null ? ` — €${i.lineTotalEur.toFixed(2)}` : " — quote on request"}`
    ),
    "",
    req.note ? `Note: ${req.note}` : "",
    "",
    admin,
    "No payment has been taken.",
  ]
    .filter(Boolean)
    .join("\n");

  return { subject: `Wholesale request ${req.reference} — ${req.company}`, html, text };
}

/* ---- To the partner -------------------------------------------------------- */

export function buildPartnerAckMail(req: WholesaleRequest): {
  subject: string;
  html: string;
  text: string;
} {
  const locale = req.locale;
  const dir = locale === "ar" ? "rtl" : "ltr";

  const L = {
    subject: t(locale, {
      en: `We've received your request ${req.reference}`,
      uk: `Ми отримали ваш запит ${req.reference}`,
      ja: `リクエスト ${req.reference} を受け付けました`,
      ar: `استلمنا طلبك ${req.reference}`,
    }),
    /* Short, because it sits at 27px under the wordmark. The thank-you moved
       into the card below — a headline that runs to two lines competes with
       the reference, which is the thing they will come back looking for. */
    headline: t(locale, {
      en: "Request received",
      uk: "Запит отримано",
      ja: "リクエストを受け付けました",
      ar: "استلمنا طلبك",
    }),
    thanks: t(locale, {
      en: "Thank you — your request is with our team.",
      uk: "Дякуємо — ваш запит уже в роботі.",
      ja: "ありがとうございます。担当チームが確認いたします。",
      ar: "شكرًا لك — طلبك الآن لدى فريقنا.",
    }),
    /* THE SENTENCE THAT REPLACES A PAY BUTTON. The portal has none by design,
       so this has to say where payment happens instead — otherwise the partner
       is left waiting for a checkout that is never coming. */
    next: t(locale, {
      en: "We'll confirm availability and email you the payment details for this order. Nothing has been charged.",
      uk: "Ми підтвердимо наявність і надішлемо реквізити для оплати цього замовлення. Наразі нічого не списано.",
      ja: "在庫を確認のうえ、このご注文のお支払い方法をメールでお送りします。この時点でのご請求はございません。",
      ar: "سنؤكّد التوفّر ونرسل إليك تفاصيل الدفع الخاصة بهذا الطلب عبر البريد الإلكتروني. ولم يُخصم أي مبلغ حتى الآن.",
    }),
    ref: t(locale, { en: "Reference", uk: "Номер запиту", ja: "リクエスト番号", ar: "رقم الطلب" }),
    questions: t(locale, {
      en: "Reply to this email with any questions.",
      uk: "Відповідайте на цей лист із будь-якими питаннями.",
      ja: "ご不明な点はこのメールにご返信ください。",
      ar: "يمكنك الرد على هذه الرسالة بأي استفسار.",
    }),
  };

  const inner = `
        <!-- Headline -->
        <tr><td align="center" style="padding-bottom:6px">
          <h1 style="margin:0;font-family:${FONT};font-size:27px;line-height:1.25;font-weight:700;color:${INK}">
            ${esc(L.headline)}
          </h1>
        </td></tr>

        <!-- The reference, given the weight an order number gets: this is what
             they quote back on the phone and search their inbox for. -->
        <tr><td align="center" style="padding-bottom:4px">
          <div style="font-family:${FONT};font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:${FAINT}">
            ${esc(L.ref)}
          </div>
        </td></tr>
        <tr><td align="center" style="padding-bottom:28px">
          <div dir="ltr" style="font-family:${FONT};font-size:22px;font-weight:700;letter-spacing:0.05em;color:${INK}">
            ${esc(req.reference)}
          </div>
        </td></tr>

        <!-- The lines -->
        <tr><td style="background:${CARD};border-radius:14px;padding:20px 22px">
          ${linesTable(req, locale)}
        </td></tr>

        <!-- What happens next -->
        <tr><td style="padding-top:14px">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
                 style="background:${CARD};border-radius:14px">
            <tr><td style="padding:20px 22px">
              <p dir="${dir}" style="margin:0;font-family:${FONT};font-size:15px;line-height:1.65;color:${INK}">
                ${esc(L.thanks)}
              </p>
              <p dir="${dir}" style="margin:14px 0 0;font-family:${FONT};font-size:15px;line-height:1.65;color:${INK}">
                ${esc(L.next)}
              </p>
              <p dir="${dir}" style="margin:14px 0 0;font-family:${FONT};font-size:13px;line-height:1.6;color:${MUTED}">
                ${esc(L.questions)}
              </p>
            </td></tr>
          </table>
        </td></tr>`;

  const text = [
    L.thanks,
    "",
    `${L.ref}: ${req.reference}`,
    "",
    ...req.items.map((i) => `${i.qty} × ${i.name}`),
    "",
    L.next,
    L.questions,
    "",
    "TACTICAL HB",
  ].join("\n");

  return { subject: L.subject, html: emailShell({ lang: locale, title: esc(L.subject), inner }), text };
}
