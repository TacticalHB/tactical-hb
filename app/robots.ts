import type { MetadataRoute } from "next";
import { SITE_URL, LOCALES } from "@/lib/seo";

/**
 * What a crawler may fetch.
 *
 * IMPORTANT: robots.txt is a polite request, not access control. Google and
 * Bing honour it; scrapers ignore it entirely. Never treat it as security —
 * every private path below is guarded server-side as well, and that is what
 * actually protects it.
 *
 * ── OPEN, AS OF 30 AUGUST 2026 ────────────────────────────────────────────
 * This file served `Disallow: /` from launch until today, which forbade every
 * crawler from every path. That was correct while the shop was behind a
 * password wall and wrong the moment it went live: a sitemap, per-page titles,
 * canonicals, hreflang across four storefronts and Product schema were all
 * being generated and none of it could be read. The brand name itself did not
 * return the catalogue.
 *
 * SEARCH_LAUNCHED IS KEPT AS A SWITCH, and it is a loaded one. Setting it back
 * to false does not "pause" indexing — it asks Google to stop crawling, and
 * pages it can no longer fetch drop out of the index over the following weeks.
 * Recovering from that costs months. If a single page must be pulled, give
 * that page `noindex` (see the layouts under (shop)) rather than closing the
 * whole site.
 */
const SEARCH_LAUNCHED = true;

/**
 * Never indexed, before or after launch, on every storefront.
 *
 * LOCALE-PREFIXED AND GENERATED, NOT TYPED. The hand-written list this
 * replaces named /uk and /en only — it was written when those were the only
 * two storefronts and never grew when Japanese and Arabic shipped. Opening
 * the site with it would have left /ja/admin, /ar/checkout and /ja/account
 * crawlable while their Ukrainian and English twins were protected: a
 * disallow list that is a copy of the locale list is a disallow list that
 * silently stops covering half the site.
 *
 * These are PREFIXES to Google, so /uk/checkout covers /checkout/success and
 * /checkout/confirmation without naming them.
 */
const PRIVATE_SEGMENTS = [
  "/admin",
  "/account",
  "/checkout",
  "/cart",
  "/login",
  "/register",
  "/newsletter/preferences",
  /* The trade catalogue and the application form. /wholesale itself is the
     public enquiry page and stays crawlable — it is the one that should rank;
     these two are behind a sign-in and a form respectively, and both already
     carry noindex of their own. */
  "/wholesale/portal",
  "/wholesale/register",
];

const PRIVATE_PATHS = [
  "/api/",
  "/unlock",
  ...LOCALES.flatMap((locale) => PRIVATE_SEGMENTS.map((path) => `/${locale}${path}`)),
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: SEARCH_LAUNCHED
      ? { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS }
      : { userAgent: "*", disallow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
