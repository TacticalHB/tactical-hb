import { useTranslations } from "next-intl";
import WholesaleForm from "@/components/WholesaleForm";

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
    <div className="pt-16" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div className="relative overflow-hidden py-16 px-6" style={{ background: "var(--bg-dark)" }}>
        <div className="absolute inset-0 flex items-center justify-end pr-12 pointer-events-none overflow-hidden">
          <span className="font-display text-[15vw] leading-none select-none" style={{ color: "#ffffff04" }}>
            WHOLESALE
          </span>
        </div>
        <div className="max-w-7xl mx-auto relative">
          <h1 className="font-display text-5xl md:text-7xl" style={{ color: "#fff" }}>{t("title")}</h1>
          <p className="mt-3 text-sm max-w-md" style={{ color: "#777" }}>{t("subtitle")}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-16">
        <WholesaleForm />

        <div>
          <h2 className="font-display text-3xl mb-10" style={{ color: "var(--text)" }}>{t("why_title")}</h2>
          <div className="flex flex-col gap-8">
            {reasons.map((r, i) => (
              <div key={r.title} className="flex gap-5">
                <div
                  className="font-display text-3xl leading-none pt-0.5 shrink-0"
                  style={{ color: "var(--gold)", opacity: 0.4 }}
                >
                  0{i + 1}
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-2 tracking-wide" style={{ color: "var(--text)" }}>
                    {r.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{r.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
