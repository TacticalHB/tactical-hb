"use client";

import { useState } from "react";
import { t, type Text } from "@/lib/i18n-text";
import Modal from "@/components/Modal";

/* ---------------------------------------------------------------------------
   Secured Payment / Delivery / Returns & Exchanges — expandable rows under the
   cart summary, each opening a modal.

   The wording deliberately mirrors the About page. A customer who compares the
   two must not find different terms, and Monobank reviewed the About copy.
--------------------------------------------------------------------------- */

type SectionId = "payment" | "delivery" | "returns";

function CardIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <rect x="2.5" y="6" width="19" height="13" rx="2" />
      <path d="M2.5 10.5h19" />
    </svg>
  );
}
function TruckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <path d="M2.5 7.5h11v9h-11z" />
      <path d="M13.5 11h4l3 3v2.5h-7z" />
      <circle cx="7" cy="17.5" r="1.8" />
      <circle cx="17" cy="17.5" r="1.8" />
    </svg>
  );
}
function BoxIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <path d="M3.5 7.5L12 4l8.5 3.5v9L12 20l-8.5-3.5z" />
      <path d="M3.5 7.5L12 11l8.5-3.5M12 11v9" />
    </svg>
  );
}

type Block =
  | { p: Text; lead?: Text; muted?: true; wide?: true }
  | { list: Text[] };

/* The three modal bodies as data rather than four parallel JSX trees.

   They used to be `uk ? (…) : (…)`, which is why a Japanese customer was
   reading these three panels in English: adding a storefront meant adding a
   branch to every one of them, and nobody did. As data, a new language is a
   new key on a string, and a missing one falls back to English on its own.

   {mail} in a paragraph becomes the mailto link — the anchor is markup, so it
   cannot sit in a string, and every language needs it in a different place. */
const MAIL = "admin@tactical-hb.com";

function Para({ text }: { text: string }) {
  const [before, after] = text.split("{mail}");
  if (after === undefined) return <>{text}</>;
  return (
    <>
      {before}
      <a href={`mailto:${MAIL}`} className="underline underline-offset-2" style={{ color: "var(--text)" }}>
        {MAIL}
      </a>
      {after}
    </>
  );
}

function Body({ blocks, locale }: { blocks: Block[]; locale: string }) {
  return (
    <>
      {blocks.map((b, i) => {
        const last = i === blocks.length - 1;
        if ("list" in b) {
          return (
            <ul key={i} className="flex flex-col gap-2.5 mb-5 list-disc pl-5">
              {b.list.map((x, j) => (
                <li key={j}>{t(locale, x)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p
            key={i}
            className={last ? "" : b.wide ? "mb-5" : "mb-4"}
            style={b.muted ? { color: "var(--text-faint)" } : undefined}
          >
            {b.lead && (
              <>
                <strong style={{ color: "var(--text)" }}>{t(locale, b.lead)}</strong>{" "}
              </>
            )}
            <Para text={t(locale, b.p)} />
          </p>
        );
      })}
    </>
  );
}

const PAYMENT: Block[] = [
  {
    p: {
      uk: "Ми приймаємо оплату карткою — Visa та Mastercard — через Plata by Mono (Monobank). Іноземні картки приймаються там, де це доступно.",
      en: "We accept card payments — Visa and Mastercard — through Plata by Mono (Monobank). International cards are accepted where available.",
      ja: "お支払いは Plata by Mono (Monobank) を通じたカード決済 — Visa と Mastercard — に対応しています。海外発行のカードもご利用いただける場合があります。",
      ar: "نقبل الدفع بالبطاقة — Visa وMastercard — عبر Plata by Mono (Monobank). وتُقبل البطاقات الأجنبية حيثما كان ذلك متاحًا.",
    },
  },
  {
    p: {
      uk: "Кожен платіж обробляє сертифікований платіжний шлюз — дані вашої картки передаються в зашифрованому вигляді й ніколи не зберігаються на наших серверах.",
      en: "Every transaction is handled by a certified payment gateway — your card details travel encrypted and are never stored on our servers.",
      ja: "すべての決済は認定された決済ゲートウェイが処理します。カード情報は暗号化されて送信され、当社のサーバーに保存されることはありません。",
      ar: "تُعالَج كل عملية دفع عبر بوابة دفع معتمَدة — تُنقل بيانات بطاقتك مشفَّرة ولا تُخزَّن على خوادمنا إطلاقًا.",
    },
  },
  {
    p: {
      uk: "Оплата займає кілька дотиків і не потребує реєстрації. Щойно платіж пройде, ви отримаєте підтвердження на пошту, а ми почнемо готувати замовлення того ж робочого дня.",
      en: "Checkout takes a few taps and needs no account. You’ll receive confirmation by email the moment your payment succeeds, and we begin preparing your order the same working day.",
      ja: "お会計は数タップで終わり、アカウントは必要ありません。決済が完了した時点で確認メールをお送りし、同じ営業日中にご注文の準備を始めます。",
      ar: "لا يستغرق إتمام الطلب سوى بضع نقرات ولا يحتاج إلى حساب. وستصلك رسالة تأكيد فور نجاح الدفع، ونبدأ تجهيز طلبك في يوم العمل نفسه.",
    },
  },
  {
    muted: true,
    p: {
      uk: "Ціни вказано у гривні (₴) для замовлень в Україні та в євро (€) для інших країн.",
      en: "Prices are shown in hryvnia (₴) for orders within Ukraine and in euro (€) elsewhere.",
      ja: "価格はウクライナ国内のご注文はフリヴニャ (₴)、それ以外の国は ユーロ (€) で表示しています。",
      ar: "تُعرض الأسعار بالهريفنيا (₴) للطلبات داخل أوكرانيا وباليورو (€) لبقية الدول.",
    },
  },
];

const DELIVERY: Block[] = [
  {
    p: {
      uk: "У межах України ми відправляємо Новою Поштою та Укрпоштою — у відділення, поштомат або кур’єром за вашою адресою.",
      en: "Within Ukraine we ship with Nova Poshta and Ukrposhta — to a branch, a parcel locker, or by courier to your door.",
      ja: "ウクライナ国内は Nova Poshta と Ukrposhta で発送します — 営業所受け取り、宅配ロッカー、ご自宅への配達からお選びいただけます。",
      ar: "داخل أوكرانيا نشحن عبر Nova Poshta وUkrposhta — إلى الفرع أو صندوق الطرود أو إلى بابك مع المندوب.",
    },
  },
  /* NO SEPARATE DELIVERY INVOICE. This used to promise «окремий лист із
     запитом на оплату доставки» — a second payment for shipping — which is
     precisely what the FOP-2 model forbids. See docs/fiscal-payment-wording.md §1. */
  {
    lead: {
      uk: "Доставка в межах України.",
      en: "Delivery within Ukraine.",
      ja: "ウクライナ国内の配送。",
      ar: "التوصيل داخل أوكرانيا.",
    },
    p: {
      uk: "Вартість доставки розраховується під час оформлення та сплачується на сайті разом із замовленням — оплатити її при отриманні неможливо.",
      en: "The delivery cost is calculated at checkout and paid on the website together with your order — it cannot be paid on collection.",
      ja: "配送料はお会計時に計算し、ご注文と合わせてサイト上でお支払いいただきます — 受け取り時のお支払いはできません。",
      ar: "تُحتسب تكلفة التوصيل عند الدفع وتُسدَّد على الموقع مع طلبك — ولا يمكن دفعها عند الاستلام.",
    },
  },
  {
    lead: {
      uk: "Міжнародна доставка.",
      en: "International delivery.",
      ja: "海外への配送。",
      ar: "الشحن الدولي.",
    },
    p: {
      uk: "Вартість доставки до вашої країни розраховується під час оформлення і входить до загальної суми замовлення — ви сплачуєте одну суму на сайті. Якщо напрямок неможливо прорахувати автоматично, ми спершу підтвердимо повну суму листом; платіж усе одно буде один.",
      en: "Delivery to your country is calculated at checkout and included in the order total — you pay one amount, on the site. If a destination can’t be quoted automatically, we’ll confirm the full total by email first; it is still a single payment.",
      ja: "お住まいの国への配送料はお会計時に計算し、ご注文合計に含めます — サイト上で一度だけお支払いいただきます。自動で見積もれない地域の場合は、先にメールで合計金額をご確認いただきますが、お支払いはやはり一度きりです。",
      ar: "يُحتسب الشحن إلى بلدك عند الدفع ويُضمَّن في إجمالي الطلب — فتدفع مبلغًا واحدًا على الموقع. وإن تعذّر تسعير الوجهة تلقائيًا، نؤكّد لك الإجمالي كاملًا بالبريد الإلكتروني أولًا؛ وتبقى الدفعة واحدة.",
    },
  },
  {
    muted: true,
    p: {
      uk: "Посилку передаємо перевізникові протягом 1–2 робочих днів після підтвердження оплати, а номер накладної надійде на вашу пошту одразу після відправлення.",
      en: "Orders are handed to the carrier within 1–2 business days of payment confirmation, and a tracking number is emailed to you as soon as the parcel is dispatched.",
      ja: "ご注文は決済確認から 1〜2 営業日以内に配送業者へ引き渡し、発送が済み次第すぐに追跡番号をメールでお送りします。",
      ar: "نُسلّم الطرد إلى شركة الشحن خلال 1–2 يوم عمل من تأكيد الدفع، ويصلك رقم التتبّع بالبريد الإلكتروني فور إرساله.",
    },
  },
];

const RETURNS: Block[] = [
  {
    wide: true,
    p: {
      uk: "Якщо щось не підійшло — ми це виправимо. Будь-яке замовлення можна повернути протягом 14 днів з дати отримання за обґрунтованої причини — без винятків за категоріями.",
      en: "If something isn’t right, we’ll make it right. Any order can be returned within 14 days of receipt where the reason is justified — no excluded categories.",
      ja: "何かが合わなければ、こちらで責任を持って対応します。正当な理由があれば、どのご注文もお受け取りから 14 日以内に返品いただけます — 対象外のカテゴリーはありません。",
      ar: "إن لم يكن الأمر على ما يُرام، فسنُصلحه. يمكن إرجاع أي طلب خلال 14 يومًا من استلامه متى كان السبب وجيهًا — وبلا فئات مستثناة.",
    },
  },
  {
    list: [
      {
        uk: "Повернути замовлення можна протягом 14 днів з дати отримання, вказавши причину.",
        en: "Return any order within 14 days of the date you received it, giving the reason.",
        ja: "お受け取りの日から 14 日以内であれば、理由を添えてご注文を返品いただけます。",
        ar: "يمكنك إرجاع أي طلب خلال 14 يومًا من تاريخ استلامه، مع ذكر السبب.",
      },
      {
        uk: "Виріб має бути невикористаним і повернутися у повній комплектації, в упаковці, в якій надійшов.",
        en: "The item should be unused and returned complete, in the packaging it arrived in.",
        ja: "商品は未使用で、届いたときの梱包のまま、付属品をすべて揃えてご返送ください。",
        ar: "يجب أن يكون المنتج غير مستعمَل وأن يُعاد كاملًا في العبوة التي وصل بها.",
      },
      {
        uk: "У нас немає переліку товарів, що не підлягають поверненню.",
        en: "We keep no list of non-returnable products.",
        ja: "返品できない商品のリストは設けていません。",
        ar: "ليست لدينا قائمة بمنتجات غير قابلة للإرجاع.",
      },
      {
        uk: "Витрати на пересилання товару до нас покриває покупець.",
        en: "The cost of sending the item back to us is covered by the customer.",
        ja: "当社へご返送いただく際の送料はお客様のご負担となります。",
        ar: "يتحمّل العميل تكلفة إعادة إرسال المنتج إلينا.",
      },
    ],
  },
  {
    p: {
      uk: "Щоб оформити повернення, напишіть на {mail} і вкажіть номер замовлення — ми надішлемо інструкцію того ж дня.",
      en: "To start a return, email {mail} with your order number and we’ll send return instructions the same day.",
      ja: "返品をご希望の際は、ご注文番号を添えて {mail} までメールでご連絡ください。当日中に手順をお送りします。",
      ar: "لبدء الإرجاع، راسلنا على {mail} مع رقم طلبك وسنرسل لك التعليمات في اليوم نفسه.",
    },
  },
  {
    p: {
      uk: "Кошти повертаються тим самим способом, яким було здійснено оплату, протягом 14 днів після отримання та перевірки товару.",
      en: "Refunds are issued to the original payment method within 14 days of us receiving and inspecting the returned item.",
      ja: "ご返金は、返品された商品を受け取り検品してから 14 日以内に、お支払いに使われた方法へお戻しします。",
      ar: "تُردّ المبالغ إلى وسيلة الدفع الأصلية خلال 14 يومًا من استلامنا المنتج المُعاد وفحصه.",
    },
  },
];

export default function CartInfoSections({ locale }: { locale: string }) {
  const [open, setOpen] = useState<SectionId | null>(null);

  const rows: { id: SectionId; icon: React.ReactNode; title: string; sub: string }[] = [
    {
      id: "payment",
      icon: <CardIcon />,
      title: t(locale, { uk: "Захищена оплата", en: "Secured Payment", ja: "安全なお支払い", ar: "دفع آمن" }),
      /* APPLE PAY AND GOOGLE PAY ARE NOT CLAIMED HERE, and must not be until
         they are confirmed live on the Monobank invoice flow. This row is read
         at the highest-intent moment on the site; a payment method that turns
         out not to be there is the most expensive kind of wrong copy. */
      sub: "Plata by Mono (Monobank)",
    },
    {
      id: "delivery",
      icon: <TruckIcon />,
      title: t(locale, { uk: "Доставка", en: "Delivery", ja: "配送", ar: "الشحن" }),
      sub: t(locale, { uk: "Нова Пошта та Укрпошта", en: "Nova Poshta and Ukrposhta", ja: "Nova Poshta / Ukrposhta", ar: "Nova Poshta وUkrposhta" }),
    },
    {
      id: "returns",
      icon: <BoxIcon />,
      title: t(locale, { uk: "Повернення та обмін", en: "Returns & Exchanges", ja: "返品・交換", ar: "الإرجاع والاستبدال" }),
      sub: t(locale, { uk: "14 днів, без винятків", en: "14 days, no excluded items", ja: "14日間、対象外なし", ar: "14 يومًا، بلا أصناف مستثناة" }),
    },
  ];

  const content: Record<SectionId, { title: string; body: React.ReactNode }> = {
    payment: {
      title: t(locale, { uk: "Захищена оплата", en: "Secured Payment", ja: "安全なお支払い", ar: "دفع آمن" }),
      body: <Body blocks={PAYMENT} locale={locale} />,
    },
    delivery: {
      title: t(locale, { uk: "Доставка", en: "Delivery", ja: "配送", ar: "الشحن" }),
      body: <Body blocks={DELIVERY} locale={locale} />,
    },
    returns: {
      title: t(locale, { uk: "Повернення та обмін", en: "Returns & Exchanges", ja: "返品・交換", ar: "الإرجاع والاستبدال" }),
      body: <Body blocks={RETURNS} locale={locale} />,
    },
  };

  const active = open ? content[open] : null;

  return (
    <>
      <div className="mt-8">
        {rows.map((r, i) => (
          <button
            key={r.id}
            onClick={() => setOpen(r.id)}
            aria-haspopup="dialog"
            className="w-full flex items-center gap-4 py-5 text-left transition-opacity hover:opacity-70"
            style={{ borderTop: i === 0 ? "1px solid var(--border)" : "1px solid var(--border)" }}
          >
            <span className="shrink-0" style={{ color: "var(--text-muted)" }}>{r.icon}</span>
            <span className="flex-1 min-w-0">
              <span className="block text-[14px]" style={{ color: "var(--text)" }}>{r.title}</span>
              <span className="block text-[12.5px] mt-0.5" style={{ color: "var(--text-muted)" }}>{r.sub}</span>
            </span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
              className="shrink-0" style={{ color: "var(--text-muted)" }} aria-hidden="true">
              <path d="M6 3l5 5-5 5" />
            </svg>
          </button>
        ))}
      </div>

      <Modal
        open={open !== null}
        onClose={() => setOpen(null)}
        title={active?.title ?? ""}
        closeLabel={t(locale, { uk: "Закрити", en: "Close", ja: "閉じる", ar: "إغلاق" })}
      >
        {active?.body}
      </Modal>
    </>
  );
}
