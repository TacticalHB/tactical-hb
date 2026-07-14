"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Product } from "@/lib/products";
import { useCart } from "./CartContext";
import { getFavs, toggleFav as toggleFavStore, FAVS_EVENT } from "@/lib/favourites";

/* Brand slogan — shown as the statement band on every product page */
const SITE_SLOGAN = "IT'S FOOL TO MAKE A WAR ON US.";

/* ---------- Sliding announcement banner (Nike-style horizontal glide) ---------- */
function Banner({ locale }: { locale: string }) {
  const messages =
    locale === "uk"
      ? ["Безкоштовна доставка по Україні від $50", "Перегляньте наші новинки"]
      : ["Free delivery on orders over $50 in Ukraine", "Check out our new arrivals"];
  // Clone the first message onto the end so the wrap-around keeps gliding left
  // seamlessly instead of snapping backwards.
  const slides = [...messages, messages[0]];
  const [i, setI] = useState(0);
  const [animate, setAnimate] = useState(true);

  useEffect(() => {
    const id = setInterval(() => setI((v) => v + 1), 4500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (i === messages.length) {
      // The cloned slide is showing — after the glide finishes, jump back to the
      // real first slide with animation off so the reset is invisible.
      const t = setTimeout(() => {
        setAnimate(false);
        setI(0);
      }, 850);
      return () => clearTimeout(t);
    }
    if (!animate) {
      const r = requestAnimationFrame(() => setAnimate(true));
      return () => cancelAnimationFrame(r);
    }
  }, [i, animate, messages.length]);

  return (
    <div className="h-10 overflow-hidden" style={{ background: "#f5f5f5" }}>
      <div
        className="flex h-full"
        style={{
          transform: `translateX(-${i * 100}%)`,
          transition: animate ? "transform 800ms cubic-bezier(0.16, 1, 0.3, 1)" : "none",
        }}
      >
        {slides.map((m, k) => (
          <div key={k} className="w-full shrink-0 flex items-center justify-center">
            <p className="text-xs font-medium" style={{ color: "#111" }}>{m}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Accordion ---------- */
function Accordion({ title, children, extra }: { title: string; children: React.ReactNode; extra?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t" style={{ borderColor: "#e5e5e5" }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left"
        aria-expanded={open}
      >
        <span className="text-lg font-medium" style={{ color: "#111" }}>{title}</span>
        <span className="flex items-center gap-4">
          {extra}
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#111" strokeWidth="1.6"
            className="transition-transform duration-300" style={{ transform: open ? "rotate(180deg)" : "none" }}>
            <path d="M4 7l6 6 6-6" />
          </svg>
        </span>
      </button>
      <div className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}>
        <div className="overflow-hidden">
          <div className="pb-6 text-[15px] leading-relaxed" style={{ color: "#707072" }}>{children}</div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Feature icons ---------- */
function FeatureIcon({ name }: { name: string }) {
  const common = { width: 44, height: 44, viewBox: "0 0 44 44", fill: "none", stroke: "#111", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "flame":
      return <svg {...common}><path d="M22 8c1 5-6 8-6 15a8 8 0 0 0 16 0c0-4-2-6-4-9-1 3-2 4-4 5 0-4-1-8-2-11Z" /></svg>;
    case "clock":
      return <svg {...common}><circle cx="22" cy="22" r="13" /><path d="M22 14v8l6 4" /></svg>;
    case "hands":
      return <svg {...common}><circle cx="22" cy="22" r="13" /><path d="M16 22l4 4 8-9" /></svg>;
    case "wave":
      return <svg {...common}><path d="M8 26c4-8 8-8 12 0s8 8 12 0" /><path d="M8 18c4-8 8-8 12 0s8 8 12 0" opacity="0.4" /></svg>;
    default:
      return null;
  }
}

/* ---------- Page ---------- */
export default function ProductPDP({ product, locale }: { product: Product; locale: string }) {
  const uk = locale === "uk";
  const { addToCart } = useCart();
  const mainImgRef = useRef<HTMLDivElement>(null);

  const pdp = product.pdp;
  const variants = product.variants;
  const photos = pdp?.photos ?? (variants ? variants.map((v) => v.image) : product.gridImage ? [product.gridImage] : []);

  /* If arriving with ?variant=<name>, open that colour (e.g. Purple), not the default */
  const searchParams = useSearchParams();
  const initialIdx = variants
    ? Math.max(0, variants.findIndex((v) => v.name.toLowerCase() === (searchParams.get("variant") ?? "").toLowerCase()))
    : 0;
  const [idx, setIdx] = useState(initialIdx);

  const price = variants ? variants[idx].price ?? product.price : product.price;

  const selectVariant = (i: number) => {
    setIdx(i);
    if (typeof window !== "undefined" && variants) {
      const url = new URL(window.location.href);
      url.searchParams.set("variant", variants[i].name);
      window.history.replaceState(null, "", url.toString());
    }
  };
  const variantLabel = (n: string) =>
    uk ? (({ Black: "Чорний", Purple: "Фіолетовий" } as Record<string, string>)[n] ?? n) : n;

  const name = locale === "uk" ? product.nameUk : product.nameEn;
  const shortDesc = pdp ? (uk ? pdp.shortUk : pdp.shortEn) : (uk ? product.descriptionUk : product.descriptionEn);
  const benefits = pdp ? (uk ? pdp.benefitsUk : pdp.benefitsEn) ?? [] : [];
  const tips = pdp ? (uk ? pdp.tipsUk : pdp.tipsEn) ?? [] : [];
  const colourShown = pdp ? (uk ? pdp.colourShownUk : pdp.colourShownEn) : undefined;

  const catLabel =
    product.category === "hmd" ? (uk ? "Пристрій для нагріву" : "Heat Management Device")
    : product.category === "bowl" ? (uk ? "Чаша" : "Bowl")
    : (uk ? "Аксесуар" : "Accessory");

  const L = {
    addToBag: uk ? "Додати в кошик" : "Add to Bag",
    favourite: uk ? "В обране" : "Favourite",
    colour: uk ? "Колір" : "Colour Shown",
    style: uk ? "Модель" : "Style",
    specs: uk ? "Характеристики" : "Tech Specs",
    tips: uk ? "Поради з використання" : "Tips for Use",
    delivery: uk ? "Доставка та повернення" : "Delivery & Returns",
    deliveryText: uk
      ? "Безкоштовна доставка по Україні для замовлень від $50. Міжнародна доставка по Європі та Близькому Сходу — умови на сторінці Опт."
      : "Free delivery across Ukraine on orders over $50. International shipping across Europe & the Middle East — see Wholesale for terms.",
    benefits: uk ? "Ключові переваги" : "Key Benefits",
  };

  /* favourites — shared store, kept in sync with the navbar menu */
  const [fav, setFav] = useState(false);
  useEffect(() => {
    const sync = () => setFav(getFavs().includes(product.slug));
    sync();
    window.addEventListener(FAVS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(FAVS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [product.slug]);
  const toggleFav = () => setFav(toggleFavStore(product.slug));

  return (
    <div className="pt-16 min-h-screen" style={{ background: "#ffffff", color: "#111111" }}>
      <Banner locale={locale} />

      {/* ---- Main PDP grid ---- */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-8 md:pt-12 pb-16">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">

          {/* Gallery: rail + main image */}
          <div className="flex-1 flex flex-col-reverse md:flex-row gap-3 lg:sticky lg:top-24 self-start w-full">
            {/* Thumbnail rail */}
            {!variants && photos.length > 1 && (
              <div className="flex md:flex-col gap-2 md:max-h-[600px] md:overflow-y-auto shrink-0">
                {photos.map((p, i) => (
                  <button
                    key={p}
                    onMouseEnter={() => setIdx(i)}
                    onClick={() => setIdx(i)}
                    className="relative w-14 h-14 rounded-xl overflow-hidden transition-opacity"
                    style={{ background: "#f5f5f5", outline: i === idx ? "1.5px solid #111" : "none", opacity: i === idx ? 1 : 0.75 }}
                    aria-label={`View image ${i + 1}`}
                  >
                    <Image src={p} alt="" fill sizes="56px" className="object-cover" />
                  </button>
                ))}
              </div>
            )}
            {/* Main image */}
            <div ref={mainImgRef} className="relative flex-1 aspect-square rounded-[20px] overflow-hidden" style={{ background: "#f5f5f5" }}>
              <Image
                key={photos[idx]}
                src={photos[idx]}
                alt={name}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 55vw"
                className="object-contain pdp-fade"
              />
              {/* prev / next */}
              {!variants && photos.length > 1 && (
                <div className="absolute bottom-4 right-4 flex gap-2">
                  {[-1, 1].map((d) => (
                    <button
                      key={d}
                      onClick={() => setIdx((idx + d + photos.length) % photos.length)}
                      className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity hover:opacity-70"
                      style={{ background: "#ffffff", boxShadow: "0 1px 4px rgba(0,0,0,0.12)" }}
                      aria-label={d === -1 ? "Previous image" : "Next image"}
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#111" strokeWidth="1.6">
                        {d === -1 ? <path d="M10 3L5 8l5 5" /> : <path d="M6 3l5 5-5 5" />}
                      </svg>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Info column */}
          <div className="w-full lg:w-[380px] shrink-0">
            <h1 className="text-2xl font-medium leading-tight">{name}</h1>
            <p className="text-[15px] mt-1" style={{ color: "#707072" }}>{catLabel}</p>
            <p className="text-lg font-medium mt-4">€{price.toFixed(2)}</p>

            {/* Colour variants — swatch selector (Black / Purple …) */}
            {variants && (
              <div className="mt-6">
                <div className="text-[13px] mb-2" style={{ color: "#707072" }}>
                  {uk ? "Колір" : "Colour"}: <span style={{ color: "#111" }}>{variantLabel(variants[idx].name)}</span>
                </div>
                <div className="flex gap-3">
                  {variants.map((v, i) => (
                    <button
                      key={v.name}
                      onClick={() => selectVariant(i)}
                      aria-label={v.name}
                      className="w-9 h-9 rounded-full transition-transform hover:scale-110"
                      style={{
                        background: v.swatch,
                        boxShadow: i === idx ? "0 0 0 1.5px #111, 0 0 0 3px #fff inset" : "0 0 0 1px #d6d6d6",
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex flex-col gap-3 mt-8">
              <button
                onClick={() => addToCart(product, mainImgRef.current)}
                className="h-14 rounded-full text-[15px] font-medium transition-opacity hover:opacity-85"
                style={{ background: "#111111", color: "#ffffff" }}
              >
                {L.addToBag}
              </button>
              <button
                onClick={toggleFav}
                className="h-14 rounded-full text-[15px] font-medium border flex items-center justify-center gap-2 transition-colors hover:border-black"
                style={{ borderColor: "#cacacc", color: "#111" }}
              >
                {L.favourite}
                <svg width="18" height="18" viewBox="0 0 24 24" fill={fav ? "#111" : "none"} stroke="#111" strokeWidth="1.6">
                  <path d="M12 20s-7-4.5-9-9c-1.2-2.8.4-6 3.5-6C8.5 5 10 6.5 12 9c2-2.5 3.5-4 5.5-4 3.1 0 4.7 3.2 3.5 6-2 4.5-9 9-9 9Z" />
                </svg>
              </button>
            </div>

            {/* Short description + meta */}
            <p className="text-[15px] leading-relaxed mt-9" style={{ color: "#111" }}>{shortDesc}</p>
            <ul className="mt-5 text-[15px] flex flex-col gap-1" style={{ color: "#111" }}>
              {colourShown && <li className="list-disc ml-5">{L.colour}: {colourShown}</li>}
              {pdp?.styleCode && <li className="list-disc ml-5">{L.style}: {pdp.styleCode}</li>}
            </ul>

            {/* Key benefits */}
            {benefits.length > 0 && (
              <div className="mt-7 mb-9">
                <p className="text-[15px] font-medium mb-2">{L.benefits}</p>
                <ul className="text-[15px] leading-relaxed flex flex-col gap-1.5" style={{ color: "#707072" }}>
                  {benefits.map((b) => <li key={b} className="list-disc ml-5">{b}</li>)}
                </ul>
              </div>
            )}

            {/* Accordions */}
            {pdp?.specs && pdp.specs.length > 0 && (
              <Accordion title={L.specs}>
                <table className="w-full text-[15px]">
                  <tbody>
                    {pdp.specs.map((s) => (
                      <tr key={s.labelEn} className="border-b last:border-0" style={{ borderColor: "#efefef" }}>
                        <td className="py-2.5 pr-4" style={{ color: "#707072" }}>{uk ? s.labelUk : s.labelEn}</td>
                        <td className="py-2.5 text-right" style={{ color: "#111" }}>{s.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Accordion>
            )}
            {tips.length > 0 && (
              <Accordion title={L.tips}>
                <ul className="flex flex-col gap-2">
                  {tips.map((t) => <li key={t} className="list-disc ml-5">{t}</li>)}
                </ul>
              </Accordion>
            )}
            <Accordion title={L.delivery}>
              <p>{L.deliveryText}</p>
            </Accordion>
            <div className="border-t" style={{ borderColor: "#e5e5e5" }} />
          </div>
        </div>
      </div>

      {/* ---- Brand slogan statement (every product) + optional features band ---- */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 pb-20">
        <h2 className="font-display text-4xl md:text-6xl tracking-wide leading-[0.95]" style={{ color: "#111" }}>
          {SITE_SLOGAN}
        </h2>
        {pdp?.features && pdp.features.length > 0 && (
          <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 rounded-[20px] overflow-hidden" style={{ background: "#f5f5f5" }}>
            {pdp.features.map((f, i) => (
              <div key={f.titleEn}
                className="flex flex-col items-center text-center gap-3 py-12 px-4"
                style={{ borderLeft: i > 0 ? "1px solid #e8e8e8" : "none" }}>
                <FeatureIcon name={f.icon} />
                <div className="text-[13px] mt-2" style={{ color: "#707072" }}>{uk ? f.titleUk : f.titleEn}</div>
                <div className="text-[17px] font-medium" style={{ color: "#111" }}>{uk ? f.textUk : f.textEn}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
