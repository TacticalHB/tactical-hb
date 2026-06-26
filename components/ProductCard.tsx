import Link from "next/link";
import Image from "next/image";
import { Product } from "@/lib/products";

export default function ProductCard({ product, locale }: { product: Product; locale: string }) {
  const name = locale === "uk" ? product.nameUk : product.nameEn;
  const hasPhoto = product.photos && product.photos.length > 0;

  return (
    <Link href={`/${locale}/products/${product.slug}`} className="product-card block group">
      {hasPhoto ? (
        /* Real photo — zoom on hover */
        <div className="aspect-[4/5] relative overflow-hidden mb-4" style={{ background: "#ffffff", border: "1px solid var(--border)" }}>
          <Image
            src={product.photos![0]}
            alt={name}
            fill
            sizes="(max-width: 1024px) 50vw, 25vw"
            className="product-photo object-contain p-2"
          />
        </div>
      ) : (
        /* Stylised placeholder — flips dark on hover */
        <div className="product-card-img aspect-[4/5] flex flex-col items-center justify-center relative overflow-hidden mb-4">
          <span className="product-card-watermark font-display text-6xl tracking-widest select-none">TCT</span>
          <div className="product-card-accent h-px absolute bottom-6" style={{ background: "var(--gold)" }} />
        </div>
      )}

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
