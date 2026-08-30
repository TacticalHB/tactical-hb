import type { Metadata } from "next";
import { Lora } from "next/font/google";
import { getTranslations } from "next-intl/server";
import { locales } from "@/i18n/routing";

/* ---------------------------------------------------------------------------
   The operative file's own shell.

   OUTSIDE (shop) ON PURPOSE. The storefront layout brings the navbar, the
   footer, the cart drawer and the cookie banner; this page is a full-bleed
   dark document with its own minimal header, exactly as the mockups draw it,
   and dropping the light catalogue chrome on top would undo that. It is the
   same split /admin already uses — [locale]/layout.tsx still gives it
   messages and a session, which is all it needs.

   THERE IS ALWAYS A WAY OUT, which is the condition for going full-bleed: the
   wordmark returns home, the locale pair switches language, and Skip file
   leaves for the collection.

   THE SERIF IS DECLARED HERE, NOT IN THE ROOT LAYOUT, so it is fetched for
   this route and nothing else — the rest of the site is Bebas and Inter and
   has no use for it. Cyrillic is in the subset list because half this page is
   Ukrainian, and a serif that falls back to a system face mid-sentence is
   worse than not using one.
--------------------------------------------------------------------------- */

const lora = Lora({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
  variable: "--font-file-serif",
  display: "swap",
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "mrhb" });
  const site = (process.env.SITE_URL || "https://tactical-hb.com").replace(/\/$/, "");

  return {
    /* ABSOLUTE, because the copy already ends in the brand. The root layout's
       template appends "· Tactical HB" to every title, so this page shipped as
       "Mr HB — оперативна справа | Tactical HB · Tactical HB" — the brand
       twice, in two different separators, inside the 60 characters a result
       actually shows. Absolute tells the template to keep its hands off rather
       than making four translations agree about a suffix. */
    title: { absolute: t("meta_title") },
    description: t("meta_desc"),
    alternates: {
      canonical: `${site}/${locale}/mr-hb`,
      /* Every storefront, not the two this page was born with — a missing
         hreflang is how a translated page gets indexed as a duplicate. */
      languages: {
        ...Object.fromEntries(locales.map((l) => [l, `${site}/${l}/mr-hb`])),
        /* And the x-default every other page declares through alternatesFor().
           This page builds its own set — it predates that helper — so it was
           the one page in the site with no fallback for an unmatched language.
           Ukrainian, same policy as everywhere else. */
        "x-default": `${site}/uk/mr-hb`,
      },
    },
    openGraph: {
      title: t("meta_title"),
      description: t("meta_desc"),
      url: `${site}/${locale}/mr-hb`,
      images: [{ url: `${site}/mr-hb/chapters/case-closed.webp`, width: 1728, height: 1152 }],
    },
  };
}

export default function MrHbLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={lora.variable} style={{ background: "#0a0b0d", minHeight: "100dvh" }}>
      {children}
    </div>
  );
}
