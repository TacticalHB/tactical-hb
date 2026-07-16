"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Product } from "@/lib/products";
import HeartButton from "./HeartButton";

export default function NikeProductCard({ product, locale }: { product: Product; locale: string }) {
  const router = useRouter();
  const name = product.tileTitle ?? (locale === "uk" ? product.nameUk : product.nameEn);
  const subtitle = locale === "uk" ? product.taglineUk : product.taglineEn;
  const variants = product.variants;
  const multi = !!variants && variants.length > 1;

  const [idx, setIdx] = useState(0);

  const image = variants ? variants[idx].image : product.gridImage;
  const price = variants ? variants[idx].price ?? product.price : product.price;
  const href = `/${locale}/products/${product.slug}`;

  return (
    <div onMouseLeave={() => setIdx(0)} className="relative">
      {/* Heart — sits above the image link so it toggles instead of navigating */}
      <HeartButton
        productId={product.slug}
        className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full backdrop-blur-sm"
        label={`Favourite ${name}`}
      />
      {/* Image */}
      <Link href={href} className="block group">
        <div className="relative aspect-square overflow-hidden rounded-[20px]" style={{ background: "#f5f5f5" }}>
          {image ? (
            <Image
              src={image}
              alt={name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-contain p-10 transition-transform duration-500 ease-out group-hover:scale-[1.05]"
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
          {multi && (
            <div className="flex gap-2 shrink-0 pt-0.5">
              {variants!.map((v, i) => (
                <button
                  key={v.name}
                  onMouseEnter={() => setIdx(i)}
                  onClick={() => router.push(`${href}?variant=${encodeURIComponent(v.name)}`)}
                  aria-label={v.name}
                  className="w-5 h-5 rounded-full transition-transform hover:scale-110"
                  style={{
                    background: v.swatch,
                    boxShadow: i === idx ? "0 0 0 1.5px #111, 0 0 0 3px #fff inset" : "0 0 0 1px #d6d6d6",
                  }}
                />
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
          <div className="text-[15px] font-medium mt-1.5" style={{ color: "#111111" }}>
            €{price.toFixed(2)}
          </div>
        </Link>
      </div>
    </div>
  );
}
