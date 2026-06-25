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
    <div className="pt-16">
      <div className="max-w-7xl mx-auto px-6 py-20">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">{t("title")}</h1>
        <p className="text-[#888] text-lg mb-16 max-w-xl">{t("subtitle")}</p>

        {categories.map((cat) => {
          const categoryProducts = products.filter((p) => p.category === cat.key);
          if (categoryProducts.length === 0) return null;
          const catLabel = locale === "uk" ? cat.labelUk : cat.labelEn;

          return (
            <div key={cat.key} className="mb-16">
              <h2 className="text-xs tracking-[0.3em] uppercase text-[#c9a84c] mb-6 border-b border-[#1a1a1a] pb-3">
                {catLabel}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
