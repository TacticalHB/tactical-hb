import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { products } from "@/lib/products";
import Link from "next/link";

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
    <div className="pt-16" style={{ background: "var(--bg)" }}>
      <div className="max-w-7xl mx-auto px-6 py-16">
        <Link href={`/${locale}/products`} className="back-link inline-block text-xs tracking-widest uppercase mb-12">
          {backLabel}
        </Link>
        <div className="grid md:grid-cols-2 gap-16 items-start">
          <div className="aspect-square relative overflow-hidden flex items-center justify-center"
            style={{ background: "var(--bg-dark)" }}>
            <span className="font-display text-[10rem] leading-none select-none" style={{ color: "#ffffff06" }}>TCT</span>
            <div className="absolute top-4 left-4">
              <span className="text-xs tracking-widest uppercase px-2 py-1"
                style={{ background: "var(--gold)", color: "#fff" }}>
                {product.category.toUpperCase()}
              </span>
            </div>
          </div>
          <div className="pt-4">
            <h1 className="font-display text-4xl md:text-5xl mb-4" style={{ color: "var(--text)" }}>{name}</h1>
            <div className="font-display text-4xl mb-6" style={{ color: "var(--gold)" }}>€{product.price.toFixed(2)}</div>
            <p className="text-sm leading-relaxed mb-8" style={{ color: "var(--text-muted)" }}>{description}</p>
            <div className="flex flex-wrap gap-2 mb-10">
              {product.tags.map((tag) => (
                <span key={tag} className="text-xs tracking-widest uppercase px-3 py-1.5 border"
                  style={{ color: "var(--text-muted)", borderColor: "var(--border-light)" }}>
                  {tag}
                </span>
              ))}
            </div>
            <Link href={`/${locale}/wholesale`} className="btn-dark inline-block font-display text-base tracking-widest px-10 py-4">
              {enquireLabel}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export async function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}
