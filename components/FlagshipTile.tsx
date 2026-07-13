"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef } from "react";
import { Product } from "@/lib/products";
import { useCart } from "./CartContext";

export default function FlagshipTile({
  product,
  locale,
  dark,
}: {
  product: Product;
  locale: string;
  dark: boolean;
}) {
  const { addToCart } = useCart();
  const mediaRef = useRef<HTMLDivElement>(null);

  const name = product.tileTitle ?? (locale === "uk" ? product.nameUk : product.nameEn);
  const tagline = locale === "uk" ? product.taglineUk : product.taglineEn;
  const viewLabel = locale === "uk" ? "Переглянути" : "View";
  const buyLabel = locale === "uk" ? "Купити" : "Buy";

  const hasHero = Boolean(product.tileImage);
  const isDark = hasHero ? false : dark;

  const textColor = isDark ? "#f4f3f0" : "var(--text)";
  const subColor = isDark ? "#9a978f" : "var(--text-muted)";
  const scale = product.tileScale ?? 1.3;

  const bleed = Boolean(product.tileBleed);

  return (
    <div
      className={`flagship-tile group relative flex flex-col items-center text-center px-6 pt-12 min-h-[520px] overflow-hidden rounded-[20px] ${bleed ? "pb-0" : "pb-8"}`}
      style={{ background: hasHero ? product.tileBg : isDark ? "var(--ink)" : "var(--sea-salt)" }}
    >
      <h3 className="font-display text-3xl md:text-4xl mb-0.5" style={{ color: textColor }}>
        {name}
      </h3>
      <p className="text-sm mb-4 max-w-xs" style={{ color: subColor }}>
        {tagline}
      </p>
      <div className="flex items-center gap-3 relative z-10">
        <Link
          href={`/${locale}/products/${product.slug}`}
          className="rounded-full px-6 py-2 text-sm font-medium transition-opacity hover:opacity-85"
          style={{ background: "var(--gold-bright)", color: "var(--ink)" }}
        >
          {viewLabel}
        </Link>
        <button
          onClick={() => addToCart(product, mediaRef.current)}
          className="rounded-full px-6 py-2 text-sm font-medium border transition-colors hover:opacity-70"
          style={{ borderColor: "var(--gold-bright)", color: isDark ? "var(--gold-bright)" : "var(--text)" }}
        >
          {buyLabel}
        </button>
      </div>

      {hasHero ? (
        <div ref={mediaRef} className="relative flex-1 w-full mt-3">
          <Image
            src={product.tileImage!}
            alt={name}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className={`flagship-hero object-contain ${bleed ? "object-top origin-top" : "origin-center"}`}
            style={{ ["--tile-scale" as string]: String(scale) }}
          />
        </div>
      ) : (
        <div ref={mediaRef} className="flex-1 w-full flex items-center justify-center mt-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/tct-logo.svg"
            alt=""
            aria-hidden="true"
            className="w-[42%] max-w-[190px]"
            style={{ opacity: isDark ? 0.07 : 0.06, filter: isDark ? "none" : "invert(1)" }}
          />
        </div>
      )}
    </div>
  );
}
