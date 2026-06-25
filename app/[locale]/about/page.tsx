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
    <div className="pt-16">
      {/* Story */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <span className="text-[#c9a84c] text-xs tracking-[0.3em] uppercase block mb-4">{t("story_tag")}</span>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-12 max-w-2xl">{t("story_title")}</h1>
        <div className="grid md:grid-cols-2 gap-16 items-start">
          <div className="flex flex-col gap-6 text-[#888] leading-relaxed">
            <p>{t("story_text_1")}</p>
            <p>{t("story_text_2")}</p>
            <p>{t("story_text_3")}</p>
          </div>
          <div className="aspect-square bg-[#0d0d0d] border border-[#1a1a1a] flex items-center justify-center">
            <span className="text-[#1e1e1e] text-7xl font-bold tracking-widest">TCT</span>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="border-t border-[#1a1a1a] bg-[#0d0d0d] py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <span className="text-[#c9a84c] text-xs tracking-[0.3em] uppercase block mb-4">{t("values_tag")}</span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-12">{t("values_title")}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((v) => (
              <div key={v.title} className="border border-[#1a1a1a] p-6">
                <h3 className="font-semibold mb-3 tracking-wide text-sm">{v.title}</h3>
                <p className="text-[#666] text-sm leading-relaxed">{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
