import { useTranslations } from "next-intl";
import Link from "next/link";
import { getLocale } from "next-intl/server";
import Bestsellers from "@/components/Bestsellers";
import Countdown from "@/components/Countdown";
import NotifyForm from "@/components/NotifyForm";
import Reveal from "@/components/Reveal";

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
              </div>
            </Reveal>
          </div>

          {/* Vertical cinematic screen.
              Same framing language as the promo band below (#000 + 20px
              radius + overflow-hidden), turned portrait. The centre glow does
              the job the pillarboxed video does down there: it stops a flat
              black rectangle reading as a hole punched in the page. The mark
              is /tct-logo.svg — already the white variant, so it needs no
              filter, only a low opacity to sit back as a watermark. */}
          <Reveal delay={200}>
            <div
              className="hero-screen relative w-full max-w-[400px] mx-auto aspect-[3/4] rounded-[20px] overflow-hidden"
              style={{ background: "#000000" }}
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(ellipse 62% 42% at 50% 50%, rgba(255,255,255,0.055) 0%, transparent 72%)",
                }}
                aria-hidden="true"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/tct-logo.svg"
                alt=""
                aria-hidden="true"
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[54%] max-w-[220px]"
                style={{ opacity: 0.09 }}
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

      {/* ================= BESTSELLERS ================= */}
      <Bestsellers locale={locale} />

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
