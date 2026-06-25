import { useTranslations } from "next-intl";
import { getLocale } from "next-intl/server";
import { products } from "@/lib/products";
import ProductCard from "@/components/ProductCard";

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
    <div className="pt-16" style={{ background: "var(--bg)" }}>
      {/* Page header — dark */}
      <div className="relative overflow-hidden py-16 px-6" style={{ background: "var(--bg-dark)" }}>
        <div className="absolute inset-0 flex items-center justify-end pr-12 pointer-events-none overflow-hidden">
          <span className="font-display text-[15vw] leading-none select-none" style={{ color: "#ffffff04" }}>
            PRODUCTS
          </span>
        </div>
        <div className="max-w-7xl mx-auto relative">
          <h1 className="font-display text-5xl md:text-7xl" style={{ color: "#fff" }}>{t("title")}</h1>
          <p className="mt-3 text-sm max-w-md" style={{ color: "#777" }}>{t("subtitle")}</p>
        </div>
      </div>

      {/* Product grid — light */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        {categories.map((cat) => {
          const categoryProducts = products.filter((p) => p.category === cat.key);
          if (categoryProducts.length === 0) return null;
          const catLabel = locale === "uk" ? cat.labelUk : cat.labelEn;

          return (
            <div key={cat.key} className="mb-16">
              <div className="flex items-center gap-4 mb-8">
                <span
                  className="text-xs tracking-[0.3em] uppercase font-medium"
                  style={{ color: "var(--gold)" }}
                >
                  {catLabel}
                </span>
                <div className="flex-1 h-px" style={{ background: "var(--border-light)" }} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                {categoryProducts.map((product) => (
                  <ProductCard key={product.id} product={product} locale={locale} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
