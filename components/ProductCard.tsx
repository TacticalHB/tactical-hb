import Link from "next/link";
import { Product } from "@/lib/products";

export default function ProductCard({ product, locale }: { product: Product; locale: string }) {
  const name = locale === "uk" ? product.nameUk : product.nameEn;
  const description = locale === "uk" ? product.descriptionUk : product.descriptionEn;

  return (
    <Link
      href={`/${locale}/products/${product.slug}`}
      className="group block border border-[#1a1a1a] hover:border-[#c9a84c]/40 transition-colors bg-[#0d0d0d]"
    >
      <div className="aspect-square bg-[#111] flex items-center justify-center overflow-hidden">
        <span className="text-[#1e1e1e] text-4xl font-bold tracking-widest group-hover:text-[#252525] transition-colors">
          TCT
        </span>
      </div>
      <div className="p-5">
        <h3 className="font-semibold text-sm tracking-wide mb-1 group-hover:text-[#c9a84c] transition-colors">
          {name}
        </h3>
        <p className="text-xs text-[#555] leading-relaxed line-clamp-2 mb-3">{description}</p>
        <span className="text-[#c9a84c] font-bold text-sm">
          €{product.price.toFixed(2)}
        </span>
      </div>
    </Link>
  );
}
