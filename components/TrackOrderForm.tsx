"use client";

import { useState } from "react";
import Image from "next/image";
import { trackOrder, type TrackedOrderView } from "@/app/actions/track-order";
import OrderTimeline from "@/components/account/OrderTimeline";
import { useAuth } from "@/components/AuthContext";
import { t } from "@/lib/i18n-text";

/* The guest "Track my order" form and its result. See app/actions/track-order
   for what is looked up and why both keys are required. */

export default function TrackOrderForm({ locale }: { locale: string }) {
  const { user } = useAuth();
  const [ref, setRef] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<"not_found" | "invalid" | null>(null);
  const [order, setOrder] = useState<TrackedOrderView | null>(null);
  const emailValue = email || user?.email || "";

  const L = {
    ref: t(locale, { uk: "Номер замовлення", en: "Order number", ja: "ご注文番号", ar: "رقم الطلب" }),
    refHint: t(locale, { uk: "Наприклад, TCT-AB12CD — він є в листі з підтвердженням.", en: "For example TCT-AB12CD — it's in your confirmation email.", ja: "例：TCT-AB12CD（確認メールに記載されています）", ar: "مثل TCT-AB12CD — تجده في رسالة التأكيد." }),
    email: t(locale, { uk: "Електронна пошта замовлення", en: "Email used for the order", ja: "ご注文時のメールアドレス", ar: "البريد الإلكتروني المستخدم في الطلب" }),
    find: t(locale, { uk: "Знайти замовлення", en: "Find my order", ja: "注文を確認", ar: "ابحث عن طلبي" }),
    notFound: t(locale, { uk: "Не знайшли замовлення з таким номером і поштою. Перевірте обидва поля.", en: "We couldn't find an order with that number and email. Please check both.", ja: "この番号とメールアドレスのご注文が見つかりませんでした。両方をご確認ください。", ar: "لم نجد طلبًا بهذا الرقم والبريد. يرجى التحقق من كليهما." }),
    invalid: t(locale, { uk: "Введіть номер замовлення (TCT-…) і пошту.", en: "Enter the order number (TCT-…) and your email.", ja: "ご注文番号（TCT-…）とメールアドレスを入力してください。", ar: "أدخل رقم الطلب (TCT-…) وبريدك الإلكتروني." }),
    order: t(locale, { uk: "Замовлення", en: "Order", ja: "ご注文", ar: "الطلب" }),
    placed: t(locale, { uk: "Оформлено", en: "Placed", ja: "注文日", ar: "تاريخ الطلب" }),
    tracking: t(locale, { uk: "Номер для відстеження", en: "Tracking number", ja: "追跡番号", ar: "رقم التتبع" }),
    track: t(locale, { uk: "Відстежити посилку", en: "Track shipment", ja: "配送状況を確認", ar: "تتبّع الشحنة" }),
    noTracking: t(locale, { uk: "Номер для відстеження з'явиться тут, щойно посилку буде передано перевізнику.", en: "The tracking number appears here as soon as the parcel is handed to the carrier.", ja: "荷物が配送業者に引き渡されると、ここに追跡番号が表示されます。", ar: "سيظهر رقم التتبع هنا فور تسليم الطرد لشركة الشحن." }),
    cancelled: t(locale, { uk: "Це замовлення скасовано. Якщо це помилка — відповідайте на лист із підтвердженням.", en: "This order was cancelled. If that looks wrong, reply to your confirmation email.", ja: "このご注文はキャンセルされました。お心当たりがない場合は、確認メールにご返信ください。", ar: "أُلغي هذا الطلب. إن بدا ذلك غير صحيح، فردّ على رسالة التأكيد." }),
    items: t(locale, { uk: "Позиції", en: "Items", ja: "商品", ar: "الأصناف" }),
    qty: t(locale, { uk: "К-сть", en: "Qty", ja: "数量", ar: "الكمية" }),
    delivery: t(locale, { uk: "Доставка", en: "Delivery", ja: "配送", ar: "الشحن" }),
    another: t(locale, { uk: "Перевірити інше замовлення", en: "Check another order", ja: "別の注文を確認", ar: "تحقّق من طلب آخر" }),
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await trackOrder(ref, emailValue, locale);
    setBusy(false);
    if (res.ok) setOrder(res.order);
    else setError(res.error);
  };

  if (order) {
    return (
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 mb-1">
          <h2 className="text-2xl font-semibold" style={{ color: "#111" }}>
            {L.order} <span dir="ltr">{order.reference}</span>
          </h2>
          <div className="text-lg font-semibold tabular-nums" style={{ color: "#111" }}>{order.total}</div>
        </div>
        <p className="text-[13px] mb-8" style={{ color: "var(--text-muted)" }}>
          {L.placed} {order.placed}
          {order.totalSub ? <span className="ms-2">· {order.totalSub}</span> : null}
        </p>

        <div className="rounded-2xl border px-6 py-7" style={{ borderColor: "var(--border)" }}>
          {order.steps ? (
            <OrderTimeline steps={order.steps} />
          ) : (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>{order.cancelled ? L.cancelled : order.status}</p>
          )}
          <div className="mt-7 pt-6" style={{ borderTop: "1px solid var(--border)" }}>
            {order.tracking ? (
              <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
                <div>
                  <div className="text-[10px] tracking-[0.2em] uppercase mb-1" style={{ color: "var(--text-faint)" }}>
                    {L.tracking} · {order.tracking.carrier}
                  </div>
                  <div dir="ltr" className="text-[15px] font-medium tabular-nums tracking-wide" style={{ color: "#111" }}>
                    {order.tracking.number}
                  </div>
                </div>
                <a
                  href={order.tracking.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block h-10 leading-[40px] px-6 rounded-full text-[13px] font-medium transition-opacity hover:opacity-85"
                  style={{ background: "#111", color: "#fff" }}
                >
                  {L.track}
                </a>
              </div>
            ) : (
              !order.cancelled && <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>{L.noTracking}</p>
            )}
          </div>
        </div>

        <h3 className="text-lg font-semibold mt-10 mb-4" style={{ color: "#111" }}>{L.items}</h3>
        <ul className="flex flex-col">
          {order.items.map((it, i) => (
            <li key={it.key} className="flex items-center gap-5 py-4" style={{ borderTop: i > 0 ? "1px solid var(--border)" : "none" }}>
              <div className="relative w-14 h-14 shrink-0 rounded-lg overflow-hidden" style={{ background: "#f5f5f5" }}>
                {it.image && <Image src={it.image} alt={it.name} fill sizes="56px" className="object-contain p-1.5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-medium leading-snug" style={{ color: "#111" }}>{it.name}</div>
                {it.detail && <div className="text-[13px] mt-0.5" style={{ color: "var(--text-muted)" }}>{it.detail}</div>}
                <div className="text-[13px] mt-0.5" style={{ color: "var(--text-muted)" }}>{L.qty} {it.qty}</div>
              </div>
            </li>
          ))}
        </ul>

        {order.destination && (
          <>
            <h3 className="text-lg font-semibold mt-10 mb-3" style={{ color: "#111" }}>{L.delivery}</h3>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>{order.destination}</p>
          </>
        )}

        <button
          type="button"
          onClick={() => { setOrder(null); setRef(""); }}
          className="mt-10 text-[13px] underline underline-offset-4"
          style={{ color: "var(--text-muted)" }}
        >
          {L.another}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="max-w-md flex flex-col gap-5" noValidate>
      <div>
        <label htmlFor="track-ref" className="block text-xs tracking-[0.2em] uppercase mb-2" style={{ color: "var(--text-faint)" }}>{L.ref}</label>
        <input id="track-ref" className="field font-mono uppercase" dir="ltr" autoComplete="off" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="TCT-AB12CD" />
        <p className="text-[12px] mt-1.5" style={{ color: "var(--text-faint)" }}>{L.refHint}</p>
      </div>
      <div>
        <label htmlFor="track-email" className="block text-xs tracking-[0.2em] uppercase mb-2" style={{ color: "var(--text-faint)" }}>{L.email}</label>
        <input id="track-email" className="field" type="email" inputMode="email" autoComplete="email" dir="ltr" value={emailValue} onChange={(e) => setEmail(e.target.value)} />
      </div>
      {error && (
        <p className="text-[13px] px-4 py-3 rounded-lg" role="alert" style={{ background: "#fdecec", color: "#b42318" }}>
          {error === "not_found" ? L.notFound : L.invalid}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="h-12 rounded-full text-[15px] font-medium transition-opacity hover:opacity-85 disabled:opacity-50"
        style={{ background: "var(--accent)", color: "#111114" }}
      >
        {busy ? "…" : L.find}
      </button>
    </form>
  );
}
