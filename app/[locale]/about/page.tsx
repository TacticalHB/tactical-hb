import { useTranslations } from "next-intl";

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
    <div className="pt-16" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div className="relative overflow-hidden py-16 px-6" style={{ background: "var(--bg-dark)" }}>
        <div className="absolute inset-0 flex items-center justify-end pr-12 pointer-events-none overflow-hidden">
          <span className="font-display text-[15vw] leading-none select-none" style={{ color: "#ffffff04" }}>
            ABOUT
          </span>
        </div>
        <div className="max-w-7xl mx-auto relative">
          <span className="text-xs tracking-[0.3em] uppercase block mb-3" style={{ color: "var(--gold)" }}>
            {t("story_tag")}
          </span>
          <h1 className="font-display text-5xl md:text-7xl" style={{ color: "#fff" }}>{t("story_title")}</h1>
        </div>
      </div>

      {/* Story */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 gap-16 items-start">
          <div className="flex flex-col gap-6 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
            <p>{t("story_text_1")}</p>
            <p>{t("story_text_2")}</p>
            <p>{t("story_text_3")}</p>
          </div>
          <div
            className="aspect-square relative overflow-hidden flex items-center justify-center"
            style={{ background: "var(--bg-dark)" }}
          >
            <span className="font-display text-[8rem] leading-none select-none" style={{ color: "#ffffff06" }}>
              TCT
            </span>
            <div className="absolute bottom-8 left-8">
              <div className="text-xs tracking-widest uppercase mb-1" style={{ color: "var(--gold)" }}>Ukraine</div>
              <div className="font-display text-2xl" style={{ color: "#fff" }}>Premium Craft</div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 px-6" style={{ background: "var(--bg-subtle)", borderTop: "1px solid var(--border-light)" }}>
        <div className="max-w-7xl mx-auto">
          <span className="text-xs tracking-[0.3em] uppercase block mb-3" style={{ color: "var(--gold)" }}>
            {t("values_tag")}
          </span>
          <h2 className="font-display text-4xl md:text-5xl mb-12" style={{ color: "var(--text)" }}>
            {t("values_title")}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((v, i) => (
              <div key={v.title} className="border-t-2 pt-6" style={{ borderColor: "var(--gold)" }}>
                <div className="font-display text-4xl mb-4" style={{ color: "var(--gold)", opacity: 0.25 }}>
                  0{i + 1}
                </div>
                <h3 className="font-semibold text-sm mb-3 tracking-wide" style={{ color: "var(--text)" }}>
                  {v.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
