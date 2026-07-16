import type { MetadataRoute } from "next";

/**
 * Keep the site out of search results while it's still being finished
 * (HMD TCT OP has no photos yet). The site itself is publicly reachable now
 * that the password gate is off — this only asks crawlers to stay away.
 *
 * IMPORTANT: robots.txt is a polite request, not access control. Google and
 * Bing honour it; scrapers ignore it entirely. Never treat it as security.
 *
 * To go live in search: swap `disallow` for `allow: "/"` and add a sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
