import type { Metadata } from "next";
import { jsonLdScript, metadataFor, organizationJsonLd, websiteJsonLd, SITE_NAME } from "@/lib/seo";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { getLocale } from "next-intl/server";
import Bestsellers from "@/components/Bestsellers";
import Countdown from "@/components/Countdown";
import MissionMonitor from "@/components/MissionMonitor";
import Reveal from "@/components/Reveal";
import SearchlightHero from "@/components/SearchlightHero";
import HeroScreen from "@/components/HeroScreen";


export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const meta = await metadataFor({ locale, path: "/", key: "home" });
  /* BRAND FIRST ON THE HOMEPAGE (4 Oct 2026). Every page ended its title with
     "· Tactical HB", so for a search for the name the homepage had no stronger
     claim than the Mr HB file — which outranked it. The homepage alone leads
     with the name: "Tactical HB — Premium Hookah Accessories from Ukraine". */
  const tagline = typeof meta.title === "string" ? meta.title : "";
  return { ...meta, title: { absolute: `${SITE_NAME} — ${tagline}` } };
}

export default async function HomePage() {
  const locale = await getLocale();
  return (
    <>
      {/* Organization schema goes on the home page only — it describes the
          business, not this page, and repeating it on all 28 routes tells a
          crawler nothing it did not learn the first time. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(organizationJsonLd(locale))}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(websiteJsonLd())} />
      <HomeContent locale={locale} />
    </>
  );
}

function HomeContent({ locale }: { locale: string }) {
  const t = useTranslations("home");
  const tf = useTranslations("flagship");

  return (
    <div style={{ background: "var(--bg)" }}>
      {/* ================= HERO =================
          One composition: brand and tagline left, product right, and the
          launch countdown as a hairline-separated footer rather than its own
          shouty section. The product photo is a transparent cut-out, so it
          floats directly on the page — no panel, no frame. */}
      <section className="relative min-h-screen pt-16 flex flex-col">
        <div className="flex-1 w-full page-container grid md:grid-cols-2 gap-8 md:gap-12 items-center py-12 md:py-0">
          {/* Copy. Nudged in from the page gutter on wide screens so the block
              sits nearer the centre of the composition rather than hard against
              the left edge. Mobile keeps the full gutter — there is no second
              column to balance against there. */}
          <div className="md:pl-8 lg:pl-16">
            <Reveal>
              <div className="flex items-center gap-4 mb-8">
                <span className="w-10 h-px" style={{ background: "var(--border-strong)" }} />
                <span
                  className="text-[0.7rem] sm:text-[0.6rem] tracking-[0.35em] uppercase"
                  style={{ color: "var(--text-muted)" }}
                >
                  {t("hero_tag")}
                </span>
              </div>
            </Reveal>

            <Reveal delay={120}>
              <h1
                className="font-display leading-[0.86]"
                style={{ color: "var(--text)", fontSize: "clamp(3.25rem, 8vw, 6.5rem)" }}
              >
                TACTICAL HB
              </h1>
            </Reveal>

            <Reveal delay={240}>
              <p
                className="text-base md:text-lg leading-relaxed max-w-md mt-8 mb-12"
                style={{ color: "var(--text-muted)" }}
              >
                {t("hero_subtitle")}
              </p>
            </Reveal>

            <Reveal delay={360}>
              <div className="flex flex-wrap items-center gap-8">
                <Link href={`/${locale}/products`} className="pill-dark">
                  {t("cta_products")}
                </Link>
              </div>
            </Reveal>
          </div>

          {/* Vertical cinematic screen: the TCT mark and the Project KI 06
              film taking turns — one mark cycle, then the film, then the mark
              again (Mario, 7 Oct 2026). See components/HeroScreen. */}
          <Reveal delay={200}>
            <HeroScreen />
          </Reveal>
        </div>

        {/* Hero footer — launch countdown + notify */}
        <Reveal delay={480}>
          <div className="w-full page-container pb-12 md:pb-14">
            <div className="h-px w-full mb-8" style={{ background: "var(--border)" }} />
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-10">
              <div>
                <div
                  className="text-[0.7rem] sm:text-[0.58rem] tracking-[0.3em] uppercase mb-5"
                  style={{ color: "var(--text-muted)" }}
                >
                  {tf("eyebrow")}
                </div>
                {/* The digits carry their own unit labels; this names the
                    countdown itself for screen readers. */}
                <span className="sr-only">{tf("countdown_label")}</span>
                <Countdown locale={locale} />
              </div>
              {/* The "Open the file · Clearance required" door that stood here
                  was removed on 6 Oct 2026 (Mario): the flagship is on sale as
                  Project KI 06, so a link promising a classified file under the
                  countdown no longer told the truth. */}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ================= PROMO VIDEO =================
          Inset as a rounded panel with air around it, so the one dark block on
          the page reads as a deliberate object rather than a slab.

          The stage now belongs to SearchlightHero, which carries the panel's
          own dimensions with it — the section here keeps only the container and
          its spacing. The pair of stacked <video> elements this replaced were a
          portrait clip letterboxed into a 16:9 frame plus a blurred copy of
          itself to fill the gaps; the new film is natively 16:9 and needs
          neither. */}
      <section className="page-container py-10 md:py-16">
        <Reveal>
          <SearchlightHero locale={locale} />
        </Reveal>
      </section>

      {/* ================= BESTSELLERS ================= */}
      <Bestsellers locale={locale} />

      {/* ================= ABOUT ================= */}
      <section className="pb-24 md:pb-32">
        <div className="page-container">
          {/* Subtle inset divider — same 1px var(--border) as the one before the
              countdown, contained rather than a full-bleed edge-to-edge line. */}
          <div className="h-px w-full mb-24 md:mb-32" style={{ background: "var(--border)" }} />
          {/* Capped and centred rather than spanning the full 1680px container.
              At container width the two columns sat ~780px apart with the copy
              pinned to the far left and the monitor adrift on the right, and
              the space between them read as a hole rather than as air. The
              divider above still spans the full width — it is the section's
              edge, not part of this composition. */}
          <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center max-w-6xl mx-auto">
          <Reveal>
            {/* ml-auto pulls the copy to the inner edge of its column, so it
                leans towards the monitor instead of the page gutter. */}
            <div className="max-w-md md:ml-auto">
              <div className="flex items-center gap-4 mb-6">
                <span className="w-10 h-px" style={{ background: "var(--border-strong)" }} />
                <span
                  className="text-[0.7rem] sm:text-[0.6rem] tracking-[0.35em] uppercase"
                  style={{ color: "var(--text-muted)" }}
                >
                  {t("about_tag")}
                </span>
              </div>
              <h2
                className="font-display leading-[0.95] mb-6"
                style={{ color: "var(--text)", fontSize: "clamp(2.25rem, 4.5vw, 3.5rem)" }}
              >
                {t("about_title")}
              </h2>
              <p className="leading-relaxed mb-9 text-base" style={{ color: "var(--text-muted)" }}>
                {t("about_text")}
              </p>
              <Link href={`/${locale}/about`} className="moment-cta text-xs tracking-[0.18em] uppercase">
                {t("about_cta")}
                <span className="moment-arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            </div>
          </Reveal>

          {/* Mr.HB, running on a field monitor. Replaced a flat grey poster
              carrying a watermark of the logo — the section's right half now
              shows the brand's own character instead of a placeholder. */}
          <Reveal delay={160}>
            <MissionMonitor locale={locale} />
          </Reveal>
          </div>
        </div>
      </section>
    </div>
  );
}
