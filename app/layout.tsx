import type { Metadata } from "next";
import { localeDir } from "@/i18n/routing";
import { Bebas_Neue, Inter } from "next/font/google";
import { getLocale } from "next-intl/server";
import { SITE_NAME, SITE_URL, siteMetadata } from "@/lib/seo";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const bebasNeue = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--font-bebas" });

/* ---------------------------------------------------------------------------
   The document shell.

   metadataBase IS THE ONE THING THAT MAKES RELATIVE OG PATHS LEGAL. Without
   it, any page setting `openGraph.images: "/og/..."` is a build error rather
   than a shrug, so it belongs here at the root where every route inherits it.

   The title/description here are only the fallback for routes that set
   nothing — /unlock, and anything new before it gets its own. Every shop route
   now declares its own through lib/seo, which is where the copy lives.
--------------------------------------------------------------------------- */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Premium Hookah Accessories`,
    /* "%s · Tactical HB" — pages supply the left side and never repeat the
       brand themselves, which is how they stop reading like "Tactical HB |
       Tactical HB". */
    template: `%s · ${SITE_NAME}`,
  },
  description: siteMetadata.en.description,
  /* ---- The favicon --------------------------------------------------------

     THE SITE SHIPPED THE DEFAULT NEXT.JS TRIANGLE for its whole life. app/
     favicon.ico was never replaced, so the circle beside tactical-hb.com in
     Google's results was a stock framework icon — which is what you get when
     a search listing finally appears and nobody had reason to look at that
     file before.

     PNG, AND AT A STABLE URL. Google fetches the favicon for Search
     separately from the browser and wants a square PNG that is a multiple of
     48px; /favicon.png is 96 and its filename carries no content hash, so the
     URL Google records today is the URL that answers a year from now. The
     larger sizes are declared for browsers and installed-app surfaces, which
     pick the closest fit themselves.

     .ico STAYS AS WELL. app/favicon.ico is now the same mark rather than the
     triangle: browsers still request /favicon.ico by convention with no HTML
     to tell them otherwise, and a 404 there is a blank tab in the ones that
     do.

     The artwork is public/tct-logo.svg — the brand mark, unchanged geometry —
     rendered white on the brand near-black, cropped to its own bounding box
     and centred. The vector sits off-centre in its own canvas, which at 16px
     would have read as a lopsided smudge. */
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png", sizes: "96x96" },
      { url: "/favicon-48.png", type: "image/png", sizes: "48x48" },
      { url: "/favicon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/favicon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  ...siteMetadata.shared,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  /* THE LANG ATTRIBUTE WAS EMPTY ON ALL 28 ROUTES, which left a screen reader
     guessing whether to pronounce the page as English or Ukrainian — on a site
     that is genuinely half of each, that is a coin toss per page.

     It has to be read here rather than passed down: <html> is rendered by this
     layout, and the locale lives one segment below it in [locale]. getLocale()
     resolves it from the same request the middleware already set, and falls
     back to routing.defaultLocale for the handful of routes that sit outside
     [locale] entirely (/unlock, and the / redirect). Everything under [locale]
     is already dynamically rendered, so reading the request here costs no
     static generation that was happening before. */
  const locale = await getLocale();

  return (
    /* dir BELONGS ON <html>, not on a wrapper: it sets the base direction for
       the whole document, so text alignment, flex and grid flow, and the
       browser's own bidi algorithm all mirror without a single style rule.
       Anything using logical CSS properties follows it for free. */
    <html
      lang={locale}
      dir={localeDir(locale)}
      className={`${inter.variable} ${bebasNeue.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
