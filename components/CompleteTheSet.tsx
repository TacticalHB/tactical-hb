"use client";

import { useState } from "react";
import Link from "next/link";
import { products, availabilityOf, type Product } from "@/lib/products";
import { useCart, linePrice, type CartOptions } from "@/components/CartContext";
import { BUNDLE_CATEGORIES, bundleFor, type BundleCategory } from "@/lib/bundle";
import { addMoney, money, subtractMoney } from "@/lib/currency";
import { t } from "@/lib/i18n-text";
import ProductThumb from "@/components/ProductThumb";
import Price from "@/components/Price";

/* ---------------------------------------------------------------------------
   "Complete the set" — on every bowl, heat device and wind cover page (Mario,
   15 Oct 2026). The set builder existed, but only the banner led to it.

   THE PIECE ON THE PAGE, AS CONFIGURED, PLUS ONE OF EACH OTHER CATEGORY. The
   other two start on the first in-stock product of their category and can be
   swapped from a short list. Priced through lib/bundle — the same rule the
   cart, checkout and invoice use — so the set figure here is the one the
   basket will show.

   MONEY, NEVER A PERCENTAGE: the set price, with "separately" struck through
   beside it — the copy rule components/SetupSaving states.

   "Add the set" adds all three, the page's own piece in the configuration
   chosen above. A piece already in the basket is still added — the set is
   three things, and the saving is decided by the basket, not by this card.
--------------------------------------------------------------------------- */

type Pick = { slug: string; options?: CartOptions };

const CATEGORY_LABEL: Record<BundleCategory, Record<"uk" | "en" | "ja" | "ar", string>> = {
  bowl: { uk: "Чаша", en: "Bowl", ja: "ボウル", ar: "رأس" },
  hmd: { uk: "Пристрій нагріву", en: "Heat device", ja: "ヒートデバイス", ar: "جهاز حرارة" },
  windcover: { uk: "Ковпак", en: "Wind cover", ja: "ウインドカバー", ar: "غطاء رياح" },
};

function choicesFor(category: BundleCategory): Product[] {
  return products.filter((p) => p.category === category && availabilityOf(p) === "available");
}

function defaultPick(p: Product): Pick {
  return { slug: p.slug, options: p.variants?.length ? { variant: p.variants[0].name } : undefined };
}

export default function CompleteTheSet({
  product,
  options,
  locale,
}: {
  product: Product;
  /** The configuration chosen on the page — colour and add-ons. */
  options: CartOptions;
  locale: string;
}) {
  const { addToCart } = useCart();
  const own = product.category as BundleCategory;
  const others = BUNDLE_CATEGORIES.filter((c) => c !== own);

  const [picks, setPicks] = useState<Record<string, Pick>>(() =>
    Object.fromEntries(
      others.map((c) => {
        const first = choicesFor(c)[0];
        return [c, first ? defaultPick(first) : null];
      }).filter(([, v]) => v)
    )
  );
  const [added, setAdded] = useState(false);

  const L = {
    kicker: t(locale, { uk: "Повний сет", en: "Full setup", ja: "フルセット", ar: "طقم كامل" }),
    title: t(locale, { uk: "Зберіть сет", en: "Complete the set", ja: "セットで揃える", ar: "أكمل الطقم" }),
    lede: t(locale, {
      uk: "Чаша, пристрій нагріву та ковпак разом коштують менше, ніж окремо.",
      en: "A bowl, a heat device and a wind cover cost less together than apart.",
      ja: "ボウル、ヒートデバイス、ウインドカバーは、まとめて買うと単品より安くなります。",
      ar: "الرأس وجهاز الحرارة وغطاء الرياح معًا أقل سعرًا من شرائها منفصلة.",
    }),
    thisOne: t(locale, { uk: "Цей товар", en: "This item", ja: "この商品", ar: "هذا المنتج" }),
    setPrice: t(locale, { uk: "Ціна сету", en: "Set price", ja: "セット価格", ar: "سعر الطقم" }),
    separately: t(locale, { uk: "Окремо", en: "Separately", ja: "単品合計", ar: "منفصلة" }),
    add: t(locale, { uk: "Додати сет у кошик", en: "Add the set to bag", ja: "セットをバッグに追加", ar: "أضف الطقم إلى الحقيبة" }),
    addedMsg: t(locale, { uk: "Сет у кошику", en: "Set added", ja: "セットを追加しました", ar: "أُضيف الطقم" }),
    viewBag: t(locale, { uk: "Переглянути кошик", en: "View bag", ja: "バッグを見る", ar: "عرض الحقيبة" }),
    swap: t(locale, { uk: "Змінити", en: "Change", ja: "変更", ar: "تغيير" }),
  };

  const pieces: { category: BundleCategory; product: Product; pick: Pick }[] = [
    { category: own, product, pick: { slug: product.slug, options } },
    ...others.flatMap((c) => {
      const pk = picks[c];
      const p = pk && products.find((x) => x.slug === pk.slug);
      return p && pk ? [{ category: c, product: p, pick: pk }] : [];
    }),
  ];
  // Every category must be purchasable now, or there is no set to offer.
  if (pieces.length !== 3) return null;

  const units = pieces.map((x) => linePrice({ slug: x.pick.slug, qty: 1, options: x.pick.options }));
  const separately = units.reduce((s, u) => addMoney(s, u), money(0, 0));
  const bundle = bundleFor(pieces.map((x, i) => ({ category: x.category, unit: units[i] })));
  const setPrice = bundle ? subtractMoney(separately, bundle.saved) : separately;

  const addSet = () => {
    /* No "added" slide-over: it is built for one product and would show only
       the last of the three. The button itself confirms, then links on. */
    pieces.forEach((x) => addToCart(x.product, null, x.pick.options, false));
    setAdded(true);
  };

  const nameOf = (p: Product) => (locale === "uk" ? p.nameUk : p.nameEn);
  const imageOf = (p: Product, pick: Pick) =>
    p.variants?.find((v) => v.name === pick.options?.variant)?.image || p.tileImage || p.gridImage || p.image;

  return (
    <section className="page-container pb-16" aria-labelledby="complete-set-title">
      <div className="max-w-[1100px] rounded-[20px] p-6 md:p-8" style={{ background: "#f5f5f5" }}>
        <p className="text-[11px] tracking-[0.28em] uppercase font-medium" style={{ color: "var(--accent-ink)" }}>
          {L.kicker}
        </p>
        <h2 id="complete-set-title" className="font-display text-4xl md:text-5xl leading-none mt-2" style={{ color: "#111" }}>
          {L.title}
        </h2>
        <p className="mt-3 text-[15px]" style={{ color: "#707072" }}>{L.lede}</p>

        <div className="mt-7 grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr] items-stretch">
          {pieces.map((x, i) => (
            <div key={x.category} className="contents">
              {i > 0 && (
                <div aria-hidden="true" className="hidden md:flex items-center justify-center text-2xl font-light" style={{ color: "#9a9a9e" }}>
                  +
                </div>
              )}
              <div className="rounded-2xl p-4 flex items-center gap-4 md:flex-col md:items-start" style={{ background: "#ffffff" }}>
                <div className="relative w-20 h-20 md:w-full md:h-36 shrink-0 rounded-xl overflow-hidden" style={{ background: "#f5f5f5" }}>
                  <ProductThumb src={imageOf(x.product, x.pick)} name={nameOf(x.product)} sizes="(min-width: 768px) 260px, 80px" className="object-contain p-2" />
                </div>
                <div className="min-w-0 flex-1 w-full">
                  <p className="text-[11px] tracking-[0.18em] uppercase" style={{ color: "#8a8a8e" }}>
                    {i === 0 ? L.thisOne : t(locale, CATEGORY_LABEL[x.category])}
                  </p>
                  {i === 0 ? (
                    <p className="text-[15px] font-medium mt-1" style={{ color: "#111" }}>{nameOf(x.product)}</p>
                  ) : (
                    /* Swap within the category — a native select, so it is
                       keyboard- and screen-reader-ready for free. */
                    <label className="block mt-1">
                      <span className="sr-only">{`${L.swap}: ${t(locale, CATEGORY_LABEL[x.category])}`}</span>
                      <select
                        value={x.pick.slug}
                        onChange={(e) => {
                          const p = products.find((pp) => pp.slug === e.target.value);
                          if (p) setPicks((prev) => ({ ...prev, [x.category]: defaultPick(p) }));
                          setAdded(false);
                        }}
                        className="w-full text-[14px] md:text-[15px] font-medium bg-transparent py-0.5 pe-5 cursor-pointer truncate"
                        style={{ color: "#111" }}
                      >
                        {choicesFor(x.category).map((p) => (
                          <option key={p.slug} value={p.slug}>{nameOf(p)}</option>
                        ))}
                      </select>
                    </label>
                  )}
                  <p className="text-[14px] mt-1 tabular-nums" style={{ color: "#707072" }}>
                    <Price money={units[i]} locale={locale} />
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-[13px]" style={{ color: "#707072" }}>{L.setPrice}</span>
            <span className="text-[24px] font-semibold tabular-nums" style={{ color: "#111" }}>
              <Price money={setPrice} locale={locale} />
            </span>
            {bundle && (
              <s className="text-[13px] tabular-nums" style={{ color: "#8a8a8e", textDecorationThickness: "1px" }}>
                {L.separately} <Price money={separately} locale={locale} />
              </s>
            )}
          </div>
          {added ? (
            <Link
              href={`/${locale}/cart`}
              className="h-12 px-7 rounded-full text-[15px] font-medium inline-flex items-center justify-center gap-2 transition-opacity hover:opacity-85"
              style={{ background: "var(--accent)", color: "#111114" }}
            >
              ✓ {L.addedMsg} · {L.viewBag}
            </Link>
          ) : (
            <button
              type="button"
              onClick={addSet}
              className="h-12 px-7 rounded-full text-[15px] font-medium transition-opacity hover:opacity-85"
              style={{ background: "#111111", color: "#ffffff" }}
            >
              {L.add}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
