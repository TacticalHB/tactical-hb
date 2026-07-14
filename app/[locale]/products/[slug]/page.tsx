import { notFound } from "next/navigation";
import { Suspense } from "react";
import { products } from "@/lib/products";
import ProductPDP from "@/components/ProductPDP";

export default async function ProductDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const product = products.find((p) => p.slug === slug);
  if (!product) notFound();

  return (
    <Suspense>
      <ProductPDP product={product} locale={locale} />
    </Suspense>
  );
}
