import Link from "next/link";
import Image from "next/image";
import { Product } from "@/lib/products";

const ESTD = "2019"; // TODO: confirm real founding year

export default function ProductCard({ product, locale }: { product: Product; locale: string }) {
  const name = locale === "uk" ? product.nameUk : product.nameEn;
  const nameWords = name.toUpperCase().split(" ");
  const located = locale === "uk" ? "Україна" : "Ukraine";

  // Cards use the original white-background photo (natural shadow) on the white tile
  const photo = product.photos && product.photos.length > 0
    ? product.photos[0].replace("-cut.png", ".jpg")
    : null;

  return (
    <Link href={`/${locale}/products/${product.slug}`} className="product-card block group">
      {/* White rounded tile */}
      <div className="photo-tile-light aspect-square relative overflow-hidden mb-5 flex items-center justify-center">
        {photo ? (
          <Image
            src={photo}
            alt={name}
            fill
            sizes="(max-width: 1024px) 50vw, 33vw"
            className="product-photo object-contain p-5"
          />
        ) : (
          <span className="font-display text-6xl tracking-widest select-none" style={{ color: "rgba(23,22,15,0.08)" }}>
            TCT
          </span>
        )}
      </div>

      {/* Name + price/meta */}
      <div className="flex justify-between items-start gap-3 mb-5">
        <h3 className="font-name text-xl md:text-2xl uppercase" style={{ color: "#f4f3f0" }}>
          {nameWords.map((w, i) => (
            <span key={i} className="block">{w}</span>
          ))}
        </h3>
        <div className="text-right shrink-0">
          <div className="font-display text-lg" style={{ color: "var(--gold-bright)" }}>€{product.price.toFixed(2)}</div>
          <div className="text-[0.55rem] tracking-[0.18em] uppercase mt-2" style={{ color: "#f4f3f0" }}>EST. {ESTD}</div>
          <div className="text-[0.55rem] tracking-[0.18em] uppercase" style={{ color: "#6a665e" }}>{located}</div>
        </div>
      </div>

      {/* TCT watermark + gold underline */}
      <div className="flex flex-col items-center">
        <span className="font-name leading-none select-none" style={{ fontSize: "2.75rem", color: "rgba(255,255,255,0.05)" }}>
          TCT
        </span>
        <div style={{ width: "44px", height: "2px", background: "var(--gold-bright)", marginTop: "6px" }} />
      </div>
    </Link>
  );
}
