"use client";

import Link from "next/link";
import { Product } from "@/lib/products";
import { useState } from "react";

export default function ProductCard({ product, locale }: { product: Product; locale: string }) {
  const name = locale === "uk" ? product.nameUk : product.nameEn;
  const description = locale === "uk" ? product.descriptionUk : product.descriptionEn;
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      href={`/${locale}/products/${product.slug}`}
      className="block group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image area */}
      <div
        className="aspect-square flex items-center justify-center overflow-hidden mb-4 transition-colors"
        style={{ background: hovered ? "var(--bg-dark)" : "var(--bg-subtle)" }}
      >
        <span
          className="font-display text-5xl tracking-widest transition-colors select-none"
          style={{ color: hovered ? "#ffffff15" : "var(--border-light)" }}
        >
          TCT
        </span>
      </div>

      {/* Info */}
      <div>
        <h3
          className="text-sm font-medium tracking-wide mb-1 transition-colors"
          style={{ color: hovered ? "var(--gold)" : "var(--text)" }}
        >
          {name}
        </h3>
        <p className="text-xs leading-relaxed line-clamp-2 mb-2" style={{ color: "var(--text-muted)" }}>
          {description}
        </p>
        <span className="text-sm font-semibold" style={{ color: "var(--gold)" }}>
          €{product.price.toFixed(2)}
        </span>
      </div>
    </Link>
  );
}
