import Link from "next/link";
import { Product } from "@/lib/products";

export default function ProductCard({ product, locale }: { product: Product; locale: string }) {
  const name = locale === "uk" ? product.nameUk : product.nameEn;

  return (
    <Link href={`/${locale}/products/${product.slug}`} className="product-card block group">
      {/* Stylised dark placeholder */}
      <div
        className="product-card-img aspect-[4/5] border flex flex-col items-center justify-center relative overflow-hidden mb-4"
        style={{ background: "var(--bg-2)", borderColor: "var(--border)" }}
      >
        <span
          className="font-display text-6xl tracking-widest select-none"
          style={{ color: "rgba(255,255,255,0.04)" }}
        >
          TCT
        </span>
        <div className="absolute inset-x-0 bottom-0 p-5 flex flex-col items-center">
          <div
            className="product-card-accent h-px mb-4"
            style={{ width: "2rem", background: "var(--gold)" }}
          />
          <h3
            className="product-card-name text-sm font-medium tracking-wide text-center px-2"
            style={{ color: "var(--text)" }}
          >
            {name}
          </h3>
        </div>
      </div>

      {/* Price row */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs tracking-widest uppercase" style={{ color: "var(--text-faint)" }}>
          {product.category}
        </span>
        <span className="font-display text-lg" style={{ color: "var(--gold)" }}>
          €{product.price.toFixed(2)}
        </span>
      </div>
    </Link>
  );
}
