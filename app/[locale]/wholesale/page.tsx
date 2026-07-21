import { useTranslations } from "next-intl";
import WholesaleForm from "@/components/WholesaleForm";
import Reveal from "@/components/Reveal";
import { SALES_EMAIL } from "@/lib/contact-info";

export default function WholesalePage() {
  return <WholesaleContent />;
}

function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 14 14" fill="none" aria-hidden="true"
      className="shrink-0 mt-1" style={{ color: "var(--accent)" }}>
      <path d="M2.5 7.5l3 3 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WholesaleContent() {
  const t = useTranslations("wholesale");

  const collaborators = [t("collab_1"), t("collab_2"), t("collab_3")];
  const reasons = [t("why_1"), t("why_2"), t("why_3"), t("why_4"), t("why_5"), t("why_6")];

  return (
    <div style={{ background: "var(--bg)" }}>
      {/* Hero */}
      <div className="relative overflow-hidden pt-36 pb-20" style={{ background: "var(--bg-soft)", borderBottom: "1px solid var(--border)" }}>
        <div className="absolute inset-0 flex items-center justify-end pr-8 pointer-events-none overflow-hidden">
          <span className="font-display text-[16vw] leading-none select-none" style={{ color: "rgba(23,22,15,0.035)" }}>WHOLESALE</span>
        </div>
        <div className="page-container relative">
          <Reveal>
            <h1 className="font-display text-6xl md:text-8xl" style={{ color: "var(--text)" }}>{t("title")}</h1>
            <p className="mt-6 text-base md:text-lg leading-relaxed max-w-2xl" style={{ color: "var(--text-muted)" }}>{t("intro")}</p>
          </Reveal>
        </div>
      </div>

      {/* We collaborate with */}
      <section className="page-container py-20 md:py-24">
        <Reveal>
          <span className="text-xs tracking-[0.35em] uppercase block mb-10" style={{ color: "var(--gold)" }}>{t("collab_title")}</span>
        </Reveal>
        <div className="grid sm:grid-cols-3 gap-8 mb-20">
          {collaborators.map((c, i) => (
            <Reveal key={c} delay={i * 90}>
              <div className="border-t-2 pt-6 h-full" style={{ borderColor: "var(--gold)" }}>
                <div className="font-display text-4xl mb-4" style={{ color: "var(--gold)", opacity: 0.3 }}>0{i + 1}</div>
                <p className="text-sm md:text-base leading-relaxed" style={{ color: "var(--text)" }}>{c}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={120}>
          <p className="text-base md:text-lg leading-relaxed max-w-3xl" style={{ color: "var(--text-muted)" }}>{t("body")}</p>
        </Reveal>
      </section>

      {/* Why partner with us */}
      <section className="py-20 md:py-24" style={{ background: "var(--bg-soft)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div className="page-container">
          <Reveal>
            <h2 className="font-display text-4xl md:text-5xl mb-12" style={{ color: "var(--text)" }}>{t("why_title")}</h2>
          </Reveal>
          <div className="grid sm:grid-cols-2 gap-x-12 gap-y-6 max-w-4xl">
            {reasons.map((r, i) => (
              <Reveal key={r} delay={i * 70}>
                <div className="flex gap-3.5 items-start">
                  <Check />
                  <p className="text-sm md:text-base leading-relaxed" style={{ color: "var(--text)" }}>{r}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Closing + enquiry form */}
      <section className="page-container py-20 md:py-24 grid md:grid-cols-2 gap-16 items-start">
        <Reveal>
          <div className="md:sticky md:top-32">
            <h2 className="font-display text-4xl md:text-5xl mb-6" style={{ color: "var(--text)" }}>{t("form_heading")}</h2>
            <p className="text-base leading-relaxed max-w-md" style={{ color: "var(--text-muted)" }}>{t("closing")}</p>

            {/* Direct line to sales — the same address the form posts to. */}
            <div className="mt-10 pt-8 max-w-md" style={{ borderTop: "1px solid var(--border)" }}>
              <p className="text-xs tracking-[0.25em] uppercase mb-3" style={{ color: "var(--text-faint)" }}>
                {t("sales_label")}
              </p>
              <a
                href={`mailto:${SALES_EMAIL}`}
                className="text-lg md:text-xl break-words transition-opacity hover:opacity-70"
                style={{ color: "var(--text)" }}
              >
                {SALES_EMAIL}
              </a>
              <p className="text-sm leading-relaxed mt-3" style={{ color: "var(--text-muted)" }}>
                {t("sales_note")}
              </p>
            </div>
          </div>
        </Reveal>
        <Reveal delay={140}>
          <WholesaleForm />
        </Reveal>
      </section>
    </div>
  );
}
