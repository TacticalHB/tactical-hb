import { useTranslations } from "next-intl";
import Link from "next/link";
import { getLocale } from "next-intl/server";
import { featuredProducts } from "@/lib/products";
import ProductCard from "@/components/ProductCard";
import FlagshipTeaser from "@/components/FlagshipTeaser";
import Reveal from "@/components/Reveal";

export default async function HomePage() {
  const locale = await getLocale();
  return <HomeContent locale={locale} />;
}

function HomeContent({ locale }: { locale: string }) {
  const t = useTranslations("home");

  return (
    <div>
      {/* ---- Cinematic hero ---- */}
      <section className="relative min-h-screen flex items-center overflow-hidden" style={{ background: "var(--bg)" }}>
        {/* Ambient glow */}
        <div
          className="hero-glow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            width: "100vw",
            height: "70vh",
            background: "radial-gradient(ellipse at center, rgba(197,163,90,0.12) 0%, transparent 60%)",
          }}
        />
        {/* Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
          <span className="font-display text-[24vw] leading-none whitespace-nowrap" style={{ color: "rgba(255,255,255,0.025)" }}>
            TACTICAL
          </span>
        </div>
        {/* Bottom fade */}
        <div className="absolute inset-x-0 bottom-0 h-40 pointer-events-none"
          style={{ background: "linear-gradient(to top, var(--bg), transparent)" }} />

        <div className="relative max-w-7xl mx-auto px-6 w-full pt-20">
          <Reveal>
            <span className="inline-block text-xs tracking-[0.4em] uppercase mb-8 px-4 py-2 border"
              style={{ color: "var(--gold)", borderColor: "var(--border-strong)" }}>
              {t("hero_tag")}
            </span>
          </Reveal>

          <Reveal delay={140}>
            <h1 className="font-display text-[clamp(4.5rem,16vw,15rem)] leading-[0.85]" style={{ color: "var(--text)" }}>
              TACTICAL <span style={{ color: "var(--gold)" }}>HB</span>
            </h1>
          </Reveal>

          <Reveal delay={260}>
            <p className="text-base md:text-xl leading-relaxed max-w-xl mt-8 mb-12" style={{ color: "var(--text-muted)" }}>
              {t("hero_subtitle")}
            </p>
          </Reveal>

          <Reveal delay={380}>
            <div className="flex flex-wrap items-center gap-6">
              <Link href={`/${locale}/products`} className="btn-gold font-display text-lg tracking-widest px-10 py-4">
                {t("cta_products")}
              </Link>
              <Link href={`/${locale}/wholesale`} className="link-gold text-xs tracking-[0.2em] uppercase border-b pb-1">
                {t("cta_wholesale")} →
              </Link>
            </div>
          </Reveal>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <div className="w-px h-10 relative overflow-hidden" style={{ background: "var(--border-strong)" }}>
            <div className="scroll-cue-dot absolute top-0 left-0 w-full h-3" style={{ background: "var(--gold)" }} />
          </div>
        </div>
      </section>

      {/* ---- Featured products ---- */}
      <section className="py-28 px-6" style={{ background: "var(--bg)" }}>
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="flex items-end justify-between mb-14">
              <div>
                <span className="text-xs tracking-[0.35em] uppercase block mb-3" style={{ color: "var(--gold)" }}>
                  {t("featured_tag")}
                </span>
                <h2 className="font-display text-5xl md:text-6xl" style={{ color: "var(--text)" }}>
                  {t("featured_title")}
                </h2>
              </div>
              <Link href={`/${locale}/products`} className="link-gold text-xs tracking-[0.2em] uppercase border-b pb-1 hidden md:block">
                {t("cta_products")} →
              </Link>
            </div>
          </Reveal>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 md:gap-8">
            {featuredProducts.map((product, i) => (
              <Reveal key={product.id} delay={i * 90}>
                <ProductCard product={product} locale={locale} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Flagship teaser ---- */}
      <FlagshipTeaser locale={locale} />

      {/* ---- About strip ---- */}
      <section className="py-28 px-6" style={{ background: "var(--bg)" }}>
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
            <div className="aspect-square relative overflow-hidden flex items-center justify-center border"
              style={{ background: "var(--bg-2)", borderColor: "var(--border)" }}>
              <span className="font-display text-[10rem] leading-none select-none" style={{ color: "rgba(255,255,255,0.03)" }}>TCT</span>
              <div className="absolute bottom-8 left-8">
                <div className="text-xs tracking-[0.3em] uppercase mb-2" style={{ color: "var(--gold)" }}>Ukraine</div>
                <div className="font-display text-3xl" style={{ color: "var(--text)" }}>Premium Craft</div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
