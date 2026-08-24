import "server-only";
import { esc } from "@/lib/email";
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

const INK = "#1A1915";
const MUTED = "#6B6862";
const LINE = "#E7E3DC";
const FONT = "'Helvetica Neue',Helvetica,Arial,sans-serif";

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
  const head = (s: string) =>
    `<th align="left" style="padding:8px 10px;border-bottom:1px solid ${LINE};font:600 12px ${FONT};color:${MUTED};text-transform:uppercase;letter-spacing:.06em">${esc(s)}</th>`;
  const cell = (s: string, align = "left") =>
    `<td align="${align}" style="padding:10px;border-bottom:1px solid ${LINE};font:14px ${FONT};color:${INK}">${esc(s)}</td>`;

  const L = {
    product: t(locale, { en: "Product", uk: "Товар", ja: "製品", ar: "المنتج" }),
    qty: t(locale, { en: "Qty", uk: "К-сть", ja: "数量", ar: "الكمية" }),
    amount: t(locale, { en: "Amount", uk: "Сума", ja: "金額", ar: "المبلغ" }),
  };

  const rows = req.items
    .map((i) => {
      const amount = money(req, i.lineTotalEur, i.lineTotalUah) ?? quoteOnRequest(locale);
      return `<tr>${cell(i.name)}${cell(String(i.qty), "right")}${cell(amount, "right")}</tr>`;
    })
    .join("");

  const total = money(req, req.subtotalEur, req.subtotalUah);
  const totalRow = total
    ? `<tr><td colspan="2" align="right" style="padding:12px 10px;font:600 14px ${FONT};color:${INK}">${esc(
        t(locale, { en: "Total", uk: "Разом", ja: "合計", ar: "الإجمالي" })
      )}</td><td align="right" style="padding:12px 10px;font:600 14px ${FONT};color:${INK}">${esc(total)}</td></tr>`
    : `<tr><td colspan="3" style="padding:12px 10px;font:14px ${FONT};color:${MUTED}">${esc(
        t(locale, {
          en: "We will quote this request by email.",
          uk: "Ми надішлемо прорахунок цього запиту листом.",
          ja: "このリクエストのお見積りをメールでお送りします。",
          ar: "سنرسل لك عرض سعر لهذا الطلب عبر البريد الإلكتروني.",
        })
      )}</td></tr>`;

  return `<table cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin:0 0 20px">
    <tr>${head(L.product)}${head(L.qty)}${head(L.amount)}</tr>${rows}${totalRow}</table>`;
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
    ${table}
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

  const L = {
    subject: t(locale, {
      en: `We've received your request ${req.reference}`,
      uk: `Ми отримали ваш запит ${req.reference}`,
      ja: `リクエスト ${req.reference} を受け付けました`,
      ar: `استلمنا طلبك ${req.reference}`,
    }),
    heading: t(locale, {
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

  const dir = locale === "ar" ? "rtl" : "ltr";

  const html = `<div dir="${dir}" style="font:15px/1.6 ${FONT};color:${INK}">
    <p style="margin:0 0 16px;font-size:17px">${esc(L.heading)}</p>
    <p style="margin:0 0 6px;font:13px ${FONT};color:${MUTED}">${esc(L.ref)}</p>
    <p style="margin:0 0 20px;font:600 18px ${FONT};letter-spacing:.04em">${esc(req.reference)}</p>
    ${linesTable(req, locale)}
    <p style="margin:0 0 16px">${esc(L.next)}</p>
    <p style="margin:0;font:13px ${FONT};color:${MUTED}">${esc(L.questions)}</p>
  </div>`;

  const text = [
    L.heading,
    "",
    `${L.ref}: ${req.reference}`,
    "",
    ...req.items.map((i) => `${i.qty} × ${i.name}`),
    "",
    L.next,
    L.questions,
  ].join("\n");

  return { subject: L.subject, html, text };
}
