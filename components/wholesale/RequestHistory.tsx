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
            </li>
          );
        })}
      </ul>
    </section>
  );
}
