"use client";

import { useMemo, useState } from "react";
import { t } from "@/lib/i18n-text";
import Link from "next/link";
import { products as ALL, Product } from "@/lib/products";
import { currencyForLocale, formatMoney, type Currency } from "@/lib/currency";
import { ADDONS } from "@/lib/addons";
import NikeProductCard from "./NikeProductCard";

type CatKey = "all" | "hmd" | "bowl" | "windcover" | "accessory";

/**
 * Price bands, held in BOTH currencies so the filter matches the prices the
 * shopper is actually looking at — and so the labels can never quote a
 * currency the page isn't using.
 *
 * Re-cut for the current catalogue (€10–€32 / ₴370–₴1200): the previous
 * "Under €10" band matched nothing once prices rose, leaving a filter that
 * always returned an empty grid. These split the range 3 / 2 / 2, and the two
 * currencies group the products identically.
 *
 * Ranges are [lo, hi) — no product sits exactly on a boundary.
 */
type Band = { key: string; eur: [number, number]; uah: [number, number] };

const PRICE_BANDS: Band[] = [
  { key: "low", eur: [0, 15], uah: [0, 550] },
  { key: "mid", eur: [15, 25], uah: [550, 950] },
  { key: "high", eur: [25, Infinity], uah: [950, Infinity] },
];

const bandRange = (b: Band, c: Currency) => (c === "UAH" ? b.uah : b.eur);

function inBand(p: Product, b: Band, c: Currency): boolean {
  const [lo, hi] = bandRange(b, c);
  const value = c === "UAH" ? p.priceUah : p.price;
  return value >= lo && value < hi;
}

function bandLabel(b: Band, c: Currency, locale: string): string {
  const [lo, hi] = bandRange(b, c);
  const sym = c === "UAH" ? "₴" : "€";
  if (lo === 0) return t(locale, { uk: `До ${sym}${hi}`, en: `Under ${sym}${hi}`, ja: `${sym}${hi} 以下`, ar: `أقل من ${sym}${hi}` });
  if (hi === Infinity) return t(locale, { uk: `${sym}${lo} та вище`, en: `${sym}${lo} & Above`, ja: `${sym}${lo} 以上`, ar: `${sym}${lo} فأكثر` });
  return `${sym}${lo} – ${sym}${hi}`;
}

export default function ProductsBrowser({ locale }: { locale: string }) {
  const [cat, setCat] = useState<CatKey>("all");
  const [bands, setBands] = useState<string[]>([]);
  const [sort, setSort] = useState("featured");
  /* null = the visitor has not expressed a preference yet, and the two
     defaults differ: a desktop shows the sidebar because there is a column
     spare for it, a phone does not because an open panel pushed the first
     product 577px down an 812px screen — you arrived at a shop and saw
     filters. Which default applies is decided in CSS rather than from
     window.innerWidth, so the server and the first client render agree.
     Once it is toggled the choice is explicit and applies at every width. */
  const [showFilters, setShowFilters] = useState<boolean | null>(null);

  const uk = locale === "uk";
  const currency = currencyForLocale(locale);
  const L = {
    title: t(locale, { uk: "Продукти", en: "Products", ja: "製品", ar: "المنتجات" }),
    hide: t(locale, { uk: "Сховати фільтри", en: "Hide Filters", ja: "絞り込みを隠す", ar: "إخفاء عوامل التصفية" }),
    show: t(locale, { uk: "Показати фільтри", en: "Show Filters", ja: "絞り込む", ar: "عوامل التصفية" }),
    sortBy: t(locale, { uk: "Сортувати", en: "Sort By", ja: "並び替え", ar: "ترتيب حسب" }),
    featured: t(locale, { uk: "Рекомендовані", en: "Featured", ja: "おすすめ", ar: "المميّزة" }),
    lowHigh: t(locale, { uk: "Ціна: зростання", en: "Price: Low–High", ja: "価格：安い順", ar: "السعر: من الأقل" }),
    highLow: t(locale, { uk: "Ціна: спадання", en: "Price: High–Low", ja: "価格：高い順", ar: "السعر: من الأعلى" }),
    category: t(locale, { uk: "Категорія", en: "Category", ja: "カテゴリー", ar: "الفئة" }),
    price: t(locale, { uk: "Ціна", en: "Shop by Price", ja: "価格から探す", ar: "التسوق حسب السعر" }),
    cats: {
      all: t(locale, { uk: "Усі продукти", en: "All Products", ja: "すべての製品", ar: "كل المنتجات" }),
      hmd: t(locale, { uk: "Пристрої для нагріву", en: "Heat Devices", ja: "ヒートデバイス", ar: "أجهزة الحرارة" }),
      bowl: t(locale, { uk: "Чаші", en: "Bowls", ja: "ボウル", ar: "الرؤوس" }),
      windcover: t(locale, { uk: "Ковпаки", en: "Windcovers", ja: "ウインドカバー", ar: "أغطية الرياح" }),
      accessory: t(locale, { uk: "Аксесуари", en: "Accessories", ja: "アクセサリー", ar: "الإكسسوارات" }),
    } as Record<CatKey, string>,
    incoming: t(locale, { uk: "Скоро", en: "Incoming", ja: "近日入荷", ar: "قريبًا" }),
    buildSetup: t(locale, { uk: "Зібрати сет", en: "Build a setup", ja: "セットを組む", ar: "كوّن طقمك" }),
  };

  /* ACCESSORIES ARE REAL PRODUCTS AND STILL NOT IN ALL PRODUCTS.

     FEAR 9E418 and LID 9E418 carry the accessory category and have their own
     routes, so this filter renders ordinary product cards for them. The wind
     cover's timer is still an option with no page, so its card is appended
     below and still points at the cover.

     THE EXCLUSION FROM "ALL" IS NOW EXPLICIT, and it has to be. It used to be
     free — nothing in `products` was an accessory, so nothing could leak in.
     Now that two things are, "all" would sweep them into the main grid unless
     it says otherwise, which is the rule this shop has always had: accessories
     are found through this filter, through search, and by their own URL. */
  const showingAddons = cat === "accessory";

  const list = useMemo(() => {
    let l = ALL.filter((p) => (cat === "all" ? p.category !== "accessory" : p.category === cat));
    /* A withheld listing has no price, so it matches no band — the same call
       the Incoming tile already makes. Filtering by price is asking about
       money, and it has none to answer with. */
    if (bands.length)
      l = l.filter((p) => !p.incoming && bands.some((k) => inBand(p, PRICE_BANDS.find((b) => b.key === k)!, currency)));
    /* And it sorts to the end either way rather than leading "low to high" on
       a zero it does not really have. */
    const byPrice = (dir: 1 | -1) => (a: Product, b: Product) =>
      a.incoming || b.incoming ? Number(!!a.incoming) - Number(!!b.incoming) : (a.price - b.price) * dir;
    if (sort === "price-asc") l = [...l].sort(byPrice(1));
    else if (sort === "price-desc") l = [...l].sort(byPrice(-1));
    return l;
  }, [cat, bands, sort, currency]);

  /* The third wind-cover slot. A real third cover exists but has no name, no
     photograph and no price, so it is shown as a tile rather than invented as a
     product: no title, no price, nothing to add to a basket.

     Hidden when a price filter is on — it has no price to match, and a tile
     that ignored the filter would look like a bug. */
  const showIncoming = (cat === "all" || cat === "windcover") && bands.length === 0;

  /** What the heading counts. The Incoming tile is not a product and is not
      counted; on Accessories the real products and the timer card both are. */
  const shownCount = list.length + (showingAddons ? ADDONS.length : 0);

  const toggleBand = (k: string) =>
    setBands((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));

  const catKeys: CatKey[] = ["all", "hmd", "bowl", "windcover", "accessory"];

  return (
    <div className="pt-16 min-h-screen" style={{ background: "#ffffff", color: "#111111" }}>
      <div className="page-container pt-8 pb-24">
        {/* Top bar.

            IT STACKS ON A PHONE. Side by side at 375 the heading wrapped and
            dropped its own count onto a second line — "Products" over "(8)" —
            while the filter and sort controls crowded the right edge. A title
            row and a control row is the same information with room to sit in,
            and the controls end up left-aligned with everything else on the
            page rather than jammed against the gutter. */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 pb-5 border-b" style={{ borderColor: "#e5e5e5" }}>
          <h1 className="text-xl md:text-2xl font-medium whitespace-nowrap">
            {cat === "all" ? L.title : L.cats[cat]}{" "}
            <span style={{ color: "#8a8a8e" }}>({shownCount})</span>
          </h1>
          <div className="flex items-center justify-between sm:justify-end gap-5 md:gap-8">
            {/* The kit builder, offered from the shelf it draws from. A quiet
                text link rather than a button: it is a second way to shop, not
                a louder one than the products themselves.

                It moves to its own row below on a phone — see the strip under
                this bar — rather than being hidden, which is what it was. */}
            <Link
              href={`/${locale}/setup`}
              className="hidden sm:inline-flex items-center gap-2 text-[15px] setup-link"
            >
              {L.buildSetup}
              <span aria-hidden="true">→</span>
            </Link>
            {/* THE FILTERS TOGGLE IS NO LONGER DESKTOP-ONLY. It was
                `hidden md:flex`, which meant a phone had no way to filter the
                catalogue by category or price at all — the sidebar it opens
                was `hidden md:block` too, so both halves of the feature simply
                did not exist below 768. */}
            <button
              /* From "not chosen" the first press OPENS, which is what a phone
                 user wants and costs a desktop user one extra click the first
                 time they want the sidebar gone. */
              onClick={() => setShowFilters((v) => (v === null ? true : !v))}
              className="flex items-center gap-2 h-11 text-[15px]"
              aria-expanded={showFilters === true}
            >
              <span className="hidden sm:inline">{showFilters ? L.hide : L.show}</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <path d="M4 6h16M7 12h10M10 18h4" />
              </svg>
              {/* The icon alone on a phone, but never unlabelled to a reader. */}
              <span className="sr-only sm:hidden">{showFilters ? L.hide : L.show}</span>
            </button>
            <label className="flex items-center gap-2 text-[15px]">
              {/* "Sort by" was `hidden sm:inline`, leaving a phone with a bare
                  control reading "Featured" and no clue what it did. */}
              <span className="whitespace-nowrap" style={{ color: "#707072" }}>{L.sortBy}</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="bg-transparent outline-none cursor-pointer font-medium h-11"
              >
                <option value="featured">{L.featured}</option>
                <option value="price-asc">{L.lowHigh}</option>
                <option value="price-desc">{L.highLow}</option>
              </select>
            </label>
          </div>
        </div>

        {/* THE KIT BUILDER, ON ITS OWN ROW ON A PHONE. The top bar has a title,
            a filter control and a sort control on it already; a fourth thing
            would either wrap badly or push the sort off the edge, which is how
            it came to be hidden in the first place. A full-width row below is
            the honest answer — it is a headline feature and almost no
            competitor has one, so burying it on the surface most customers
            arrive on was the wrong trade. */}
        <Link
          href={`/${locale}/setup`}
          className="sm:hidden flex items-center justify-between gap-3 mt-4 px-4 h-12 rounded-full text-[15px] setup-link"
          style={{ border: "1px solid #e5e5e5" }}
        >
          <span>{L.buildSetup}</span>
          <span aria-hidden="true">→</span>
        </Link>

        {/* Column on a desktop, stacked block on a phone. Same markup, same
            state, same controls — the panel simply sits above the grid at full
            width where there is no room beside it. */}
        <div className="flex flex-col md:flex-row gap-8 lg:gap-12 mt-8">
          {/* Sidebar. Always rendered while it could be shown, with the
              "not chosen yet" default expressed as `hidden md:block` — the one
              state where the two viewports disagree. */}
          {showFilters !== false && (
            <aside
              className={`${showFilters === null ? "hidden md:block" : "block"} w-full md:w-52 shrink-0`}
            >
              {/* Categories read as a wrapping row of chips on a phone and a
                  stacked list on a desktop. A phone has the width for five
                  short words side by side and not the height to spend five
                  rows on them. */}
              <nav className="flex flex-row flex-wrap md:flex-col gap-2 md:gap-3 mb-6 md:mb-10">
                {catKeys.map((k) => (
                  <button
                    key={k}
                    onClick={() => setCat(k)}
                    aria-pressed={cat === k}
                    /* The pill outline is mobile-only — on desktop this has
                       always been a plain list that shows selection by weight,
                       and md:border-0 keeps it that way. */
                    className="text-left md:text-left text-[15px] transition-colors h-11 px-4 md:px-0 rounded-full md:rounded-none border md:border-0"
                    style={{
                      color: cat === k ? "#111111" : "#707072",
                      fontWeight: cat === k ? 500 : 400,
                      borderColor: cat === k ? "#111111" : "#e5e5e5",
                    }}
                  >
                    {L.cats[k]}
                  </button>
                ))}
              </nav>

              <div className="border-t pt-6" style={{ borderColor: "#e5e5e5" }}>
                <div className="text-[15px] font-medium mb-4">{L.price}</div>
                <div className="flex flex-row flex-wrap md:flex-col gap-x-6 gap-y-1 md:gap-3">
                  {PRICE_BANDS.map((b) => (
                    <label key={b.key} className="flex items-center gap-3 min-h-11 text-[15px] cursor-pointer" style={{ color: "#707072" }}>
                      <input
                        type="checkbox"
                        checked={bands.includes(b.key)}
                        onChange={() => toggleBand(b.key)}
                        className="w-5 h-5 accent-black shrink-0"
                      />
                      {bandLabel(b, currency, locale)}
                    </label>
                  ))}
                </div>
              </div>
            </aside>
          )}

          {/* Grid */}
          <div className="flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12">
              {list.map((p) => (
                <NikeProductCard key={p.id} product={p} locale={locale} />
              ))}

              {/* The add-ons, in the catalogue's card language but deliberately
                  not purchasable here: each one is an option on a parent, so the
                  card carries the price and sends the customer to the page where
                  it is actually chosen. */}
              {showingAddons &&
                ADDONS.map((a) => (
                  <Link key={a.key} href={`/${locale}/products/${a.parentSlug}`} className="block group">
                    <div
                      className="relative aspect-square overflow-hidden rounded-[20px] grid place-items-center"
                      style={{ background: "#f5f5f5" }}
                    >
                      <span
                        className="text-sm tracking-[0.2em] uppercase"
                        style={{ color: "#c7c7c9" }}
                      >
                        {uk ? a.nameUk : a.nameEn}
                      </span>
                    </div>
                    <div className="mt-2">
                      <div className="text-[15px] font-medium leading-snug" style={{ color: "#111111" }}>
                        {uk ? a.nameUk : a.nameEn}
                      </div>
                      <div className="text-[15px] leading-snug" style={{ color: "#707072" }}>
                        {uk ? a.taglineUk : a.taglineEn}
                      </div>
                      <div className="text-[15px] mt-1" style={{ color: "#111111" }}>
                        +{formatMoney(a.price, currency)}
                      </div>
                      <div className="text-[13px] mt-1" style={{ color: "#8a8a8e" }}>
                        {uk ? a.parentUk : a.parentEn}
                      </div>
                    </div>
                  </Link>
                ))}

              {/* Incoming — a tile, not a product. No title, no price, nothing
                  to click: there is no page to send anyone to yet. */}
              {showIncoming && (
                <div>
                  <div
                    className="relative aspect-square overflow-hidden rounded-[20px] grid place-items-center"
                    style={{ background: "#f5f5f5" }}
                    aria-label={L.incoming}
                  >
                    <span
                      className="text-sm tracking-[0.2em] uppercase"
                      style={{ color: "#c7c7c9" }}
                    >
                      {L.incoming}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
