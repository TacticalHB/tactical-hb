"use client";

import { useMemo, useState } from "react";
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

function bandLabel(b: Band, c: Currency, uk: boolean): string {
  const [lo, hi] = bandRange(b, c);
  const sym = c === "UAH" ? "₴" : "€";
  if (lo === 0) return uk ? `До ${sym}${hi}` : `Under ${sym}${hi}`;
  if (hi === Infinity) return uk ? `${sym}${lo} та вище` : `${sym}${lo} & Above`;
  return `${sym}${lo} – ${sym}${hi}`;
}

export default function ProductsBrowser({ locale }: { locale: string }) {
  const [cat, setCat] = useState<CatKey>("all");
  const [bands, setBands] = useState<string[]>([]);
  const [sort, setSort] = useState("featured");
  const [showFilters, setShowFilters] = useState(true);

  const uk = locale === "uk";
  const currency = currencyForLocale(locale);
  const L = {
    title: uk ? "Продукти" : "Products",
    hide: uk ? "Сховати фільтри" : "Hide Filters",
    show: uk ? "Показати фільтри" : "Show Filters",
    sortBy: uk ? "Сортувати" : "Sort By",
    featured: uk ? "Рекомендовані" : "Featured",
    lowHigh: uk ? "Ціна: зростання" : "Price: Low–High",
    highLow: uk ? "Ціна: спадання" : "Price: High–Low",
    category: uk ? "Категорія" : "Category",
    price: uk ? "Ціна" : "Shop by Price",
    cats: {
      all: uk ? "Усі продукти" : "All Products",
      hmd: uk ? "Пристрої для нагріву" : "Heat Devices",
      bowl: uk ? "Чаші" : "Bowls",
      windcover: uk ? "Ковпаки" : "Windcovers",
      accessory: uk ? "Аксесуари" : "Accessories",
    } as Record<CatKey, string>,
    incoming: uk ? "Скоро" : "Incoming",
    buildSetup: uk ? "Зібрати сет" : "Build a setup",
  };

  /* ACCESSORIES ARE NOT PRODUCTS HERE. The category now holds the three add-ons
     — lid, rubber, timer — which are options on a parent, not things with a SKU
     of their own (see lib/addons). Nothing in `products` carries the accessory
     category any more, so the grid below renders add-on cards for this filter
     and product cards for every other one.

     They are also absent from All Products by construction rather than by an
     exclusion rule: they were never in the product list. Search reaches them
     through lib/addons separately. */
  const showingAddons = cat === "accessory";

  const list = useMemo(() => {
    if (showingAddons) return [];
    let l = ALL.filter((p) => cat === "all" || p.category === cat);
    if (bands.length)
      l = l.filter((p) => bands.some((k) => inBand(p, PRICE_BANDS.find((b) => b.key === k)!, currency)));
    if (sort === "price-asc") l = [...l].sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") l = [...l].sort((a, b) => b.price - a.price);
    return l;
  }, [cat, bands, sort, currency, showingAddons]);

  /* The third wind-cover slot. A real third cover exists but has no name, no
     photograph and no price, so it is shown as a tile rather than invented as a
     product: no title, no price, nothing to add to a basket.

     Hidden when a price filter is on — it has no price to match, and a tile
     that ignored the filter would look like a bug. */
  const showIncoming = (cat === "all" || cat === "windcover") && bands.length === 0;

  /** What the heading counts. The Incoming tile is not a product and is not
      counted; the add-on cards are what the Accessories view actually shows. */
  const shownCount = showingAddons ? ADDONS.length : list.length;

  const toggleBand = (k: string) =>
    setBands((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));

  const catKeys: CatKey[] = ["all", "hmd", "bowl", "windcover", "accessory"];

  return (
    <div className="pt-16 min-h-screen" style={{ background: "#ffffff", color: "#111111" }}>
      <div className="page-container pt-8 pb-24">
        {/* Top bar */}
        <div className="flex items-end justify-between pb-5 border-b" style={{ borderColor: "#e5e5e5" }}>
          <h1 className="text-xl md:text-2xl font-medium">
            {cat === "all" ? L.title : L.cats[cat]}{" "}
            <span style={{ color: "#8a8a8e" }}>({shownCount})</span>
          </h1>
          <div className="flex items-center gap-5 md:gap-8">
            {/* The kit builder, offered from the shelf it draws from. A quiet
                text link rather than a button: it is a second way to shop, not
                a louder one than the products themselves. */}
            <Link
              href={`/${locale}/setup`}
              className="hidden sm:inline-flex items-center gap-2 text-[15px] setup-link"
            >
              {L.buildSetup}
              <span aria-hidden="true">→</span>
            </Link>
            <button
              onClick={() => setShowFilters((v) => !v)}
              className="hidden md:flex items-center gap-2 text-[15px]"
            >
              {showFilters ? L.hide : L.show}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M4 6h16M7 12h10M10 18h4" />
              </svg>
            </button>
            <label className="flex items-center gap-2 text-[15px]">
              <span className="hidden sm:inline">{L.sortBy}</span>
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

        <div className="flex gap-8 lg:gap-12 mt-8">
          {/* Sidebar */}
          {showFilters && (
            <aside className="hidden md:block w-52 shrink-0">
              <nav className="flex flex-col gap-3 mb-10">
                {catKeys.map((k) => (
                  <button
                    key={k}
                    onClick={() => setCat(k)}
                    className="text-left text-[15px] transition-colors"
                    style={{ color: cat === k ? "#111111" : "#707072", fontWeight: cat === k ? 500 : 400 }}
                  >
                    {L.cats[k]}
                  </button>
                ))}
              </nav>

              <div className="border-t pt-6" style={{ borderColor: "#e5e5e5" }}>
                <div className="text-[15px] font-medium mb-4">{L.price}</div>
                <div className="flex flex-col gap-3">
                  {PRICE_BANDS.map((b) => (
                    <label key={b.key} className="flex items-center gap-3 min-h-11 text-[15px] cursor-pointer" style={{ color: "#707072" }}>
                      <input
                        type="checkbox"
                        checked={bands.includes(b.key)}
                        onChange={() => toggleBand(b.key)}
                        className="w-5 h-5 accent-black shrink-0"
                      />
                      {bandLabel(b, currency, uk)}
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
