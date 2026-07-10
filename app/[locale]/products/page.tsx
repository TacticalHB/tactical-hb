import { getLocale } from "next-intl/server";
import ProductsBrowser from "@/components/ProductsBrowser";

export default async function ProductsPage() {
  const locale = await getLocale();
  return <ProductsBrowser locale={locale} />;
}
