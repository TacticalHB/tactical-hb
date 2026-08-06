"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Product } from "@/lib/products";
import { useCart } from "./CartContext";
import { useFavourites } from "@/hooks/useFavourites";
import HmdMaterialSelector, { ConfigSelector, WINDCOVER_OPTIONS } from "./HmdMaterialSelector";
import { materialUpcharge, LID_WEIGHT_G, type HmdMaterial } from "@/lib/hmd-options";
import { timerUpcharge, type WindcoverOptions } from "@/lib/windcover-options";
import Price from "./Price";
import { addMoney, money } from "@/lib/currency";

/* Brand slogan — shown as the statement band on every product page */
const SITE_SLOGAN = "IT'S FOOL TO MAKE A WAR ON US.";

/* ---------- Announcement banner — four lines on a cross-fade ----------

   It used to carry one line on a Nike-style horizontal glide, with a cloned
   slide on the end and an animation-off frame to hide the wrap. All of that
   machinery existed to make a track of slides loop seamlessly; a cross-fade
   has no track and no seam, so it is gone. The lines simply stack and the
   current one is the opaque one.

   THE LINES ARE STACKED, NOT SWAPPED, and that is what keeps the bar still.
   Every line is rendered absolutely inside the same 40px box, so the tallest
   and the widest never move each other, and the band cannot resize mid-fade —
   which a single element having its text content replaced would do.

   Screen readers get the lines ONCE, as ordinary static text, and are never
   told about a change: no aria-live anywhere. This is decorative marketing
   copy on a four-second timer, and announcing it on a loop would talk over
   whatever the visitor was actually reading. aria-hidden is deliberately NOT
   used either — the words are real content, they just are not news.
------------------------------------------------------------------------- */
function Banner() {
  const t = useTranslations("pdp");
  const lines = t.raw("banner_lines") as string[];

  const [i, setI] = useState(0);

  useEffect(() => {
    /* Reduced motion holds line one and never starts a timer — the interval is
       the motion here, so not scheduling it IS the accommodation. */
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = setInterval(() => setI((v) => (v + 1) % lines.length), 3500);
    return () => clearInterval(id);
  }, [lines.length]);

  return (
    <div className="h-10 relative overflow-hidden" style={{ background: "#f5f5f5" }}>
      {lines.map((line, k) => (
        <p
          key={line}
          className="absolute inset-0 flex items-center justify-center px-4 text-center text-xs font-medium"
          style={{
            color: "#111",
            opacity: k === i ? 1 : 0,
            /* 250ms, inside the 200-300ms the brief asks for. The line leaving
               and the line arriving cross over rather than one waiting for the
               other, so the bar is never empty. */
            transition: "opacity 250ms ease-in-out",
            /* Only the visible line may take the pointer, or the stack would
               put three invisible paragraphs over the top one. */
            pointerEvents: k === i ? undefined : "none",
          }}
        >
          {line}
        </p>
      ))}
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
    case "cloud":
      return <svg {...common}><path d="M15 31a6 6 0 0 1 .5-12 8.5 8.5 0 0 1 16 1 5.5 5.5 0 0 1-1.5 11H15Z" /></svg>;
    case "user":
      return <svg {...common}><circle cx="22" cy="16" r="6" /><path d="M11 34c0-6.1 4.9-10 11-10s11 3.9 11 10" /></svg>;
    case "droplet":
      return <svg {...common}><path d="M22 9c4.5 6 7.5 9.5 7.5 14a7.5 7.5 0 0 1-15 0c0-4.5 3-8 7.5-14Z" /><path d="M18.5 24.5a3.5 3.5 0 0 0 3.5 3.5" opacity="0.45" /></svg>;
    case "mesh":
      return <svg {...common}><circle cx="22" cy="22" r="13" /><circle cx="22" cy="22" r="1.7" /><circle cx="16" cy="22" r="1.7" /><circle cx="28" cy="22" r="1.7" /><circle cx="22" cy="16" r="1.7" /><circle cx="22" cy="28" r="1.7" /></svg>;
    case "layers":
      return <svg {...common}><path d="M22 8l13 6.5-13 6.5-13-6.5Z" /><path d="M9 22l13 6.5 13-6.5" /><path d="M9 28.5l13 6.5 13-6.5" opacity="0.45" /></svg>;
    case "shield":
      return <svg {...common}><path d="M22 8l12 4v8c0 8-5.5 13-12 16-6.5-3-12-8-12-16v-8Z" /><path d="M16.5 22l4 4L28 18" /></svg>;
    case "sparkle":
      return <svg {...common}><path d="M22 9l2.6 8.4L33 20l-8.4 2.6L22 31l-2.6-8.4L11 20l8.4-2.6Z" /><path d="M31.5 28l1 3 3 1-3 1-1 3-1-3-3-1 3-1Z" opacity="0.6" /></svg>;
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
  /* When there are no explicit pdp.photos, the variant images ARE the gallery,
     so the photo index and variant index move together. When pdp.photos is set
     (incl. an empty/blank gallery), the variant selector is price/finish-only. */
  const galleryIsVariants = !!variants && !pdp?.photos;

  /* If arriving with ?variant=<name>, open that colour (e.g. Purple), not the default */
  const searchParams = useSearchParams();
  const initialVariant = variants
    ? Math.max(0, variants.findIndex((v) => v.name.toLowerCase() === (searchParams.get("variant") ?? "").toLowerCase()))
    : 0;
  const [variantIdx, setVariantIdx] = useState(initialVariant);
  const [idx, setIdx] = useState(galleryIsVariants ? initialVariant : 0);

  /* HMD material add-ons — additive, and BOTH PRE-SELECTED here.
     Browsing shows the base price (see NikeProductCard) so a customer scanning
     the catalogue is never quoted the fully-loaded figure; by the time they
     open a product they are choosing a specific device, so the complete
     configuration is offered and they opt out of it rather than into it. */
  const isHmd = product.category === "hmd";
  const [material, setMaterial] = useState<HmdMaterial>({ lid: true, rubber: true });

  /* The wind cover's timer follows the same rule as the HMD add-ons above:
     PRE-SELECTED here, base price on the card. Opening the page offers the
     complete thing and lets them opt out — ₴1700 / €45 with the timer, ₴850 /
     €23 without. */
  const isWindcover = product.category === "windcover";
  const [windcover, setWindcover] = useState<WindcoverOptions>({ timer: true });

  const basePrice = variants
    ? money(variants[variantIdx].price ?? product.price, variants[variantIdx].priceUah ?? product.priceUah)
    : money(product.price, product.priceUah);
  const price = isHmd
    ? addMoney(basePrice, materialUpcharge(material))
    : isWindcover
      ? addMoney(basePrice, timerUpcharge(windcover))
      : basePrice;

  const selectVariant = (i: number) => {
    setVariantIdx(i);
    if (galleryIsVariants) setIdx(i);
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
    addToBag: uk ? "Додати в кошик" : "Add to Shopping Bag",
    favourite: uk ? "В обране" : "Favourite",
    colour: uk ? "Колір" : "Colour Shown",
    style: uk ? "Модель" : "Style",
    specs: uk ? "Характеристики" : "Tech Specs",
    weight: uk ? "Вага" : "Weight",
    dimensions: uk ? "Розміри" : "Dimensions",
    tips: uk ? "Поради з використання" : "Tips for Use",
    delivery: uk ? "Доставка та повернення" : "Delivery & Returns",
    deliveryText: uk
      /* One string for the whole catalogue, which is the point: it used to
         promise "Europe & the Middle East" while the shop ships worldwide, and
         a per-product string would have had to be corrected eight times and
         missed on the ninth. Fourteen days matches the offer and the returns
         policy — do not change it here alone. */
      ? "Доставляємо по всьому світу. Повернення — протягом 14 днів з обґрунтованої причини."
      : "We ship worldwide. Returns accepted within 14 days where the reason is justified.",
    benefits: uk ? "Ключові переваги" : "Key Benefits",
  };

  /* favourites — shared state: localStorage for guests, Supabase once signed in */
  const { isFavourited, toggleFavourite } = useFavourites();
  const fav = isFavourited(product.slug);
  const toggleFav = () => toggleFavourite(product.slug);

  return (
    <div className="pt-16 min-h-screen" style={{ background: "#ffffff", color: "#111111" }}>
      <Banner />

      {/* ---- Main PDP grid ---- */}
      <div className="page-container pt-8 md:pt-12 pb-16">
        {/* Grid capped + centred: the page container is 1680px, which pushed the
            flex-1 gallery to ~858px and let the image dominate. 1100px puts the
            main image at ~604px (1100 − 380 info − 48 gap − 68 rail). */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 max-w-[1100px] mx-auto">

          {/* Gallery: rail + main image */}
          <div className="flex-1 flex flex-col-reverse md:flex-row gap-3 lg:sticky lg:top-24 self-start w-full mx-auto max-w-[620px] lg:max-w-none">
            {/* Thumbnail rail */}
            {photos.length > 1 && (
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
              {photos.length > 0 ? (
                <Image
                  key={photos[idx]}
                  src={photos[idx]}
                  alt={name}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 620px"
                  className="object-contain pdp-fade"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3" style={{ color: "#c2c2c2" }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="15" rx="2" /><circle cx="8.5" cy="9.5" r="1.6" /><path d="M21 16l-5-5-9 8" />
                  </svg>
                  <span className="text-sm tracking-wide">{uk ? "Фото незабаром" : "Photos coming soon"}</span>
                </div>
              )}
              {/* prev / next */}
              {photos.length > 1 && (
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
            {/* Single currency here — the headline price reads cleaner on the
                detail page. Currency follows the language (УКР → ₴, ENG → €).
                Listing/cart/search still show both side by side. */}
            <p className="text-lg font-medium mt-4">
              <Price money={price} locale={locale} />
            </p>

            {/* Colour variants — swatch selector (Black / Purple …) */}
            {variants && (
              <div className="mt-6">
                <div className="text-[13px] mb-2" style={{ color: "#707072" }}>
                  {uk ? "Колір" : "Colour"}: <span style={{ color: "#111" }}>{variantLabel(variants[variantIdx].name)}</span>
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
                        boxShadow: i === variantIdx ? "0 0 0 1.5px #111, 0 0 0 3px #fff inset" : "0 0 0 1px #d6d6d6",
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* HMD add-ons — additive, folded into the live price above */}
            {isHmd && (
              <div className="mt-6">
                <HmdMaterialSelector
            value={material}
            onToggle={(k) => setMaterial((prev) => ({ ...prev, [k]: !prev[k] }))}
            locale={locale}
            variant="pdp"
          />
              </div>
            )}

            {/* Wind cover timer — the same control as the HMD's, literally the
                same component with a different option set. */}
            {isWindcover && (
              <div className="mt-6">
                <ConfigSelector
                  options={WINDCOVER_OPTIONS}
                  value={windcover as unknown as Record<string, boolean>}
                  onToggle={() => setWindcover((prev) => ({ timer: !prev.timer }))}
                  locale={locale}
                  variant="pdp"
                />
              </div>
            )}

            {/* Buttons */}
            <div className="flex flex-col gap-3 mt-8">
              {/* The slide-over replaces the fly-to-cart animation here (passing
                  null as the source). */}
              <button
                onClick={() =>
                  addToCart(
                    product,
                    null,
                    {
                      variant: variants?.[variantIdx]?.name,
                      lid: isHmd ? material.lid : undefined,
                      rubber: isHmd ? material.rubber : undefined,
                      timer: isWindcover ? windcover.timer : undefined,
                    },
                    true
                  )
                }
                className="w-full h-14 rounded-full text-[15px] font-medium transition-opacity hover:opacity-85"
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

            {/* Weight & dimensions — from structured data, so every product shows
                the same clean block in both languages. */}
            <dl className="mt-6 pt-5 flex flex-col gap-2 text-[15px]" style={{ borderTop: "1px solid #efefef" }}>
              <div className="flex justify-between gap-4">
                <dt style={{ color: "#707072" }}>{L.weight}</dt>
                <dd className="text-right" style={{ color: "#111" }}>
                  {product.category === "hmd"
                    ? uk
                      ? `${product.weightG} г (${product.weightG + LID_WEIGHT_G} г з кришкою)`
                      : `${product.weightG} g (${product.weightG + LID_WEIGHT_G} g with lid)`
                    : uk
                      ? `${product.weightG} г`
                      : `${product.weightG} g`}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt style={{ color: "#707072" }}>{L.dimensions}</dt>
                <dd className="text-right" style={{ color: "#111" }}>
                  {`${product.dims.l} × ${product.dims.w} × ${product.dims.h} ${uk ? "мм" : "mm"}`}
                </dd>
              </div>
            </dl>

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
                        <td className="py-2.5 text-right" style={{ color: "#111" }}>{uk ? s.valueUk : s.valueEn}</td>
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
      <div className="page-container pb-20">
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
