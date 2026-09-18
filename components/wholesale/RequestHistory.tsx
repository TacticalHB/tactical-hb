import { t } from "@/lib/i18n-text";
import { currencyForLocale, formatMoney, money } from "@/lib/currency";
import { REQUEST_STATUS_TEXT, type WholesaleRequest } from "@/lib/wholesale-display";

/* ---------------------------------------------------------------------------
   A partner's own past requests.

   Server component: the rows are fetched by the page, scoped to the caller's
   partner id, and rendered straight out. There is no client fetch to point at
   another partner's id, because there is no client fetch.

   The status is the same ladder staff move in admin, shown in the partner's
   own language — so "payment details sent" appears here at the moment it
   becomes true, and a partner chasing an email can see where things stand
   without asking.

   EVERY LINE IS LISTED, not just the totals. "64 units, 4 lines" tells a
   partner nothing they can act on three weeks later; what they came back for
   is WHICH products and how many, so they can order the same again or say how
   it should differ. And the lines they are shown are the lines as they now
   stand — an order adjusted by staff after the conversation reads here as
   what was agreed, which is the whole point of letting staff adjust it.

   REPEATING IS A LINK, NOT A FORM. It carries the reference in the query
   string; the page resolves it against THIS partner\'s own history and
   prefills the quantities. Nothing about the basket travels in the URL, so
   there is nothing in it to tamper with — a reference belonging to somebody
   else simply is not in the list the page searches.
--------------------------------------------------------------------------- */

export default function RequestHistory({
  locale,
  requests,
}: {
  locale: string;
  requests: WholesaleRequest[];
}) {
  const currency = currencyForLocale(locale);

  const L = {
    title: t(locale, { en: "Your requests", uk: "Ваші запити", ja: "これまでのリクエスト", ar: "طلباتك" }),
    ref: t(locale, { en: "Reference", uk: "Номер", ja: "番号", ar: "الرقم" }),
    units: t(locale, { en: "units", uk: "одиниць", ja: "点", ar: "وحدة" }),
    quote: t(locale, { en: "To be quoted", uk: "Буде прораховано", ja: "お見積り予定", ar: "بانتظار التسعير" }),
    again: t(locale, {
      en: "Order this again",
      uk: "Замовити знову",
      ja: "同じ内容で注文する",
      ar: "اطلب هذا مرة أخرى",
    }),
    againNote: t(locale, {
      en: "Fills the form above with these quantities — change anything before sending.",
      uk: "Підставить ці кількості у форму вище — перед надсиланням усе можна змінити.",
      ja: "上のフォームにこの数量を入力します。送信前に変更いただけます。",
      ar: "يملأ النموذج أعلاه بهذه الكميات — يمكنك تعديل أي شيء قبل الإرسال.",
    }),
  };

  // Arabic month names, Latin digits — the storefront's rule for every date.
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(
      t(locale, { uk: "uk-UA", en: "en-GB", ja: "ja-JP", ar: "ar-u-nu-latn" }),
      { day: "numeric", month: "short", year: "numeric" }
    );

  return (
    <section className="mt-16 pt-10" style={{ borderTop: "1px solid var(--border)" }}>
      <h2 className="text-xs tracking-[0.25em] uppercase mb-6" style={{ color: "var(--text-faint)" }}>
        {L.title}
      </h2>
      <ul className="flex flex-col">
        {requests.map((r, i) => {
          const total =
            r.subtotalEur !== null && r.subtotalUah !== null
              ? formatMoney(money(r.subtotalEur, r.subtotalUah), currency)
              : null;
          return (
            <li
              key={r.id}
              className="flex flex-wrap items-baseline gap-x-5 gap-y-1 py-4"
              style={{ borderTop: i > 0 ? "1px solid var(--border)" : "none" }}
            >
              <span dir="ltr" className="text-[15px] font-medium tracking-[0.04em]" style={{ color: "var(--text)" }}>
                {r.reference}
              </span>
              <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>
                {fmt(r.createdAt)}
              </span>
              <span className="text-[13px] tabular-nums" style={{ color: "var(--text-muted)" }}>
                {r.itemCount} {L.units}
              </span>
              <span className="text-[13px] tabular-nums ms-auto" style={{ color: "var(--text-muted)" }}>
                {total ?? L.quote}
              </span>
              <span
                className="text-[12px] px-2.5 py-1 rounded-full"
                style={{ background: "var(--bg-soft)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
              >
                {t(locale, REQUEST_STATUS_TEXT[r.status])}
              </span>

              {/* The lines themselves. Full width under the summary row, so
                  the row above stays scannable and the detail is there when
                  the question is "what was in it". */}
              {r.items.length > 0 && (
                <ul className="w-full mt-2 flex flex-col gap-1">
                  {r.items.map((it, j) => (
                    <li
                      key={`${r.id}-${j}`}
                      className="flex flex-wrap items-baseline gap-x-3 text-[13px]"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <span className="tabular-nums" style={{ color: "var(--text)" }}>{it.qty} ×</span>
                      <span style={{ color: "var(--text)" }}>{it.name}</span>
                      {it.variant && <span>{it.variant}</span>}
                      {it.optionsLabel && <span>· {it.optionsLabel}</span>}
                      <span className="ms-auto tabular-nums">
                        {it.lineTotalEur !== null && it.lineTotalUah !== null
                          ? formatMoney(money(it.lineTotalEur, it.lineTotalUah), currency)
                          : L.quote}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="w-full mt-3 flex flex-wrap items-center gap-3">
                <a
                  href={`?repeat=${encodeURIComponent(r.reference)}`}
                  className="inline-flex h-9 px-4 items-center rounded-full text-[13px] font-medium transition-opacity hover:opacity-85"
                  style={{ background: "var(--accent)", color: "#111114" }}
                >
                  {L.again}
                </a>
                <span className="text-[12px]" style={{ color: "var(--text-faint)" }}>
                  {L.againNote}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
