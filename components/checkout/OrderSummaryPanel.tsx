"use client";

import Image from "next/image";
import { pick, t } from "@/lib/i18n-text";
import { useCart, lineKey, linePrice } from "@/components/CartContext";
import { describeLine } from "@/lib/cart-display";
import Price from "@/components/Price";
import { WasPrice, SetupNote } from "@/components/SetupSaving";
import { addMoney, moneyFromUah, subtractMoney, type Money } from "@/lib/currency";
import { COLONEL_DISCOUNT_RATE } from "@/lib/loyalty/ranks";

/* ---------------------------------------------------------------------------
   The order summary rail shown beside every checkout step, so what's being
   paid for is never off-screen.
--------------------------------------------------------------------------- */

export default function OrderSummaryPanel({
  locale,
  discount,
  voucherCode,
  discountSource,
  shippingUah,
  shippingPending,
}: {
  locale: string;
  /** Applied voucher value, in both currencies. Omitted when none is applied. */
  discount?: Money;
  voucherCode?: string | null;
  /** Which perk produced `discount` — they never stack, so exactly one wins
      and the row has to name the right one. */
  discountSource?: "voucher" | "rank" | "none";
  /** Quoted Nova Poshta cost, or null when no branch is chosen yet. */
  shippingUah?: number | null;
  /** International: shipping is invoiced after the order, not now. */
  shippingPending?: boolean;
}) {
  const { lines, subtotal, subtotalFull, bundle, count } = useCart();
  const goods = discount ? subtractMoney(subtotal, discount) : subtotal;
  // Carriers quote shipping in UAH; the summary shows ONE currency, so the
  // quote is converted at the display rate and the total includes it on BOTH
  // sides — the "includes shipping" line under the total must be true in
  // whichever currency the page is showing. (Loyalty is unaffected: it reads
  // the goods value the server stores, never this display figure.)
  const shipping: Money | null = shippingUah != null ? moneyFromUah(shippingUah) : null;
  const total: Money = shipping ? addMoney(goods, shipping) : goods;

  const L = {
    ...pick(locale, {
      title: { uk: "Підсумок замовлення", en: "Order Summary", ja: "ご注文内容", ar: "ملخّص الطلب" },
      items: { uk: "товарів", en: "items", ja: "点", ar: "منتجات" },
      subtotal: { uk: "Проміжний підсумок", en: "Subtotal", ja: "小計", ar: "المجموع الفرعي" },
      discount: { uk: "Ваучер", en: "Voucher", ja: "バウチャー", ar: "قسيمة" },
      shipping: { uk: "Доставка", en: "Shipping", ja: "配送", ar: "الشحن" },
      shippingNote: { uk: "Розраховується згодом", en: "Calculated later", ja: "後ほど計算します", ar: "يُحتسب لاحقًا" },
      shippingAfter: { uk: "Підтвердимо листом", en: "Confirmed by email", ja: "メールでご確認します", ar: "نؤكّده بالبريد الإلكتروني" },
      total: { uk: "Разом", en: "Total", ja: "合計", ar: "الإجمالي" },
      totalNote: { uk: "Без вартості доставки", en: "Excludes delivery", ja: "配送料は含みません", ar: "لا يشمل الشحن" },
      // The FOP-2 brief's checkout microcopy, verbatim (§4). Shown once shipping
      // is actually inside the figure above it — never sooner.
      totalIncludes: {
        uk: "До суми замовлення включено доставку до обраного напрямку.",
        en: "Order total includes shipping to your destination.",
        ja: "ご注文の合計金額には、お届け先までの配送料が含まれています。",
        ar: "إجمالي الطلب يشمل الشحن إلى وجهتك.",
      },
      // International: nothing is charged at this step; one total follows by email.
      totalIntl: {
        uk: "Точну суму замовлення з доставкою підтвердимо листом — оплата одним платежем.",
        en: "We'll confirm your order total including delivery by email — one single payment.",
        ja: "配送料を含むご注文の合計金額はメールでご確認いただきます — お支払いは一度きりです。",
        ar: "سنؤكّد إجمالي طلبك شاملًا الشحن عبر البريد الإلكتروني — دفعة واحدة.",
      },
      qty: { uk: "К-сть", en: "Qty", ja: "数量", ar: "الكمية" },
    }),
    /* Interpolated, so it cannot live in the record above. */
    rankDiscount: t(locale, {
      uk: `Знижка за звання · –${Math.round(COLONEL_DISCOUNT_RATE * 100)}%`,
      en: `Rank discount · ${Math.round(COLONEL_DISCOUNT_RATE * 100)}%`,
      ja: `ランク特典 · ${Math.round(COLONEL_DISCOUNT_RATE * 100)}%`,
      ar: `خصم الرتبة · ${Math.round(COLONEL_DISCOUNT_RATE * 100)}%`,
    }),
  };

  return (
    <aside className="p-7" style={{ background: "var(--bg-soft)" }}>
      <h2 className="text-[17px] font-medium mb-1" style={{ color: "var(--text)" }}>{L.title}</h2>
      <p className="text-[12px] mb-6" style={{ color: "var(--text-faint)" }}>{itemCount(locale, count, L.items)}</p>

      <ul className="flex flex-col gap-5 mb-6">
        {lines.map((l) => {
          const d = describeLine(l, locale);
          if (!d) return null;
          return (
            <li key={lineKey(l.slug, l.options)} className="flex gap-4">
              {/* The studio plate — see CartPageClient. */}
              <div className="relative w-14 h-14 shrink-0" style={{ background: "#f5f5f5" }}>
                <Image src={d.image} alt={d.name} fill sizes="56px" className="object-contain p-1" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium leading-snug" style={{ color: "var(--text)" }}>{d.name}</div>
                <div className="text-[12px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {[d.colour, d.addons].filter(Boolean).join(" · ") || d.material}
                </div>
                <div className="text-[12px] mt-0.5" style={{ color: "var(--text-muted)" }}>{L.qty} {l.qty}</div>
              </div>
              <div className="text-[13px] shrink-0" style={{ color: "var(--text)" }}>
                <Price money={linePrice(l)} locale={locale} />
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-2.5 text-[13px] pt-5" style={{ borderTop: "1px solid var(--border-strong)" }}>
        <div className="flex items-center justify-between">
          <span style={{ color: "var(--text-muted)" }}>{L.subtotal}</span>
          <span className="flex items-baseline gap-2">
            {bundle && <WasPrice money={subtotalFull} locale={locale} />}
            <span style={{ color: "var(--text)" }}><Price money={subtotal} locale={locale} /></span>
          </span>
        </div>
        {bundle && <SetupNote locale={locale} className="-mt-1" />}
        {discount && discount.eur > 0 && (
          <div className="flex items-center justify-between">
            <span style={{ color: "var(--text-muted)" }}>
              {discountSource === "rank" ? L.rankDiscount : L.discount}
              {voucherCode && <span className="font-mono tracking-wider"> · {voucherCode}</span>}
            </span>
            <span style={{ color: "var(--accent-hover)" }}>
              −<Price money={discount} locale={locale} />
            </span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span style={{ color: "var(--text-muted)" }}>{L.shipping}</span>
          <span style={{ color: shipping ? "var(--text)" : "var(--text-muted)" }}>
            {/* Through <Price>, like every other figure — a ₴ quote on a €
                page was exactly the bug this row used to have. */}
            {shipping ? (
              <Price money={shipping} locale={locale} />
            ) : shippingPending ? (
              L.shippingAfter
            ) : (
              L.shippingNote
            )}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: "1px solid var(--border-strong)" }}>
        <span className="text-[15px] font-medium" style={{ color: "var(--text)" }}>{L.total}</span>
        <span className="text-[19px] font-medium" style={{ color: "var(--text)" }}>
          <Price money={total} locale={locale} />
        </span>
      </div>
      {/* One line under the total, and it must always be TRUE of the figure
          shown: quoted shipping → "includes shipping"; international → the
          email-confirmation note; not yet quoted → "excludes delivery". */}
      <p className="text-[11px] mt-1.5" style={{ color: "var(--text-faint)" }}>
        {shipping ? L.totalIncludes : shippingPending ? L.totalIntl : L.totalNote}
      </p>
    </aside>
  );
}

/* ---------------------------------------------------------------------------
   "3 items" — one of the few places where a count and a noun cannot be two
   separate strings.

   English, Ukrainian and Japanese all take `{n} {word}` with a single word.
   Arabic does not: the counted noun changes form at 1, at 2, at 3–10 and again
   at 11+, and at 1 and 2 the numeral is not written at all. Rendering
   "1 منتجات" would be the same order of wrongness as "1 items".
--------------------------------------------------------------------------- */
function itemCount(locale: string, n: number, word: string): string {
  if (locale !== "ar") return `${n} ${word}`;
  if (n === 1) return "منتج واحد";
  if (n === 2) return "منتجان";
  if (n <= 10) return `${n} منتجات`;
  return `${n} منتجًا`;
}
