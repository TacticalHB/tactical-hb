import { notFound } from "next/navigation";
import { products } from "@/lib/products";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import ProductGallery from "@/components/ProductGallery";

const ESTD = "2019"; // TODO: confirm real founding year

export default async function ProductDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const product = products.find((p) => p.slug === slug);
  if (!product) notFound();

  const name = locale === "uk" ? product.nameUk : product.nameEn;
  const description = locale === "uk" ? product.descriptionUk : product.descriptionEn;
  const backLabel = locale === "uk" ? "← Назад" : "← Back";
  const enquireLabel = locale === "uk" ? "Зробити запит" : "Make an Enquiry";
  const locatedLabel = locale === "uk" ? "Зроблено в Україні" : "Located in Ukraine";

  // Detail gallery uses the original white-background photos (natural shadow)
  const galleryPhotos = (product.photos ?? []).map((p) => p.replace("-cut.png", ".jpg"));
  const nameWords = name.toUpperCase().split(" ");

  return (
    <div style={{ background: "var(--ink)" }}>
      <div className="max-w-7xl mx-auto px-6 pt-32 pb-20">
        <Link href={`/${locale}/products`} className="inline-block text-xs tracking-[0.2em] uppercase mb-12 transition-colors"
          style={{ color: "#9a978f" }}>
          {backLabel}
        </Link>

        <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-start">
          {/* White tile gallery */}
          <Reveal>
            {galleryPhotos.length > 0 ? (
              <ProductGallery photos={galleryPhotos} name={name} />
            ) : (
              <div className="photo-tile-light aspect-square flex items-center justify-center">
                <span className="font-display text-7xl tracking-widest select-none" style={{ color: "rgba(23,22,15,0.08)" }}>TCT</span>
              </div>
            )}
          </Reveal>

          {/* Info */}
          <Reveal delay={140}>
            <div className="pt-2">
              <div className="flex justify-between items-start gap-6 mb-6">
                <span className="text-xs tracking-[0.35em] uppercase pt-1" style={{ color: "var(--gold-bright)" }}>
                  {product.category}
                </span>
                <div className="text-right shrink-0 text-[0.7rem] tracking-[0.2em] uppercase leading-relaxed">
                  <div style={{ color: "#f4f3f0" }}>EST. {ESTD}</div>
                  <div style={{ color: "#7a766e" }}>{locatedLabel}</div>
                </div>
              </div>

              <h1 className="font-name text-5xl md:text-6xl uppercase mb-8" style={{ color: "#f4f3f0" }}>
                {nameWords.map((w, i) => (
                  <span key={i} className="block">{w}</span>
                ))}
              </h1>

              <div className="font-display text-4xl mb-8" style={{ color: "var(--gold-bright)" }}>
                €{product.price.toFixed(2)}
              </div>

              <p className="text-sm md:text-base leading-relaxed mb-10" style={{ color: "#9a978f" }}>
                {description}
              </p>

              <div className="flex flex-wrap gap-2 mb-12">
                {product.tags.map((tag) => (
                  <span key={tag} className="text-xs tracking-[0.2em] uppercase px-3 py-1.5 border"
                    style={{ color: "#9a978f", borderColor: "var(--border-dark)" }}>
                    {tag}
                  </span>
                ))}
              </div>

              <Link href={`/${locale}/wholesale`} className="btn-gold inline-block font-display text-lg tracking-widest px-12 py-4">
                {enquireLabel}
              </Link>
            </div>
          </Reveal>
        </div>

        {/* Big TCT watermark + gold underline */}
        <Reveal>
          <div className="mt-28 flex flex-col items-center select-none">
            <span className="font-name leading-none" style={{ fontSize: "clamp(6rem,18vw,13rem)", color: "rgba(255,255,255,0.05)" }}>
              TCT
            </span>
            <div style={{ width: "90px", height: "3px", background: "var(--gold-bright)", marginTop: "0.5rem" }} />
          </div>
        </Reveal>
      </div>
    </div>
  );
}
