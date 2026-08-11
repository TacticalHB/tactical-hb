import type { MetadataRoute } from "next";
import { products } from "@/lib/products";
import { SITE_URL, alternatesFor } from "@/lib/seo";

/* ---------------------------------------------------------------------------
   The sitemap.

   EVERY ENTRY CARRIES BOTH LANGUAGES. A bilingual site that lists only one
   version of each page is asking Google to pick a winner and drop the other,
   which for this catalogue would mean either the Ukrainian or the English
   storefront quietly failing to rank at all. alternatesFor() builds the same
   hreflang set the pages themselves declare, from the same helper, so the two
   cannot disagree.

   ONE URL PER PAGE, NOT ONE PER LOCALE. The canonical listed is the Ukrainian
   one, with English as its alternate — listing both as top-level entries would
   describe sixteen pages where there are eight.

   WHAT IS DELIBERATELY ABSENT: /cart, /checkout, /account, /login, /register
   and /newsletter/preferences. They are transactional or private, they have
   nothing a search result could usefully show, and half of them are unique to
   one signed-in person. /admin is absent for the same reason plus a better
   one. A sitemap is a list of pages worth finding, not an inventory.

   ROBOTS STILL SAYS DISALLOW. This file is inert until app/robots.ts opens up
   on launch day — at which point it should also start advertising this sitemap.
--------------------------------------------------------------------------- */

/** Locale-less paths, in rough order of how much they matter. */
const STATIC_PATHS = [
  { path: "/", priority: 1.0, changeFrequency: "weekly" as const },
  { path: "/products", priority: 0.9, changeFrequency: "weekly" as const },
  /* The flagship file. High priority and a daily frequency until release:
     it is the page the whole teaser campaign points at, and the countdown on
     it changes every time it is fetched. */
  { path: "/flagship", priority: 0.9, changeFrequency: "daily" as const },
  { path: "/setup", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/wholesale", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/about", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/mr-hb", priority: 0.6, changeFrequency: "monthly" as const },
  { path: "/contact", priority: 0.6, changeFrequency: "yearly" as const },
  { path: "/delivery", priority: 0.5, changeFrequency: "yearly" as const },
  { path: "/newsletter", priority: 0.4, changeFrequency: "yearly" as const },
  { path: "/offer", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const staticEntries = STATIC_PATHS.map(({ path, priority, changeFrequency }) => ({
    url: `${SITE_URL}/uk${path === "/" ? "" : path}`,
    lastModified,
    changeFrequency,
    priority,
    alternates: { languages: alternatesFor(path) },
  }));

  /* Products come from the catalogue rather than a hand-kept list, so a new
     SKU appears in the sitemap the moment it appears in lib/products.ts. */
  const productEntries = products.map((p) => ({
    url: `${SITE_URL}/uk/products/${p.slug}`,
    lastModified,
    changeFrequency: "weekly" as const,
    priority: 0.8,
    alternates: { languages: alternatesFor(`/products/${p.slug}`) },
    images: [`${SITE_URL}${p.gridImage || p.image}`],
  }));

  return [...staticEntries, ...productEntries];
}
