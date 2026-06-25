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
      <section className="relative overflow-hidden min-h-[90vh] flex items-center" style={{ background: "var(--bg-dark)" }}>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
          <span className="font-display text-[20vw] leading-none whitespace-nowrap" style={{ color: "#ffffff06" }}>
            TACTICAL
          </span>
        </div>
        <div className="relative max-w-7xl mx-auto px-6 py-24 w-full">
          <div className="max-w-2xl">
            <span className="inline-block text-xs tracking-[0.35em] uppercase mb-6 px-3 py-1.5 border"
              style={{ color: "var(--gold)", borderColor: "var(--gold)", opacity: 0.8 }}>
              {t("hero_tag")}
            </span>
            <h1 className="font-display text-[clamp(3.5rem,9vw,8rem)] leading-none mb-6 whitespace-pre-line" style={{ color: "#fff" }}>
              {t("hero_title")}
            </h1>
            <p className="text-base md:text-lg leading-relaxed mb-10 max-w-lg" style={{ color: "#888" }}>
              {t("hero_subtitle")}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href={`/${locale}/products`} className="btn-dark font-display text-base tracking-widest px-8 py-4">
                {t("cta_products")}
              </Link>
              <Link href={`/${locale}/wholesale`} className="btn-hero-outline font-display text-base tracking-widest px-8 py-4 border">
                {t("cta_wholesale")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ background: "var(--bg-dark-2)", borderBottom: "1px solid var(--border-dark)" }}>
        <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-3 gap-8 text-center">
          {[
            { value: "33", label: t("stats_clients") },
            { value: "5+", label: t("stats_countries") },
            { value: "35%", label: t("stats_margin") },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="font-display text-4xl md:text-5xl" style={{ color: "var(--gold)" }}>{stat.value}</div>
              <div className="text-xs tracking-widest uppercase mt-1" style={{ color: "#555" }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured products */}
      <section className="py-20 px-6" style={{ background: "var(--bg)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <h2 className="font-display text-4xl md:text-5xl" style={{ color: "var(--text)" }}>
              {t("featured_title")}
            </h2>
            <Link href={`/${locale}/products`} className="text-link-gold text-xs tracking-widest uppercase border-b pb-0.5 hidden md:block">
              {t("cta_products")} →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} locale={locale} />
            ))}
          </div>
        </div>
      </section>

      {/* About strip */}
      <section className="py-20 px-6" style={{ background: "var(--bg-subtle)", borderTop: "1px solid var(--border-light)" }}>
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-xs tracking-[0.3em] uppercase block mb-4" style={{ color: "var(--gold)" }}>
              {t("about_tag")}
            </span>
            <h2 className="font-display text-4xl md:text-5xl mb-6" style={{ color: "var(--text)" }}>
              {t("about_title")}
            </h2>
            <p className="leading-relaxed mb-8 text-sm" style={{ color: "var(--text-muted)" }}>
              {t("about_text")}
            </p>
            <Link href={`/${locale}/about`} className="text-link-gold text-xs tracking-widest uppercase border-b pb-0.5">
              {t("about_cta")} →
            </Link>
          </div>
          <div className="aspect-square relative overflow-hidden flex items-center justify-center"
            style={{ background: "var(--bg-dark)" }}>
            <span className="font-display text-[8rem] leading-none select-none" style={{ color: "#ffffff06" }}>TCT</span>
            <div className="absolute bottom-8 left-8">
              <div className="text-xs tracking-widest uppercase mb-1" style={{ color: "var(--gold)" }}>Ukraine</div>
              <div className="font-display text-2xl" style={{ color: "#fff" }}>Since 2022</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA banner */}
      <section className="py-16 px-6" style={{ background: "var(--bg-dark)" }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <h2 className="font-display text-3xl md:text-4xl" style={{ color: "#fff" }}>
            {t("cta_wholesale")}
          </h2>
          <Link href={`/${locale}/wholesale`} className="btn-gold-outline font-display text-base tracking-widest px-8 py-4 border whitespace-nowrap">
            {t("cta_wholesale")} →
          </Link>
        </div>
      </section>
    </div>
  );
}
