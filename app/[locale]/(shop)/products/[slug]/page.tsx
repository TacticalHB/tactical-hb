import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { products } from "@/lib/products";
import ProductPDP from "@/components/ProductPDP";
import { SITE_NAME, SITE_URL, jsonLdScript, pageMetadata, productKind } from "@/lib/seo";

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

  /* THE TITLE SAYS WHAT THE THING IS. "HMD A.Craft · Tactical HB" only means
     something to somebody who already knows the brand; a person searching for
     a heat management device cannot recognise it. The descriptor comes from
     the category and is empty for the withheld listing, which keeps a bare
     name on purpose — see productKind(). The brand is appended by the title
     template in app/layout.tsx, so it is not repeated here. */
  const kind = productKind(product.category, locale);

  /* An unphotographed product falls back to the site card rather than passing
     an empty url — `images: [{ url: "" }]` renders og:image as the bare
     origin, which every scraper drops, and the page ends up with no card at
     all instead of the generic one. */
  const photo = product.gridImage || product.image;

  return pageMetadata({
    locale,
    path: `/products/${slug}`,
    title: kind ? `${name} — ${kind}` : name,
    description,
    /* The product's own photograph, not the site card — this is the one place
       a bespoke share image already exists and is obviously the right one. */
    images: photo ? [{ url: photo, alt: `${name} — ${SITE_NAME}` }] : undefined,
  });
}

export default async function ProductDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const product = products.find((p) => p.slug === slug);
  if (!product) notFound();

  const uk = locale === "uk";
  const name = uk ? product.nameUk : product.nameEn;
  const photo = product.gridImage || product.image;

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
    /* NO image KEY RATHER THAN AN EMPTY ONE. `${SITE_URL}${""}` is
       "https://tactical-hb.com", which is not an image and invalidates the
       whole Product node for a rich result. Omitted until the photographs
       exist — app/sitemap.ts had the same bug and is fixed the same way. */
    ...(photo ? { image: [`${SITE_URL}${photo}`] } : {}),
    sku: product.id,
    brand: { "@type": "Brand", name: SITE_NAME },
    /* THE WITHHELD LISTING DOES NOT DECLARE ITS CATEGORY EITHER. It is
       "hookah" — the word deliberately kept off the page, the flagship file
       and the spec sheet. Structured data is read by machines and reprinted
       in results; leaving it here would leak the secret through the one
       channel nobody thinks to check. */
    ...(product.incoming ? {} : { category: product.category }),
    /* NO OFFER ON A LISTING THAT CANNOT BE BOUGHT. The withheld piece is
       priced at zero because it has no price, and lib/pricing refuses to sell
       it however the request is made — so an Offer here would advertise a
       free product to Google and invite a rich result promising it. A Product
       node with no offers is valid and honest: the page exists, the thing is
       not for sale. */
    ...(product.incoming
      ? {}
      : {
          offers: {
            "@type": "Offer",
            url: `${SITE_URL}/${locale}/products/${slug}`,
            /* Ukrainian storefront sells in hryvnia, the three export ones in
               euro — the same rule lib/currency applies, not a guess. */
            priceCurrency: uk ? "UAH" : "EUR",
            price: uk ? product.priceUah : product.price,
            availability: "https://schema.org/InStock",
            seller: { "@type": "Organization", name: SITE_NAME },
          },
        }),
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
