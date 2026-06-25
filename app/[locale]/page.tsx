import { useTranslations } from "next-intl";
import Link from "next/link";
import { getLocale } from "next-intl/server";
import { featuredProducts } from "@/lib/products";
import ProductCard from "@/components/ProductCard";

export default async function HomePage() {
  const locale = await getLocale();
  return <HomeContent locale={locale} />;
}

function HomeContent({ locale }: { locale: string }) {
  const t = useTranslations("home");

  return (
    <div className="pt-16">
      {/* Hero */}
      <section className="min-h-screen flex items-center justify-center relative overflow-hidden px-6">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "radial-gradient(ellipse at center, #c9a84c 0%, transparent 70%)",
          }}
        />
        <div className="relative text-center max-w-3xl mx-auto">
          <span className="inline-block text-[#c9a84c] text-xs tracking-[0.3em] uppercase mb-6 border border-[#c9a84c]/30 px-4 py-1.5">
            {t("hero_tag")}
          </span>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight mb-6 whitespace-pre-line">
            {t("hero_title")}
          </h1>
          <p className="text-[#888] text-lg md:text-xl leading-relaxed mb-10 max-w-xl mx-auto">
            {t("hero_subtitle")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={`/${locale}/products`}
              className="bg-[#c9a84c] text-black font-semibold px-8 py-4 text-sm tracking-widest uppercase hover:bg-[#e8c97a] transition-colors"
            >
              {t("cta_products")}
            </Link>
            <Link
              href={`/${locale}/wholesale`}
              className="border border-[#2a2a2a] text-[#999] font-semibold px-8 py-4 text-sm tracking-widest uppercase hover:border-[#c9a84c] hover:text-[#c9a84c] transition-colors"
            >
              {t("cta_wholesale")}
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-[#1a1a1a] py-12 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-3 gap-8 text-center">
          {[
            { value: "33", label: t("stats_clients") },
            { value: "5+", label: t("stats_countries") },
            { value: "35%", label: t("stats_margin") },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-3xl md:text-5xl font-bold text-[#c9a84c]">{stat.value}</div>
              <div className="text-xs md:text-sm text-[#666] tracking-wider uppercase mt-2">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured products */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-12">{t("featured_title")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} locale={locale} />
            ))}
          </div>
        </div>
      </section>

      {/* About strip */}
      <section className="py-24 px-6 bg-[#0d0d0d] border-y border-[#1a1a1a]">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-[#c9a84c] text-xs tracking-[0.3em] uppercase block mb-4">
              {t("about_tag")}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
              {t("about_title")}
            </h2>
            <p className="text-[#888] leading-relaxed mb-8">{t("about_text")}</p>
            <Link
              href={`/${locale}/about`}
              className="text-[#c9a84c] text-sm tracking-widest uppercase border-b border-[#c9a84c]/30 pb-0.5 hover:border-[#c9a84c] transition-colors"
            >
              {t("about_cta")} →
            </Link>
          </div>
          <div className="aspect-square bg-[#111] border border-[#1a1a1a] flex items-center justify-center">
            <span className="text-[#222] text-6xl font-bold tracking-widest">TCT</span>
          </div>
        </div>
      </section>
    </div>
  );
}
