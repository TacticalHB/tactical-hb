import { useTranslations } from "next-intl";
import Link from "next/link";
import { getLocale } from "next-intl/server";
import { featuredProducts } from "@/lib/products";
import FlagshipTile from "@/components/FlagshipTile";
import FlagshipTeaser from "@/components/FlagshipTeaser";
import Reveal from "@/components/Reveal";
import Embers from "@/components/Embers";

export default async function HomePage() {
  const locale = await getLocale();
  return <HomeContent locale={locale} />;
}

function HomeContent({ locale }: { locale: string }) {
  const t = useTranslations("home");

  return (
    <div>
      {/* ---- Split hero: light text + dark showcase ---- */}
      <section className="pt-16 min-h-screen flex items-stretch" style={{ background: "var(--bg)" }}>
        <div className="max-w-7xl mx-auto w-full grid md:grid-cols-2">
          {/* Left — light */}
          <div className="relative flex flex-col justify-center px-6 py-20 md:py-0">
            {/* warm glow */}
            <div className="hero-glow absolute top-1/2 left-0 -translate-y-1/2 pointer-events-none -z-0"
              style={{ width: "60vw", height: "50vh", background: "radial-gradient(ellipse at center, rgba(168,127,44,0.10) 0%, transparent 65%)" }} />
            <div className="relative">
              <Reveal>
                <span className="inline-block text-xs tracking-[0.4em] uppercase mb-8 px-4 py-2 border"
                  style={{ color: "var(--gold)", borderColor: "var(--border-strong)" }}>
                  {t("hero_tag")}
                </span>
              </Reveal>
              <Reveal delay={140}>
                <h1 className="font-display text-[clamp(3.5rem,11vw,8rem)] leading-[0.85]" style={{ color: "var(--text)" }}>
                  TACTICAL <span style={{ color: "var(--gold)" }}>HB</span>
                </h1>
              </Reveal>
              <Reveal delay={260}>
                <p className="text-base md:text-lg leading-relaxed max-w-md mt-8 mb-12" style={{ color: "var(--text-muted)" }}>
                  {t("hero_subtitle")}
                </p>
              </Reveal>
              <Reveal delay={380}>
                <div className="flex flex-wrap items-center gap-6">
                  <Link href={`/${locale}/products`} className="btn-dark font-display text-lg tracking-widest px-10 py-4">
                    {t("cta_products")}
                  </Link>
                  <Link href={`/${locale}/wholesale`} className="link-gold text-xs tracking-[0.2em] uppercase border-b pb-1">
                    {t("cta_wholesale")} →
                  </Link>
                </div>
              </Reveal>
            </div>
          </div>

          {/* Right — dark showcase panel with real product */}
          <Reveal delay={200} className="hidden md:block">
            <div className="smoke-bg relative h-full min-h-[60vh] overflow-hidden flex items-center justify-center"
              style={{ borderLeft: "10px solid #ffffff" }}>
              {/* ash & embers */}
              <Embers density={1.1} />
              {/* soft glow behind product */}
              <div className="hero-glow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                style={{ width: "70%", height: "60%", background: "radial-gradient(ellipse at center, rgba(212,177,94,0.16) 0%, transparent 70%)" }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/tct-logo.svg"
                alt=""
                aria-hidden="true"
                className="relative z-10 w-[80%] max-w-[500px]"
                style={{ opacity: 0.15, transform: "translateY(-66px)" }}
              />
              <div className="absolute top-8 right-8 w-12 h-px" style={{ background: "var(--gold-bright)" }} />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---- Promo video band (full grid width, 16:9, silent ambient loop) ---- */}
      <section style={{ background: "#ffffff", borderTop: "10px solid #ffffff" }}>
        <div className="relative overflow-hidden aspect-video" style={{ background: "#000000" }}>
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
      </section>

      {/* ---- Flagship products — Apple-style tile grid ---- */}
      <section style={{ background: "#ffffff", borderTop: "10px solid #ffffff" }}>
        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "10px" }}>
          {featuredProducts.map((product, i) => (
            <FlagshipTile key={product.id} product={product} locale={locale} dark={i === 0 || i === 3} />
          ))}
        </div>
      </section>

      {/* ---- Flagship teaser (dark accent) ---- */}
      <FlagshipTeaser locale={locale} />

      {/* ---- About strip (light) ---- */}
      <section className="py-28 px-6" style={{ background: "var(--bg)", borderTop: "10px solid #ffffff" }}>
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <Reveal>
            <div>
              <span className="text-xs tracking-[0.35em] uppercase block mb-4" style={{ color: "var(--gold)" }}>
                {t("about_tag")}
              </span>
              <h2 className="font-display text-5xl md:text-6xl mb-8" style={{ color: "var(--text)" }}>
                {t("about_title")}
              </h2>
              <p className="leading-relaxed mb-10 text-sm md:text-base" style={{ color: "var(--text-muted)" }}>
                {t("about_text")}
              </p>
              <Link href={`/${locale}/about`} className="link-gold text-xs tracking-[0.2em] uppercase border-b pb-1">
                {t("about_cta")} →
              </Link>
            </div>
          </Reveal>
          <Reveal delay={160}>
            <div className="aspect-square relative overflow-hidden flex items-center justify-center"
              style={{ background: "var(--ink)" }}>
              <span className="font-display text-[10rem] leading-none select-none" style={{ color: "rgba(255,255,255,0.04)" }}>TCT</span>
              <div className="absolute bottom-8 left-8">
                <div className="text-xs tracking-[0.3em] uppercase mb-2" style={{ color: "var(--gold-bright)" }}>Ukraine</div>
                <div className="font-display text-3xl" style={{ color: "#f4f3f0" }}>Premium Craft</div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
