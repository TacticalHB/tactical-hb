"use client";

import Image from "next/image";
import { t } from "@/lib/i18n-text";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Product, availabilityOf, availabilityText, isPurchasable } from "@/lib/products";
import HeartButton from "./HeartButton";
import Price from "./Price";
import { money } from "@/lib/currency";

export default function NikeProductCard({ product, locale }: { product: Product; locale: string }) {
  const status = availabilityOf(product);
  const router = useRouter();
  const name = product.tileTitle ?? (locale === "uk" ? product.nameUk : product.nameEn);
  const subtitle = t(locale, { uk: product.taglineUk, en: product.taglineEn, ja: product.taglineJa, ar: product.taglineAr });
  const variants = product.variants;
  const multi = !!variants && variants.length > 1;

  const [idx, setIdx] = useState(0);

  /* THE CARD ALWAYS QUOTES THE BASE PRICE. The add-ons used to be selectable
     here as a price preview, which meant a customer scanning the catalogue
     could be shown a figure well above the headline one before they had chosen
     anything. Browsing shows what the product starts at; the configuration —
     and the price that follows from it — belongs on the product page, where
     both add-ons come pre-selected. */
  const image = variants ? variants[idx].image : product.gridImage;
  const price = variants
    ? money(variants[idx].price ?? product.price, variants[idx].priceUah ?? product.priceUah)
    : money(product.price, product.priceUah);
  const href = `/${locale}/products/${product.slug}`;

  return (
    <div onMouseLeave={() => setIdx(0)} className="relative">
      {/* Heart — sits above the image link so it toggles instead of navigating.

          NOT ON A WITHHELD LISTING. The PDP already drops it, and leaving it on
          the card would let one be saved from the grid into a favourites list
          that renders every row's price — printing "€0.00" against a product
          that has no price rather than no product at all. Saving a thing that
          cannot be bought is a promise the shop cannot keep either way. */}
      {isPurchasable(product) && (
      <HeartButton
        productId={product.slug}
        /* 44px, up from 36. It sits over the photograph in the corner of the
           card, which is exactly where a thumb arrives least accurately. The
           inset drops to top-1.5/right-1.5 so the visible disc stays roughly
           where it was rather than marching into the middle of the image. */
        className="absolute top-1.5 right-1.5 z-10 w-11 h-11 rounded-full backdrop-blur-sm"
        label={`Favourite ${name}`}
      />
      )}
      {/* Image */}
      <Link href={href} className="block group">
        <div className="relative aspect-square overflow-hidden rounded-[20px]" style={{ background: "#f5f5f5" }}>
          {image ? (
            <Image
              src={image}
              alt={name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-contain p-10 transition-transform duration-[var(--motion-slow)] ease-out group-hover:scale-[1.05]"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm tracking-[0.2em] uppercase" style={{ color: "#c7c7c9" }}>
                {name}
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* Text — name on the left (aligned across cards), swatches on the right */}
      <div className="mt-2">
        <div className="flex items-start justify-between gap-3">
          <Link href={href} className="text-[15px] font-medium leading-snug" style={{ color: "#111111" }}>
            {name}
          </Link>
          {/* THE DOT STAYS 20px, THE BUTTON IS 40. Two 20px circles eight pixels
              apart, each navigating to a DIFFERENT product variant, is the
              highest-consequence mis-tap on the catalogue — you meant black and
              you got purple. The swatch moves into an inner span so the button
              can carry the hit area without the colour growing with it, and the
              negative vertical margin keeps the title row the height it was.

              40 rather than 44: this row also holds the product name, and two
              44px boxes push a longer Ukrainian name onto a second line. It is
              the one place on the site where the full target loses to layout,
              and doubling the area is most of the win. */}
          {multi && (
            <div className="flex gap-0 shrink-0 -my-2.5 -mr-2.5">
              {variants!.map((v, i) => (
                <button
                  key={v.name}
                  onMouseEnter={() => setIdx(i)}
                  onClick={() => router.push(`${href}?variant=${encodeURIComponent(v.name)}`)}
                  aria-label={v.name}
                  className="w-10 h-10 flex items-center justify-center shrink-0"
                >
                  <span
                    aria-hidden="true"
                    className="block w-5 h-5 rounded-full transition-transform hover:scale-110"
                    style={{
                      background: v.swatch,
                      boxShadow: i === idx ? "0 0 0 1.5px #111, 0 0 0 3px #fff inset" : "0 0 0 1px #d6d6d6",
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
        <Link href={href} className="block">
          {subtitle && (
            <div className="text-[15px] leading-snug" style={{ color: "#707072" }}>
              {subtitle}
            </div>
          )}
          {/* THE PRICE AND THE REASON IT CANNOT BE BOUGHT ARE TWO DIFFERENT
              FACTS. A withheld listing has no price at all, and printing its
              zero would read as free — so the status takes the slot. But a lid
              awaiting delivery and a sold-out bowl both have real prices, and
              hiding them tells a shopper less than they had before: they can
              still decide whether to come back for it. So the figure stays and
              the status sits beside it, and only a priceless listing gets the
              status alone.

              An empty row is what makes a grid look broken, which is why one
              of the three always renders. */}
          <div className="text-[15px] font-medium mt-1.5" style={{ color: "#111111" }}>
            {status === "available" ? (
              <Price money={price} locale={locale} />
            ) : product.price > 0 ? (
              <span className="flex items-baseline gap-2 flex-wrap">
                <Price money={price} locale={locale} />
                <span className="text-[11px] tracking-[0.16em] uppercase" style={{ color: "#8a8a8d" }}>
                  {availabilityText(status, locale)}
                </span>
              </span>
            ) : (
              <span className="text-[13px] tracking-[0.18em] uppercase" style={{ color: "#8a8a8d" }}>
                {availabilityText(status, locale)}
              </span>
            )}
          </div>
        </Link>
      </div>
    </div>
  );
}
