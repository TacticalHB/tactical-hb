import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { products } from "@/lib/products";
import Link from "next/link";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = await getLocale();
  const product = products.find((p) => p.slug === slug);

  if (!product) notFound();

  const name = locale === "uk" ? product.nameUk : product.nameEn;
  const description = locale === "uk" ? product.descriptionUk : product.descriptionEn;
  const backLabel = locale === "uk" ? "← Назад до продуктів" : "← Back to Products";
  const enquireLabel = locale === "uk" ? "Зробити запит" : "Make an Enquiry";
  const tagsLabel = locale === "uk" ? "Теги" : "Tags";

  return (
    <div className="pt-16">
      <div className="max-w-7xl mx-auto px-6 py-20">
        <Link
          href={`/${locale}/products`}
          className="text-xs text-[#555] hover:text-[#c9a84c] tracking-wider uppercase mb-10 inline-block transition-colors"
        >
          {backLabel}
        </Link>
        <div className="grid md:grid-cols-2 gap-16">
          <div className="aspect-square bg-[#0d0d0d] border border-[#1a1a1a] flex items-center justify-center">
            <span className="text-[#1e1e1e] text-7xl font-bold tracking-widest">TCT</span>
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">{name}</h1>
            <p className="text-[#888] leading-relaxed mb-8">{description}</p>
            <div className="text-3xl font-bold text-[#c9a84c] mb-8">€{product.price.toFixed(2)}</div>
            <div className="flex flex-wrap gap-2 mb-8">
              {product.tags.map((tag) => (
                <span key={tag} className="text-xs text-[#555] border border-[#1a1a1a] px-3 py-1 tracking-wider">
                  {tag}
                </span>
              ))}
            </div>
            <Link
              href={`/${locale}/wholesale`}
              className="inline-block bg-[#c9a84c] text-black font-semibold px-8 py-4 text-sm tracking-widest uppercase hover:bg-[#e8c97a] transition-colors text-center"
            >
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
