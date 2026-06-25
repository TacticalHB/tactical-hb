import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { products } from "@/lib/products";
import Link from "next/link";
import Reveal from "@/components/Reveal";

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const product = products.find((p) => p.slug === slug);
  if (!product) notFound();

  const name = locale === "uk" ? product.nameUk : product.nameEn;
  const description = locale === "uk" ? product.descriptionUk : product.descriptionEn;
  const backLabel = locale === "uk" ? "← Назад" : "← Back";
  const enquireLabel = locale === "uk" ? "Зробити запит" : "Make an Enquiry";

  return (
    <div style={{ background: "var(--bg)" }}>
      <div className="max-w-7xl mx-auto px-6 pt-32 pb-24">
        <Link href={`/${locale}/products`} className="nav-link inline-block text-xs tracking-[0.2em] uppercase mb-14">
          {backLabel}
        </Link>

        <div className="grid md:grid-cols-2 gap-16 items-start">
          <Reveal>
            <div className="aspect-[4/5] relative overflow-hidden flex items-center justify-center border"
              style={{ background: "var(--bg-2)", borderColor: "var(--border)" }}>
              <span className="font-display text-[11rem] leading-none select-none" style={{ color: "rgba(255,255,255,0.03)" }}>TCT</span>
              <div className="absolute top-5 left-5">
                <span className="text-[0.65rem] tracking-[0.3em] uppercase px-3 py-1.5"
                  style={{ background: "var(--gold)", color: "#0a0a0b" }}>
                  {product.category.toUpperCase()}
                </span>
              </div>
            </div>
          </Reveal>

          <Reveal delay={140}>
            <div className="pt-4">
              <h1 className="font-display text-5xl md:text-6xl mb-5" style={{ color: "var(--text)" }}>{name}</h1>
              <div className="font-display text-4xl mb-8" style={{ color: "var(--gold)" }}>€{product.price.toFixed(2)}</div>
              <p className="text-sm md:text-base leading-relaxed mb-10" style={{ color: "var(--text-muted)" }}>{description}</p>
              <div className="flex flex-wrap gap-2 mb-12">
                {product.tags.map((tag) => (
                  <span key={tag} className="text-xs tracking-[0.2em] uppercase px-3 py-1.5 border"
                    style={{ color: "var(--text-faint)", borderColor: "var(--border)" }}>
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
      </div>
    </div>
  );
}

export async function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}
