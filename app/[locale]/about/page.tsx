import { useTranslations } from "next-intl";
import Reveal from "@/components/Reveal";

export default function AboutPage() {
  return <AboutContent />;
}

function AboutContent() {
  const t = useTranslations("about");

  const values = [
    { title: t("value_1_title"), text: t("value_1_text") },
    { title: t("value_2_title"), text: t("value_2_text") },
    { title: t("value_3_title"), text: t("value_3_text") },
    { title: t("value_4_title"), text: t("value_4_text") },
  ];

  return (
    <div style={{ background: "var(--bg)" }}>
      <div className="relative overflow-hidden pt-36 pb-20 px-6" style={{ background: "var(--bg-soft)", borderBottom: "1px solid var(--border)" }}>
        <div className="absolute inset-0 flex items-center justify-end pr-8 pointer-events-none overflow-hidden">
          <span className="font-display text-[16vw] leading-none select-none" style={{ color: "rgba(23,22,15,0.035)" }}>ABOUT</span>
        </div>
        <div className="max-w-7xl mx-auto relative">
          <Reveal>
            <span className="text-xs tracking-[0.35em] uppercase block mb-4" style={{ color: "var(--gold)" }}>{t("story_tag")}</span>
            <h1 className="font-display text-5xl md:text-7xl max-w-3xl" style={{ color: "var(--text)" }}>{t("story_title")}</h1>
          </Reveal>
        </div>
      </div>

      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="grid md:grid-cols-2 gap-16 items-start">
          <Reveal>
            <div className="flex flex-col gap-6 text-sm md:text-base leading-relaxed" style={{ color: "var(--text-muted)" }}>
              <p>{t("story_text_1")}</p>
              <p>{t("story_text_2")}</p>
              <p>{t("story_text_3")}</p>
            </div>
          </Reveal>
          <Reveal delay={160}>
            <div className="aspect-square relative overflow-hidden flex items-center justify-center"
              style={{ background: "var(--ink)" }}>
              <span className="font-display text-[9rem] leading-none select-none" style={{ color: "rgba(255,255,255,0.04)" }}>TCT</span>
              <div className="absolute bottom-8 left-8">
                <div className="text-xs tracking-[0.3em] uppercase mb-2" style={{ color: "var(--gold-bright)" }}>Ukraine</div>
                <div className="font-display text-3xl" style={{ color: "#f4f3f0" }}>Premium Craft</div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="py-24 px-6" style={{ background: "var(--bg-soft)", borderTop: "1px solid var(--border)" }}>
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <span className="text-xs tracking-[0.35em] uppercase block mb-4" style={{ color: "var(--gold)" }}>{t("values_tag")}</span>
            <h2 className="font-display text-5xl md:text-6xl mb-14" style={{ color: "var(--text)" }}>{t("values_title")}</h2>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((v, i) => (
              <Reveal key={v.title} delay={i * 90}>
                <div className="border-t-2 pt-6 h-full" style={{ borderColor: "var(--gold)" }}>
                  <div className="font-display text-5xl mb-5" style={{ color: "var(--gold)", opacity: 0.35 }}>0{i + 1}</div>
                  <h3 className="font-medium text-sm mb-3 tracking-wide" style={{ color: "var(--text)" }}>{v.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{v.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
