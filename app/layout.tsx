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
