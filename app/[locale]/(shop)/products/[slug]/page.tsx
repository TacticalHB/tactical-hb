import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { products } from "@/lib/products";
import ProductPDP from "@/components/ProductPDP";
import { SITE_NAME, SITE_URL, jsonLdScript, pageMetadata } from "@/lib/seo";

/* ---------------------------------------------------------------------------
   A product page describes itself twice: once for a human sharing the link,
   and once for a crawler building a rich result.

   THE CURRENCY FOLLOWS THE LOCALE, exactly as the page itself does — /uk quotes
   hryvnia and /en quotes euro. Those are two hand-set prices, not one price
   converted (see lib/currency.ts), so the schema reads whichever number the
   visitor is actually shown. Quoting euro on the Ukrainian page would put a
   price in Google's index that the page never displays.
--------------------------------------------------------------------------- */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = products.find((p) => p.slug === slug);
  if (!product) return {};

  const uk = locale === "uk";
  const name = uk ? product.nameUk : product.nameEn;
  /* The PDP's own short line is the sales copy; the longer description is the
     fallback for the products that do not carry one. */
  const description = uk
    ? product.pdp?.shortUk || product.descriptionUk
    : locale === "ja"
      ? product.pdp?.shortJa || product.descriptionJa || product.pdp?.shortEn || product.descriptionEn
      : locale === "ar"
        ? product.pdp?.shortAr || product.descriptionAr || product.pdp?.shortEn || product.descriptionEn
      : product.pdp?.shortEn || product.descriptionEn;

  return pageMetadata({
    locale,
    path: `/products/${slug}`,
    title: name,
    description,
    /* The product's own photograph, not the site card — this is the one place
       a bespoke share image already exists and is obviously the right one. */
    images: [
      {
        url: product.gridImage || product.image,
        alt: `${name} — ${SITE_NAME}`,
      },
    ],
  });
}

export default async function ProductDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const product = products.find((p) => p.slug === slug);
  if (!product) notFound();

  const uk = locale === "uk";
  const name = uk ? product.nameUk : product.nameEn;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description: uk
      ? product.pdp?.shortUk || product.descriptionUk
      : locale === "ja"
        ? product.pdp?.shortJa || product.descriptionJa || product.pdp?.shortEn || product.descriptionEn
      : locale === "ar"
        ? product.pdp?.shortAr || product.descriptionAr || product.pdp?.shortEn || product.descriptionEn
        : product.pdp?.shortEn || product.descriptionEn,
    image: [`${SITE_URL}${product.gridImage || product.image}`],
    sku: product.id,
    brand: { "@type": "Brand", name: SITE_NAME },
    category: product.category,
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/${locale}/products/${slug}`,
      priceCurrency: uk ? "UAH" : "EUR",
      price: uk ? product.priceUah : product.price,
      availability: "https://schema.org/InStock",
      seller: { "@type": "Organization", name: SITE_NAME },
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(jsonLd)} />
      <Suspense>
        <ProductPDP product={product} locale={locale} />
      </Suspense>
    </>
  );
}
