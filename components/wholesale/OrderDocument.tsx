import { requestLineText, REQUEST_STATUS_TEXT, type WholesaleRequest } from "@/lib/wholesale-display";
import type { PortalPartner } from "@/lib/wholesale-display";
import { formatMoney, money } from "@/lib/currency";
import { t } from "@/lib/i18n-text";
import { PHONE, SALES_EMAIL } from "@/lib/contact-info";
import Wordmark from "@/components/Wordmark";

/* ---------------------------------------------------------------------------
   The order confirmation document itself — laid out for A4 and for print.
   Rendered by app/[locale]/wholesale-document/[reference]; see that page for
   who may see it and why it prints to PDF rather than being one.
--------------------------------------------------------------------------- */

export function documentLabels(locale: string) {
  return {
    save: t(locale, { uk: "Зберегти як PDF", en: "Save as PDF", ja: "PDF として保存", ar: "حفظ بصيغة PDF" }),
    back: t(locale, { uk: "Назад до порталу", en: "Back to the portal", ja: "ポータルに戻る", ar: "العودة إلى البوابة" }),
  };
}

export default function OrderDocument({
  r,
  partner,
  locale,
  toolbar,
}: {
  r: WholesaleRequest;
  partner: Pick<PortalPartner, "company" | "contactName" | "email" | "phone" | "currency">;
  locale: string;
  toolbar?: React.ReactNode;
}) {
  /* The currency the request was quoted in — a snapshot on the request — and
     the partner's own for any older row that predates the snapshot. */
  const cur = r.currency ?? partner.currency;
  const fmtMoney = (eur: number | null, uah: number | null) =>
    eur === null || uah === null ? "—" : formatMoney(money(eur, uah), cur);
  const date = new Date(r.createdAt).toLocaleDateString(
    t(locale, { uk: "uk-UA", en: "en-GB", ja: "ja-JP", ar: "ar-u-nu-latn" }),
    { day: "numeric", month: "long", year: "numeric" }
  );

  const L = {
    title: t(locale, { uk: "Підтвердження замовлення", en: "Order confirmation", ja: "ご注文確認書", ar: "تأكيد الطلب" }),
    ref: t(locale, { uk: "Номер", en: "Reference", ja: "番号", ar: "المرجع" }),
    dated: t(locale, { uk: "Дата", en: "Date", ja: "日付", ar: "التاريخ" }),
    status: t(locale, { uk: "Статус", en: "Status", ja: "ステータス", ar: "الحالة" }),
    from: t(locale, { uk: "Продавець", en: "From", ja: "販売者", ar: "من" }),
    to: t(locale, { uk: "Покупець", en: "Bill to", ja: "購入者", ar: "إلى" }),
    product: t(locale, { uk: "Товар", en: "Product", ja: "製品", ar: "المنتج" }),
    qty: t(locale, { uk: "К-сть", en: "Qty", ja: "数量", ar: "الكمية" }),
    unit: t(locale, { uk: "Ціна", en: "Unit", ja: "単価", ar: "سعر الوحدة" }),
    total: t(locale, { uk: "Сума", en: "Amount", ja: "金額", ar: "المبلغ" }),
    grand: t(locale, { uk: "Разом", en: "Total", ja: "合計", ar: "الإجمالي" }),
    note: t(locale, { uk: "Примітка", en: "Note", ja: "備考", ar: "ملاحظة" }),
    terms: t(locale, {
      uk: "Доставка не продається як окрема послуга: після підтвердження вартість перевезення розподіляється в цінах за одиницю — одна сума.",
      en: "Delivery is not sold as a separate service: once confirmed, carriage is apportioned across the unit prices — one total.",
      ja: "配送は別個のサービスとしては販売しておりません。確定後、輸送費は各単価へ配分され、合計はひとつです。",
      ar: "لا يُباع الشحن كخدمة منفصلة: بعد التأكيد تُوزَّع تكلفة النقل على أسعار الوحدات — إجمالي واحد.",
    }),
    notInvoice: t(locale, {
      uk: "Цей документ підтверджує замовлення і не є податковою накладною.",
      en: "This document confirms the order and is not a tax invoice.",
      ja: "本書はご注文の確認書であり、税務上の請求書ではありません。",
      ar: "تؤكّد هذه الوثيقة الطلب وليست فاتورة ضريبية.",
    }),
  };

  return (
    <div className="min-h-screen bg-white print:bg-white">
      <div className="mx-auto max-w-[800px] px-6 py-10 print:p-0 print:max-w-none" style={{ color: "#111" }}>
        {toolbar}

        <article className="text-[13px] leading-relaxed">
          <header className="flex items-start justify-between gap-6 pb-6" style={{ borderBottom: "2px solid #F48140" }}>
            <div>
              <div className="text-[22px]"><Wordmark tone="light" /></div>
              <p className="mt-1 text-[11px] tracking-[0.2em] uppercase" style={{ color: "#8a8a8e" }}>Wholesale</p>
            </div>
            <div className="text-end">
              <h1 className="text-[20px] font-semibold">{L.title}</h1>
              <dl className="mt-2 grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 justify-end text-[12.5px]">
                <dt style={{ color: "#707072" }}>{L.ref}</dt>
                <dd dir="ltr" className="font-mono">{r.reference}</dd>
                <dt style={{ color: "#707072" }}>{L.dated}</dt>
                <dd>{date}</dd>
                <dt style={{ color: "#707072" }}>{L.status}</dt>
                <dd>{t(locale, REQUEST_STATUS_TEXT[r.status])}</dd>
              </dl>
            </div>
          </header>

          <section className="grid grid-cols-2 gap-8 py-6">
            <div>
              <p className="text-[11px] tracking-[0.18em] uppercase mb-1.5" style={{ color: "#8a8a8e" }}>{L.from}</p>
              <p className="font-medium">Tactical HB</p>
              <p dir="ltr">{SALES_EMAIL}</p>
              <p dir="ltr">{PHONE}</p>
              <p dir="ltr">tactical-hb.com</p>
            </div>
            <div>
              <p className="text-[11px] tracking-[0.18em] uppercase mb-1.5" style={{ color: "#8a8a8e" }}>{L.to}</p>
              <p className="font-medium">{r.company || partner.company}</p>
              {partner.contactName && <p>{partner.contactName}</p>}
              {(r.email || partner.email) && <p dir="ltr">{r.email || partner.email}</p>}
              {(r.phone || partner.phone) && <p dir="ltr">{r.phone || partner.phone}</p>}
            </div>
          </section>

          <table className="w-full border-collapse">
            <thead>
              <tr className="text-[11px] tracking-[0.12em] uppercase" style={{ color: "#8a8a8e", borderBottom: "1px solid #d9d9dc" }}>
                <th className="text-start font-normal py-2">{L.product}</th>
                <th className="text-end font-normal py-2 px-3">{L.qty}</th>
                <th className="text-end font-normal py-2 px-3">{L.unit}</th>
                <th className="text-end font-normal py-2">{L.total}</th>
              </tr>
            </thead>
            <tbody>
              {r.items.map((it, i) => {
                const txt = requestLineText(it, locale);
                return (
                  <tr key={i} style={{ borderBottom: "1px solid #ececee" }}>
                    <td className="py-2.5 pe-3">
                      <span className="font-medium">{txt.name}</span>
                      {txt.detail && <span style={{ color: "#707072" }}> · {txt.detail}</span>}
                    </td>
                    <td className="py-2.5 px-3 text-end tabular-nums">{it.qty}</td>
                    <td className="py-2.5 px-3 text-end tabular-nums whitespace-nowrap">{fmtMoney(it.unitPriceEur, it.unitPriceUah)}</td>
                    <td className="py-2.5 text-end tabular-nums whitespace-nowrap">{fmtMoney(it.lineTotalEur, it.lineTotalUah)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="pt-4 text-end text-[14px] font-medium">{L.grand}</td>
                <td className="pt-4 text-end text-[16px] font-semibold tabular-nums whitespace-nowrap">{fmtMoney(r.subtotalEur, r.subtotalUah)}</td>
              </tr>
            </tfoot>
          </table>

          {r.note && (
            <section className="mt-8">
              <p className="text-[11px] tracking-[0.18em] uppercase mb-1" style={{ color: "#8a8a8e" }}>{L.note}</p>
              <p className="whitespace-pre-line">{r.note}</p>
            </section>
          )}

          <footer className="mt-10 pt-4 text-[11.5px] flex flex-col gap-1" style={{ borderTop: "1px solid #ececee", color: "#707072" }}>
            <p>{L.terms}</p>
            <p>{L.notInvoice}</p>
          </footer>
        </article>
      </div>
    </div>
  );
}
