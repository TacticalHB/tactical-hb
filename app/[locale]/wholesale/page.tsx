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
    <div className="pt-16">
      <div className="max-w-7xl mx-auto px-6 py-20">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">{t("title")}</h1>
        <p className="text-[#888] text-lg mb-16 max-w-xl">{t("subtitle")}</p>

        <div className="grid md:grid-cols-2 gap-16">
          {/* Form */}
          <WholesaleForm />

          {/* Why section */}
          <div>
            <h2 className="text-xl font-bold tracking-tight mb-8 text-[#c9a84c]">{t("why_title")}</h2>
            <div className="flex flex-col gap-8">
              {reasons.map((r) => (
                <div key={r.title} className="border-l-2 border-[#c9a84c]/30 pl-6">
                  <h3 className="font-semibold mb-2 tracking-wide">{r.title}</h3>
                  <p className="text-[#888] text-sm leading-relaxed">{r.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
