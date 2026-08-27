"use client";

import ProductThumb from "@/components/ProductThumb";
import { t } from "@/lib/i18n-text";
import Link from "next/link";
import { useEffect, useState } from "react";
import { loadOrder, type OrderSnapshot } from "@/lib/checkout";
import { formatMoney, currencyForLocale, scaleMoney } from "@/lib/currency";
import Wordmark from "@/components/Wordmark";

/* ---------------------------------------------------------------------------
   Order confirmation.

   Reads the snapshot written at checkout, so prices and details are exactly
   what was ordered rather than whatever lib/products says today.

   No estimated delivery date — shipping isn't calculated yet, and inventing a
   date is a promise the store can't keep.
--------------------------------------------------------------------------- */

export default function ConfirmationClient({ locale }: { locale: string }) {
  const [order, setOrder] = useState<OrderSnapshot | null>(null);
  const [ready, setReady] = useState(false);

  /* sessionStorage is client-only; read after mount to avoid a hydration gap.
     `ready` is what tells "no order in storage" apart from "not looked yet",
     which matters here — the second one must not render "we couldn't find
     your order" at somebody who has just paid. */
  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       see above: there is no order snapshot during the server render. */
    setOrder(loadOrder());
    setReady(true);
  }, []);

  const L = {
    thanks: t(locale, { uk: "Дякуємо за замовлення в Tactical HB.", en: "Thank you for your Tactical HB order.", ja: "Tactical HB へのご注文、ありがとうございます。", ar: "شكرًا لطلبك من Tactical HB." }),
    great: t(locale, { uk: "Ви зробили чудовий вибір.", en: "You've made a great choice.", ja: "すばらしい選択です。", ar: "لقد اخترت اختيارًا موفّقًا." }),
    // This page now serves the INTERNATIONAL request flow: the order is
    // recorded, nothing is charged yet, and the promise below is the one-total
    // model in a sentence. No "invoice delivery separately" wording — ever.
    emailed: t(locale, {
      uk: "Ми напишемо вам на пошту, щойно підтвердимо суму замовлення.",
      en: "We'll email you as soon as your order total is confirmed.",
      ja: "ご注文の合計金額が確定しだい、メールでお知らせします。", ar: "سنراسلك فور تأكيد إجمالي طلبك." }),
    hello: t(locale, { uk: "Вітаємо,", en: "Hello,", ja: "こんにちは、", ar: "مرحبًا،" }),
    body: t(locale, {
      uk: "Ваше замовлення прийнято. Ми підтвердимо точну суму — товар разом із доставкою до вашого напрямку — електронною поштою, і ви сплатите її одним платежем. Дякуємо, що обрали Tactical HB.",
      en: "Your order has been received. We'll confirm your exact total — goods including delivery to your destination — by email, and you'll pay it in a single payment. Thank you for choosing Tactical HB.",
      ja: "ご注文を承りました。商品代金とお届け先までの配送料を含む正確な合計金額をメールでご確認いただき、一度のお支払いで完了します。Tactical HB をお選びいただきありがとうございます。", ar: "تم استلام طلبك. سنؤكد لك الإجمالي بدقة — البضاعة شاملة الشحن إلى وجهتك — عبر البريد، وتدفعه دفعة واحدة. شكرًا لاختيارك Tactical HB." }),
    sign: "Tactical HB.",
    back: t(locale, { uk: "Повернутися до магазину", en: "Back to store", ja: "ストアに戻る", ar: "العودة إلى المتجر" }),
    summary: t(locale, { uk: "Підсумок замовлення", en: "Order Summary", ja: "ご注文内容", ar: "ملخّص الطلب" }),
    orderNo: t(locale, { uk: "Номер замовлення", en: "Order No", ja: "注文番号", ar: "رقم الطلب" }),
    shipping: t(locale, { uk: "Дані доставки", en: "Shipping details", ja: "お届け先情報", ar: "بيانات الشحن" }),
    total: t(locale, { uk: "Разом", en: "Total", ja: "合計", ar: "الإجمالي" }),
    goodsTotal: t(locale, { uk: "Товари", en: "Goods", ja: "商品", ar: "البضاعة" }),
    goodsTotalNote: t(locale, {
      uk: "Доставку буде включено до підтвердженої суми замовлення.",
      en: "Delivery will be included in your confirmed order total.",
      ja: "配送料は、確定するご注文の合計金額に含まれます。", ar: "سيُضمّ الشحن إلى إجمالي طلبك بعد تأكيده." }),
    discount: t(locale, { uk: "Ваучер", en: "Voucher", ja: "バウチャー", ar: "قسيمة" }),
    qty: t(locale, { uk: "К-сть", en: "Qty", ja: "数量", ar: "الكمية" }),
    none: t(locale, { uk: "Замовлення не знайдено.", en: "No recent order found.", ja: "最近のご注文が見つかりませんでした。", ar: "لم يُعثر على طلب حديث." }),
    noneBody: t(locale, {
      uk: "Це посилання діє лише одразу після оформлення замовлення.",
      en: "This page is only available right after placing an order.",
      ja: "このページは、ご注文の直後のみご覧いただけます。", ar: "هذه الصفحة متاحة فقط بعد تقديم الطلب مباشرة." }),
    shop: t(locale, { uk: "Перейти до товарів", en: "Continue shopping", ja: "買い物を続ける", ar: "متابعة التسوق" }),
    accountMade: t(locale, { uk: "Ваш акаунт створено.", en: "Your account has been created.", ja: "アカウントを作成しました。", ar: "تم إنشاء حسابك." }),
  };

  if (!ready) return <div style={{ minHeight: "60vh" }} />;

  if (!order) {
    return (
      <div className="page-container pt-36 pb-32">
        <h1 className="font-display text-3xl md:text-4xl mb-4" style={{ color: "var(--text)" }}>{L.none}</h1>
        <p className="text-[15px] mb-8" style={{ color: "var(--text-muted)" }}>{L.noneBody}</p>
        <Link
          href={`/${locale}/products`}
          className="inline-flex h-12 px-8 rounded-full items-center justify-center text-[15px] font-medium transition-opacity hover:opacity-85"
          style={{ background: "var(--accent)", color: "#111114" }}
        >
          {L.shop}
        </Link>
      </div>
    );
  }

  const currency = currencyForLocale(locale);
  const d = order.delivery;

  return (
    <div className="grid lg:grid-cols-[1fr_420px] min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Message */}
      <div className="px-6 md:px-12 lg:px-16 pt-28 pb-16 flex flex-col">
        <Link href={`/${locale}`} className="mb-20 self-start">
          <Wordmark className="text-lg" tone="light" />
        </Link>

        <h1 className="font-display text-3xl md:text-5xl leading-[1.15] max-w-[620px]" style={{ color: "var(--text)" }}>
          {L.thanks}
          <br />
          {L.great}
        </h1>

        <p className="text-[15px] mt-8" style={{ color: "var(--text-muted)" }}>{L.emailed}</p>

        {order.accountCreated && (
          <p className="text-[14px] mt-4 inline-flex items-center gap-2" style={{ color: "var(--text)" }}>
            <svg width="15" height="15" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ color: "var(--accent)" }}>
              <path d="M2.5 7.5l3 3 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {L.accountMade}
          </p>
        )}

        <div className="mt-16 max-w-[620px] text-[15px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
          <p className="mb-5" style={{ color: "var(--text)" }}>{L.hello}</p>
          <p className="mb-5">{L.body}</p>
          <p style={{ color: "var(--text)" }}>{L.sign}</p>
        </div>

        <div className="mt-auto pt-16">
          <Link
            href={`/${locale}`}
            className="inline-flex h-12 px-12 items-center justify-center text-[15px] font-medium transition-opacity hover:opacity-85"
            style={{ background: "var(--accent)", color: "#111114" }}
          >
            {L.back}
          </Link>
        </div>
      </div>

      {/* Summary */}
      <aside className="px-6 md:px-12 lg:px-10 pt-28 pb-16" style={{ background: "var(--bg-soft)" }}>
        <h2 className="text-[19px] font-medium mb-12" style={{ color: "var(--text)" }}>{L.summary}</h2>

        <dl className="flex flex-col gap-5 text-[14px] mb-12">
          <div className="grid grid-cols-[130px_1fr] gap-4">
            <dt style={{ color: "var(--text)" }}>{L.orderNo}</dt>
            <dd className="font-mono tracking-wider" style={{ color: "var(--text-muted)" }}>{order.orderNo}</dd>
          </div>
          <div className="grid grid-cols-[130px_1fr] gap-4">
            <dt style={{ color: "var(--text)" }}>{L.shipping}</dt>
            <dd style={{ color: "var(--text-muted)" }}>
              {d.firstName} {d.surname}
              <br />
              {d.address}
              {d.apartment ? <>, {d.apartment}</> : null}
              <br />
              {d.city}, {d.postcode}
              <br />
              {d.country}
            </dd>
          </div>
        </dl>

        {order.discount && order.discount.eur > 0 && (
          <div className="flex items-center justify-between pt-5 text-[14px]" style={{ borderTop: "1px solid var(--border-strong)" }}>
            <span style={{ color: "var(--text-muted)" }}>
              {L.discount}
              {order.voucherCode && <span className="font-mono tracking-wider"> · {order.voucherCode}</span>}
            </span>
            <span style={{ color: "var(--accent-hover)" }}>−{formatMoney(order.discount, currency)}</span>
          </div>
        )}

        <div
          className="flex items-center justify-between py-5 mb-2"
          style={{ borderTop: order.discount && order.discount.eur > 0 ? "none" : "1px solid var(--border-strong)" }}
        >
          <span className="text-[15px]" style={{ color: "var(--text)" }}>{L.goodsTotal}</span>
          <span className="text-[19px] font-medium" style={{ color: "var(--text)" }}>
            {/* Older snapshots have no `total`; fall back to the subtotal. */}
            {formatMoney(order.total ?? order.subtotal, currency)}
          </span>
        </div>
        {/* This figure is goods only — delivery joins it in the confirmed
            total. The label above and this line keep the page from calling
            something a "total" that the very next email will exceed. */}
        <p className="text-[12px] -mt-1 mb-4" style={{ color: "var(--text-faint)" }}>
          {L.goodsTotalNote}
        </p>

        <ul className="flex flex-col">
          {order.lines.map((l, i) => (
            <li key={`${l.slug}-${i}`} className="flex gap-4 py-5" style={{ borderTop: "1px solid var(--border)" }}>
              <div className="relative w-[72px] h-[88px] shrink-0" style={{ background: "var(--bg-card)" }}>
                <ProductThumb src={l.image} name={l.name} sizes="72px" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-medium leading-snug" style={{ color: "var(--text)" }}>{l.name}</div>
                <div className="text-[12.5px] mt-1" style={{ color: "var(--text-muted)" }}>
                  {[l.colour, l.material, l.addons].filter(Boolean).join("  |  ")}
                </div>
                <div className="text-[12.5px] mt-0.5" style={{ color: "var(--text-muted)" }}>{L.qty} {l.qty}</div>
                <div className="text-[14px] mt-2 text-right" style={{ color: "var(--text)" }}>
                  {formatMoney(scaleMoney(l.unitPrice, l.qty), currency)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
