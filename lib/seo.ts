import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

/* ---------------------------------------------------------------------------
   Everything a page needs to describe itself to a crawler or a link preview.

   WHY THIS EXISTS. Every route shared one title and one description — the pair
   set in app/layout.tsx — so 28 pages presented to Google and to WhatsApp as
   the same page. There was no canonical, no hreflang (except /mr-hb, which was
   written later and did it properly), and no OG image, which is why a link
   pasted into Instagram or WhatsApp rendered as a bare grey box.

   ONE HELPER, NOT 28 HAND-WRITTEN BLOCKS. pageMetadata() takes the locale, the
   locale-less path and the copy, and derives the canonical, both hreflang
   alternates and the OG/Twitter block from them. Hand-writing that per route
   is how a canonical ends up pointing at the wrong locale six months from now.

   THE PATH PASSED IN IS ALWAYS LOCALE-LESS. "/products", not "/en/products" —
   the locale is a separate argument because the alternates need BOTH versions
   of the same page, and a path that already carried one would have to be
   unpicked to get there.

   ROBOTS IS STILL DISALLOW-ALL IN app/robots.ts. None of this is visible to a
   crawler until that flips on launch day; it is written now so that flipping
   one file is all launch day requires.
--------------------------------------------------------------------------- */

export const SITE_NAME = "Tactical HB";

/** No trailing slash, ever — every URL here is built by concatenation. */
export const SITE_URL = (process.env.SITE_URL || "https://tactical-hb.com").replace(/\/$/, "");

export const LOCALES = ["uk", "en", "ja", "ar"] as const;
export type SeoLocale = (typeof LOCALES)[number];

/**
 * The default share image.
 *
 * ONE IMAGE FOR THE WHOLE SITE, deliberately, until there is a reason for
 * more. A per-template set is the right end state, but a single correct
 * branded card beats eight placeholder ones, and product pages already
 * override this with the product's own photograph — which is the one case
 * where a bespoke image genuinely earns its place.
 */
export const OG_IMAGE = {
  url: "/og/tactical-hb.png",
  width: 1200,
  height: 630,
  alt: `${SITE_NAME} — premium hookah accessories, made in Ukraine`,
};

/** Metadata that is true of every page and varies by nothing. */
export const siteMetadata = {
  shared: {
    applicationName: SITE_NAME,
    /* The catalogue is bilingual UK/EN and ships from Kharkiv; naming the
       country here is the honest signal to a crawler about where this is. */
    other: { "geo.region": "UA-63", "geo.placename": "Kharkiv" },
  } satisfies Partial<Metadata>,

  en: {
    description:
      "Premium hookah accessories from Ukraine — heat management devices, bowls and wind covers, engineered with the precision of weaponry.",
  },
  uk: {
    description:
      "Преміальні аксесуари для кальяну з України — пристрої для керування жаром, чаші та ковпаки, зроблені з точністю зброї.",
  },
  ja: {
    description:
      "ウクライナ発のプレミアムシーシャアクセサリー。HMD（ヒートマネジメントデバイス）、ボウル、ウインドカバーを、武器づくりの精度で仕上げています。",
  },
  ar: {
    description:
      "إكسسوارات شيشة فاخرة من أوكرانيا — أجهزة إدارة الحرارة والرؤوس وأغطية الرياح، مصنوعة بدقة صناعة السلاح.",
  },
};

/** Both language versions of one page, plus the x-default a crawler needs. */
/** Facebook's locale codes, which are not the same shape as ours. */
const OG_LOCALE: Record<string, string> = {
  uk: "uk_UA",
  en: "en_GB",
  ja: "ja_JP",
  ar: "ar_AR",
};

export function alternatesFor(path: string) {
  const clean = path === "/" ? "" : path;
  return {
    uk: `${SITE_URL}/uk${clean}`,
    en: `${SITE_URL}/en${clean}`,
    ja: `${SITE_URL}/ja${clean}`,
    ar: `${SITE_URL}/ar${clean}`,
    /* x-default points at Ukrainian: this is a Ukrainian brand shipping
       domestically first, so an unmatched language should land there rather
       than on either export-facing page. */
    "x-default": `${SITE_URL}/uk${clean}`,
  };
}

export type PageMetadataInput = {
  locale: string;
  /** Locale-less, leading slash, no trailing slash. "" or "/" for home. */
  path: string;
  title: string;
  description: string;
  /** Product photography and the like. Falls back to the site card. */
  images?: { url: string; width?: number; height?: number; alt?: string }[];
  /** Set for pages that must never be indexed even after robots opens up. */
  noindex?: boolean;
};

export function pageMetadata({
  locale,
  path,
  title,
  description,
  images,
  noindex,
}: PageMetadataInput): Metadata {
  const clean = path === "/" ? "" : path;
  const canonical = `${SITE_URL}/${locale}${clean}`;

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: alternatesFor(clean),
    },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      /* OG carries the FULL title including the brand. The metadata template
         only decorates the <title> tag; a share card that said just "Products"
         would be useless in a chat thread. */
      title: `${title} · ${SITE_NAME}`,
      description,
      url: canonical,
      /* One per storefront. This used to be a two-way ternary, so a Japanese
         or Arabic share card announced itself as en_GB. */
      locale: OG_LOCALE[locale] ?? "en_GB",
      images: images ?? [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} · ${SITE_NAME}`,
      description,
      images: (images ?? [OG_IMAGE]).map((i) => i.url),
    },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

/**
 * The one-liner every static shop route uses.
 *
 * SERVER-ONLY — it reads the message catalogue through next-intl's server API,
 * so it belongs in generateMetadata and nowhere else. `key` names a pair in the
 * `seo` namespace: "products" reads seo.products_title and seo.products_desc,
 * which keeps the copy bilingual and in the same file as the rest of the site's
 * words rather than hard-coded in eleven page components.
 */
export async function metadataFor({
  locale,
  path,
  key,
  images,
  noindex,
}: {
  locale: string;
  path: string;
  key: string;
  images?: PageMetadataInput["images"];
  noindex?: boolean;
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "seo" });
  return pageMetadata({
    locale,
    path,
    title: t(`${key}_title`),
    description: t(`${key}_desc`),
    images,
    noindex,
  });
}

/* ---------------------------------------------------------------------------
   JSON-LD.

   RENDERED AS A <script> IN THE PAGE, which is what the Next docs recommend
   over any metadata field. The one hazard is that JSON.stringify does not
   escape "<", so a product name containing a tag would close the script early
   — jsonLdScript() does that escaping in the single place every caller goes
   through, rather than trusting each of them to remember.
--------------------------------------------------------------------------- */

export function jsonLdScript(data: unknown): { __html: string } {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}

export function organizationJsonLd(locale: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: `${SITE_URL}/${locale}`,
    logo: `${SITE_URL}/tct-logo.svg`,
    description:
      locale === "uk"
        ? siteMetadata.uk.description
        : locale === "ja"
          ? siteMetadata.ja.description
          : locale === "ar"
            ? siteMetadata.ar.description
            : siteMetadata.en.description,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Kharkiv",
      addressCountry: "UA",
    },
  };
}
