import Link from "next/link";
import Image from "next/image";
import { Product } from "@/lib/products";

export default function ProductCard({ product, locale }: { product: Product; locale: string }) {
  const name = locale === "uk" ? product.nameUk : product.nameEn;
  const hasPhoto = product.photos && product.photos.length > 0;

  return (
    <Link href={`/${locale}/products/${product.slug}`} className="product-card block group">
      {/* Charcoal image tile */}
      <div className="smoke-bg aspect-[4/5] relative overflow-hidden mb-4 flex items-center justify-center">
        {/* soft spotlight glow */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(212,177,94,0.10) 0%, transparent 65%)" }} />

        {hasPhoto ? (
          <Image
            src={product.photos![0]}
            alt={name}
            fill
            sizes="(max-width: 1024px) 50vw, 25vw"
            className="product-photo object-contain p-6"
          />
        ) : (
          <>
            <span className="product-card-watermark font-display text-6xl tracking-widest select-none"
              style={{ color: "rgba(255,255,255,0.05)" }}>TCT</span>
            <div className="product-card-accent h-px absolute bottom-6" style={{ background: "var(--gold-bright)" }} />
          </>
        )}
      </div>

      {/* Name + price */}
      <h3 className="text-sm font-medium tracking-wide mb-1 transition-colors group-hover:text-[color:var(--gold)]"
        style={{ color: "var(--text)" }}>
        {name}
      </h3>
      <div className="flex items-center justify-between">
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
