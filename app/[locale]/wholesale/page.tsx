import { useTranslations } from "next-intl";
import WholesaleForm from "@/components/WholesaleForm";
import Reveal from "@/components/Reveal";

export default function WholesalePage() {
  return <WholesaleContent />;
}

function WholesaleContent() {
  const t = useTranslations("wholesale");

  const reasons = [
    { title: t("why_1_title"), text: t("why_1_text") },
    { title: t("why_2_title"), text: t("why_2_text") },
    { title: t("why_3_title"), text: t("why_3_text") },
  ];

  return (
    <div style={{ background: "var(--bg)" }}>
      <div className="relative overflow-hidden pt-36 pb-20 px-6" style={{ background: "var(--bg-soft)", borderBottom: "1px solid var(--border)" }}>
        <div className="absolute inset-0 flex items-center justify-end pr-8 pointer-events-none overflow-hidden">
          <span className="font-display text-[16vw] leading-none select-none" style={{ color: "rgba(23,22,15,0.035)" }}>WHOLESALE</span>
        </div>
        <div className="max-w-7xl mx-auto relative">
          <Reveal>
            <h1 className="font-display text-6xl md:text-8xl" style={{ color: "var(--text)" }}>{t("title")}</h1>
            <p className="mt-4 text-sm max-w-md" style={{ color: "var(--text-muted)" }}>{t("subtitle")}</p>
          </Reveal>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-16">
        <Reveal>
          <WholesaleForm />
        </Reveal>
        <Reveal delay={140}>
          <div>
            <h2 className="font-display text-4xl mb-12" style={{ color: "var(--text)" }}>{t("why_title")}</h2>
            <div className="flex flex-col gap-10">
              {reasons.map((r, i) => (
                <div key={r.title} className="flex gap-6">
                  <div className="font-display text-4xl leading-none pt-1 shrink-0" style={{ color: "var(--gold)", opacity: 0.5 }}>
                    0{i + 1}
                  </div>
                  <div>
                    <h3 className="font-medium text-sm mb-2 tracking-wide" style={{ color: "var(--text)" }}>{r.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{r.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
