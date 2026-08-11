import type { Metadata } from "next";
import { metadataFor } from "@/lib/seo";
import { getLocale } from "next-intl/server";
import ProductsBrowser from "@/components/ProductsBrowser";


export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return metadataFor({ locale, path: "/products", key: "products" });
}

export default async function ProductsPage() {
  const locale = await getLocale();
  return <ProductsBrowser locale={locale} />;
}
