import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/**
 * Keep the site out of search results while it's still being finished.
 *
 * IMPORTANT: robots.txt is a polite request, not access control. Google and
 * Bing honour it; scrapers ignore it entirely. Never treat it as security.
 *
 * ── GOING LIVE IN SEARCH IS NOW ONE LINE ──────────────────────────────────
 * Flip SEARCH_LAUNCHED to true. Everything else is already in place: per-page
 * titles and descriptions, canonicals, hreflang for both locales, OG cards,
 * Product and Organization schema, and app/sitemap.ts. The sitemap is
 * advertised either way, because pointing at it costs nothing while closed and
 * is one less thing to remember on the day.
 *
 * Do it when the flagship PDP behind the countdown exists — an indexed site
 * whose most-linked page is a countdown to nothing spends its first
 * impressions badly. Then submit both locales in Search Console and Bing.
 *
 * The private surfaces stay disallowed AFTER launch, which is why they are
 * listed separately rather than swept up by the site-wide rule: /admin is the
 * internal OS, and the rest are transactional or belong to one signed-in
 * person. None of them should ever appear in a result.
 */
const SEARCH_LAUNCHED = false;

/** Never indexed, before or after launch. Mirrors what app/sitemap.ts omits. */
const PRIVATE_PATHS = [
  "/api/",
  "/unlock",
  "/uk/admin",
  "/en/admin",
  "/uk/account",
  "/en/account",
  "/uk/checkout",
  "/en/checkout",
  "/uk/cart",
  "/en/cart",
  "/uk/login",
  "/en/login",
  "/uk/register",
  "/en/register",
  "/uk/newsletter/preferences",
  "/en/newsletter/preferences",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: SEARCH_LAUNCHED
      ? { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS }
      : { userAgent: "*", disallow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
