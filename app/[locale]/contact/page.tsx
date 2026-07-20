import { useTranslations } from "next-intl";
import ContactForm from "@/components/ContactForm";
import Reveal from "@/components/Reveal";

export default function ContactPage() {
  return <ContactContent />;
}

function ContactContent() {
  const t = useTranslations("contact");

  const methods = [
    {
      label: t("method_email"),
      handle: t("email_value"),
      href: `mailto:${t("email_value")}`,
    },
    {
      label: t("method_instagram"),
      handle: t("instagram_handle"),
      href: "https://instagram.com/tactical_hb",
    },
  ];

  return (
    <div style={{ background: "var(--bg)" }}>
      {/* Hero */}
      <div className="relative overflow-hidden pt-36 pb-20" style={{ background: "var(--bg-soft)", borderBottom: "1px solid var(--border)" }}>
        <div className="absolute inset-0 flex items-center justify-end pr-8 pointer-events-none overflow-hidden">
          <span className="font-display text-[16vw] leading-none select-none" style={{ color: "rgba(23,22,15,0.035)" }}>CONTACT</span>
        </div>
        <div className="page-container relative">
          <Reveal>
            <h1 className="font-display text-6xl md:text-8xl" style={{ color: "var(--text)" }}>{t("title")}</h1>
            <p className="mt-6 text-base md:text-lg leading-relaxed max-w-2xl" style={{ color: "var(--text-muted)" }}>{t("intro")}</p>
          </Reveal>
        </div>
      </div>

      <div className="page-container py-20 grid md:grid-cols-2 gap-16 items-start">
        {/* Contact methods */}
        <Reveal>
          <div className="flex flex-col gap-4">
            {methods.map((m) => (
              <a key={m.label} href={m.href} target={m.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
                className="card-link flex items-center justify-between border p-5"
                style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
                <div>
                  <div className="text-xs tracking-[0.25em] uppercase mb-1" style={{ color: "var(--text-faint)" }}>{m.label}</div>
                  <div className="text-sm font-medium" style={{ color: "var(--text)" }}>{m.handle}</div>
                </div>
                <span style={{ color: "var(--gold)" }}>→</span>
              </a>
            ))}
            <p className="text-sm leading-relaxed mt-2" style={{ color: "var(--text-muted)" }}>{t("response_note")}</p>
          </div>
        </Reveal>

        {/* Message form */}
        <Reveal delay={140}>
          <div>
            <h2 className="font-display text-3xl mb-8" style={{ color: "var(--text)" }}>{t("form_heading")}</h2>
            <ContactForm />
          </div>
        </Reveal>
      </div>
    </div>
  );
}
