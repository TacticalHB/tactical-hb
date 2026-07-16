import { useTranslations } from "next-intl";
import Link from "next/link";
import Image from "next/image";
import { getLocale } from "next-intl/server";
import { homeMoments } from "@/lib/products";
import ProductMoment from "@/components/ProductMoment";
import Countdown from "@/components/Countdown";
import NotifyForm from "@/components/NotifyForm";
import Reveal from "@/components/Reveal";

/**
 * Measured product fill (bounding box ÷ frame) for the three moment photos:
 *   bowl-killer   54.6% wide × 75.7% tall  — tall bowl
 *   hmd-tct-op    76.3% wide × 38.1% tall  — flat ring, little vertical mass
 *   bowl-phunnel  48.9% wide × 82.3% tall  — tallest
 *
 * The cards are identical squares, so raw object-contain leaves the ring
 * looking lost and FTP looking oversized. These nudges even out visual weight;
 * they're eyeballed against those numbers, not arbitrary.
 */
const MOMENT_SCALE: Record<string, number> = {
  "bowl-killer": 1,
  "hmd-tct-op": 1.12,
  "bowl-phunnel": 0.93,
};

export default async function HomePage() {
  const locale = await getLocale();
  return <HomeContent locale={locale} />;
}

function HomeContent({ locale }: { locale: string }) {
  const t = useTranslations("home");
  const tf = useTranslations("flagship");
  const uk = locale === "uk";

  return (
    <div style={{ background: "var(--bg)" }}>
      {/* ================= HERO =================
          One composition: brand and tagline left, product right, and the
          launch countdown as a hairline-separated footer rather than its own
          shouty section. The product photo is a transparent cut-out, so it
          floats directly on the page — no panel, no frame. */}
      <section className="relative min-h-screen pt-16 flex flex-col">
        <div className="flex-1 w-full max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-8 md:gap-12 items-center py-12 md:py-0">
          {/* Copy */}
          <div>
            <Reveal>
              <div className="flex items-center gap-4 mb-8">
                <span className="w-10 h-px" style={{ background: "var(--border-strong)" }} />
                <span
                  className="text-[0.6rem] tracking-[0.35em] uppercase"
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
                <Link href={`/${locale}/wholesale`} className="moment-cta text-xs tracking-[0.18em] uppercase">
                  {t("cta_wholesale")}
                  <span className="moment-arrow" aria-hidden="true">
                    →
                  </span>
                </Link>
              </div>
            </Reveal>
          </div>

          {/* Product */}
          <Reveal delay={200}>
            <div className="relative aspect-square max-w-[520px] mx-auto w-full">
              {/* Grounding shadow — a cut-out with nothing beneath it reads as
                  a sticker. This ellipse gives it a surface to sit on. */}
              <div
                className="absolute left-1/2 -translate-x-1/2 bottom-[26%] w-[58%] h-[7%] pointer-events-none"
                style={{
                  background:
                    "radial-gradient(ellipse at center, rgba(17,17,20,0.22) 0%, rgba(17,17,20,0.06) 45%, transparent 72%)",
                  filter: "blur(7px)",
                }}
                aria-hidden="true"
              />
              <Image
                src="/images/hmd-op-black.png"
                alt={uk ? "HMD TCT OP" : "HMD TCT OP"}
                fill
                sizes="(max-width: 768px) 90vw, 45vw"
                priority
                className="hero-product object-contain"
              />
            </div>
          </Reveal>
        </div>

        {/* Hero footer — launch countdown + notify */}
        <Reveal delay={480}>
          <div className="w-full max-w-7xl mx-auto px-6 pb-12 md:pb-14">
            <div className="h-px w-full mb-8" style={{ background: "var(--border)" }} />
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-10">
              <div>
                <div
                  className="text-[0.58rem] tracking-[0.3em] uppercase mb-5"
                  style={{ color: "var(--text-muted)" }}
                >
                  {tf("eyebrow")}
                </div>
                {/* The digits carry their own unit labels; this names the
                    countdown itself for screen readers. */}
                <span className="sr-only">{tf("countdown_label")}</span>
                <Countdown locale={locale} />
              </div>
              <div className="md:pb-1 w-full md:w-auto">
                <NotifyForm />
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ================= PROMO VIDEO =================
          Inset as a rounded panel with air around it, so the one dark block on
          the page reads as a deliberate object rather than a slab. */}
      <section className="px-6 py-10 md:py-16">
        <Reveal>
          <div
            className="max-w-6xl mx-auto relative overflow-hidden rounded-[20px] aspect-video"
            style={{ background: "#000000" }}
          >
            {/* blurred ambient fill (same video, scaled + blurred behind) */}
            <video
              className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: "blur(48px) brightness(0.75)", transform: "scale(1.35)" }}
              src="/videos/promo.mp4"
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              aria-hidden="true"
              tabIndex={-1}
            />
            {/* sharp foreground video, full animation visible */}
            <video
              className="absolute inset-0 w-full h-full object-contain"
              src="/videos/promo.mp4"
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              aria-label="Tactical HB promo video"
            />
          </div>
        </Reveal>
      </section>

      {/* ================= PRODUCT MOMENTS ================= */}
      <div className="pt-16 md:pt-24">
        <Reveal>
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex items-center gap-4">
              <span className="w-10 h-px" style={{ background: "var(--border-strong)" }} />
              <span
                className="text-[0.6rem] tracking-[0.35em] uppercase"
                style={{ color: "var(--text-muted)" }}
              >
                {t("featured_tag")}
              </span>
            </div>
          </div>
        </Reveal>

        {homeMoments.map((product, i) => (
          <ProductMoment
            key={product.id}
            product={product}
            locale={locale}
            index={i + 1}
            flip={i % 2 === 1}
            scale={MOMENT_SCALE[product.slug] ?? 1}
          />
        ))}

        <Reveal>
          <div className="max-w-6xl mx-auto px-6 pb-24 md:pb-32 flex justify-center">
            <Link href={`/${locale}/products`} className="pill-outline">
              {uk ? "Уся колекція" : "See the full collection"}
            </Link>
          </div>
        </Reveal>
      </div>

      {/* ================= ABOUT ================= */}
      <section className="py-24 md:py-32 px-6" style={{ borderTop: "1px solid var(--border)" }}>
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 md:gap-20 items-center">
          <Reveal>
            <div className="max-w-md">
              <div className="flex items-center gap-4 mb-6">
                <span className="w-10 h-px" style={{ background: "var(--border-strong)" }} />
                <span
                  className="text-[0.6rem] tracking-[0.35em] uppercase"
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

          <Reveal delay={160}>
            <div
              className="aspect-square relative overflow-hidden rounded-[20px] flex items-center justify-center"
              style={{ background: "var(--bg-soft)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/tct-logo.svg"
                alt=""
                aria-hidden="true"
                className="w-[46%] max-w-[220px]"
                style={{ opacity: 0.07, filter: "invert(1)" }}
              />
              <div className="absolute bottom-8 left-8">
                <div
                  className="text-[0.58rem] tracking-[0.3em] uppercase mb-2"
                  style={{ color: "var(--text-faint)" }}
                >
                  {uk ? "Україна" : "Ukraine"}
                </div>
                <div className="font-display text-2xl" style={{ color: "var(--text)" }}>
                  {uk ? "Преміальна майстерність" : "Premium Craft"}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
