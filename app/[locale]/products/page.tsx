import { useTranslations } from "next-intl";
import { getLocale } from "next-intl/server";
import { products } from "@/lib/products";
import ProductCard from "@/components/ProductCard";
import Reveal from "@/components/Reveal";

export default async function ProductsPage() {
  const locale = await getLocale();
  return <ProductsContent locale={locale} />;
}

function ProductsContent({ locale }: { locale: string }) {
  const t = useTranslations("products");

  const categories = [
    { key: "hmd", labelUk: "Пристрої для нагріву", labelEn: "Heat Management Devices" },
    { key: "bowl", labelUk: "Чаші", labelEn: "Bowls" },
    { key: "accessory", labelUk: "Аксесуари", labelEn: "Accessories" },
  ] as const;

  return (
    <div style={{ background: "var(--bg)" }}>
      <PageHeader title={t("title")} subtitle={t("subtitle")} watermark="PRODUCTS" />

      <div className="max-w-7xl mx-auto px-6 py-20">
        {categories.map((cat) => {
          const categoryProducts = products.filter((p) => p.category === cat.key);
          if (categoryProducts.length === 0) return null;
          const catLabel = locale === "uk" ? cat.labelUk : cat.labelEn;

          return (
            <div key={cat.key} className="mb-20">
              <Reveal>
                <div className="flex items-center gap-5 mb-10">
                  <span className="text-xs tracking-[0.35em] uppercase font-medium" style={{ color: "var(--gold)" }}>
                    {catLabel}
                  </span>
                  <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                </div>
              </Reveal>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 md:gap-8">
                {categoryProducts.map((product, i) => (
                  <Reveal key={product.id} delay={i * 80}>
                    <ProductCard product={product} locale={locale} />
                  </Reveal>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PageHeader({ title, subtitle, watermark }: { title: string; subtitle: string; watermark: string }) {
  return (
    <div className="relative overflow-hidden pt-36 pb-20 px-6" style={{ background: "var(--bg-soft)", borderBottom: "1px solid var(--border)" }}>
      <div className="absolute inset-0 flex items-center justify-end pr-8 pointer-events-none overflow-hidden">
        <span className="font-display text-[16vw] leading-none select-none" style={{ color: "rgba(23,22,15,0.035)" }}>
          {watermark}
        </span>
      </div>
      <div className="max-w-7xl mx-auto relative">
        <Reveal>
          <h1 className="font-display text-6xl md:text-8xl" style={{ color: "var(--text)" }}>{title}</h1>
          <p className="mt-4 text-sm max-w-md" style={{ color: "var(--text-muted)" }}>{subtitle}</p>
        </Reveal>
      </div>
    </div>
  );
}
