"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Product } from "@/lib/products";

export default function NikeProductCard({ product, locale }: { product: Product; locale: string }) {
  const router = useRouter();
  const name = product.tileTitle ?? (locale === "uk" ? product.nameUk : product.nameEn);
  const subtitle = locale === "uk" ? product.taglineUk : product.taglineEn;
  const variants = product.variants;
  const multi = !!variants && variants.length > 1;

  const [idx, setIdx] = useState(0);
  const [hovered, setHovered] = useState(false);

  const image = variants ? variants[idx].image : product.gridImage;
  const price = variants ? variants[idx].price ?? product.price : product.price;
  const href = `/${locale}/products/${product.slug}`;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setIdx(0);
      }}
    >
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

      {/* Colour swatches — fade in on hover */}
      {multi && (
        <div
          className="flex gap-2 mt-3 h-5"
          style={{ opacity: hovered ? 1 : 0, transition: "opacity 0.2s ease" }}
        >
          {variants!.map((v, i) => (
            <button
              key={v.name}
              onMouseEnter={() => setIdx(i)}
              onClick={() => router.push(href)}
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

      {/* Text */}
      <Link href={href} className="block mt-2">
        <div className="text-[15px] font-medium leading-snug" style={{ color: "#111111" }}>
          {name}
        </div>
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
  );
}
