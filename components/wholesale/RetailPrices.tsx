"use client";

import { t } from "@/lib/i18n-text";
import { colourName } from "@/lib/colour-names";
import { formatMoney, type Currency } from "@/lib/currency";
import type { RetailRow } from "@/lib/retail-reference";

/* ---------------------------------------------------------------------------
   Retail prices, for a wholesale partner to refer to (Mario, 14 Oct 2026):
   the "Retail prices" tab of the portal's right-hand card.

   IN THE PARTNER'S CURRENCY, like everything else in the portal: a hryvnia
   partner reads the Ukrainian storefront's prices, a euro partner the euro
   ones, whatever language the page is in.
--------------------------------------------------------------------------- */

export function retailLabels(locale: string) {
  return {
    title: t(locale, { en: "Retail prices", uk: "Роздрібні ціни", ja: "小売価格", ar: "أسعار التجزئة" }),
    sub: t(locale, {
      en: "What customers pay on tactical-hb.com — for your reference.",
      uk: "Скільки платять покупці на tactical-hb.com — для орієнтиру.",
      ja: "tactical-hb.com でのお客様の購入価格です。ご参考まで。",
      ar: "ما يدفعه العملاء على tactical-hb.com — للاسترشاد.",
    }),
    timer: t(locale, { en: "Timer — added to a wind cover", uk: "Таймер — до ковпака", ja: "タイマー（ウインドカバーに追加）", ar: "المؤقّت — يُضاف إلى غطاء الرياح" }),
    /* Short enough for one line at phone width — the tab already says "retail". */
    pdf: t(locale, { en: "Download as PDF", uk: "Завантажити PDF", ja: "PDF をダウンロード", ar: "تنزيل PDF" }),
  };
}

export default function RetailPrices({
  rows,
  currency,
  locale,
  pdfHref,
}: {
  rows: RetailRow[];
  currency: Currency;
  locale: string;
  pdfHref: string;
}) {
  const L = retailLabels(locale);
  return (
    <>
      <table className="w-full text-[13px] tabular-nums">
        <caption className="sr-only">{L.title}</caption>
        <tbody>
          {rows.map((r, i) => {
            /* A hairline between product types, so bowls, heat devices and
               wind covers read as groups without a heading each. */
            const newGroup = i > 0 && rows[i - 1].category !== r.category;
            const pad = newGroup ? "pt-2.5" : "pt-1.5";
            return (
              <tr key={r.key} style={{ borderTop: newGroup ? "1px solid var(--border)" : "none" }}>
                <th scope="row" className={`text-start font-normal leading-snug pe-3 pb-1 ${pad}`} style={{ color: "var(--text)" }}>
                  {r.addon === "timer" ? (
                    <span style={{ color: "var(--text-muted)" }}>{L.timer}</span>
                  ) : (
                    <>
                      {r.name}
                      {r.colour && <span style={{ color: "var(--text-faint)" }}> · {colourName(r.colour, locale)}</span>}
                    </>
                  )}
                </th>
                <td dir="ltr" className={`text-end whitespace-nowrap ps-2 pb-1 font-medium ${pad}`} style={{ color: "var(--text)" }}>
                  {r.addon === "timer" ? "+" : ""}
                  {formatMoney(r.price, currency)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <a
        href={pdfHref}
        className="mt-5 w-full min-h-11 py-2 px-4 rounded-full inline-flex items-center justify-center gap-2 text-[13.5px] font-medium text-center transition-colors hover:bg-[var(--bg-card)]"
        style={{ border: "1px solid var(--border-strong)", color: "var(--text)" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className="shrink-0">
          <path d="M12 3v12m0 0l-5-5m5 5l5-5M5 21h14" />
        </svg>
        {L.pdf}
      </a>
    </>
  );
}
