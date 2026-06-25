import { useTranslations } from "next-intl";
import Countdown from "./Countdown";
import NotifyForm from "./NotifyForm";
import Reveal from "./Reveal";

export default function FlagshipTeaser({ locale }: { locale: string }) {
  const t = useTranslations("flagship");

  return (
    <section className="relative overflow-hidden py-28 md:py-40 px-6" style={{ background: "var(--ink)" }}>
      {/* Ambient glow */}
      <div className="hero-glow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{ width: "120vw", height: "60vh", background: "radial-gradient(ellipse at center, rgba(212,177,94,0.10) 0%, transparent 65%)" }} />
      {/* Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <span className="font-display text-[26vw] leading-none whitespace-nowrap" style={{ color: "rgba(255,255,255,0.025)" }}>
          FLAGSHIP
        </span>
      </div>

      <div className="relative max-w-5xl mx-auto text-center">
        <Reveal>
          <span className="inline-block text-xs tracking-[0.4em] uppercase mb-8" style={{ color: "var(--gold-bright)" }}>
            {t("eyebrow")}
          </span>
        </Reveal>
        <Reveal delay={120}>
          <h2 className="font-display text-[clamp(3.5rem,11vw,9rem)] leading-[0.9] mb-6" style={{ color: "#f4f3f0" }}>
            {t("title")}
          </h2>
        </Reveal>
        <Reveal delay={220}>
          <p className="text-base md:text-lg leading-relaxed max-w-2xl mx-auto mb-14" style={{ color: "#9a978f" }}>
            {t("subtitle")}
          </p>
        </Reveal>
        <Reveal delay={320}>
          <div className="text-[0.7rem] tracking-[0.35em] uppercase mb-6" style={{ color: "#6a665e" }}>
            {t("countdown_label")}
          </div>
          <div className="flex justify-center mb-16">
            <Countdown locale={locale} />
          </div>
        </Reveal>
        <Reveal delay={420}>
          <div className="flex justify-center">
            <NotifyForm />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
