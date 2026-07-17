import { useTranslations } from "next-intl";
import ContactForm from "@/components/ContactForm";
import Reveal from "@/components/Reveal";

export default function ContactPage() {
  return <ContactContent />;
}

function ContactContent() {
  const t = useTranslations("contact");

  return (
    <div style={{ background: "var(--bg)" }}>
      <div className="relative overflow-hidden pt-36 pb-20" style={{ background: "var(--bg-soft)", borderBottom: "1px solid var(--border)" }}>
        <div className="absolute inset-0 flex items-center justify-end pr-8 pointer-events-none overflow-hidden">
          <span className="font-display text-[16vw] leading-none select-none" style={{ color: "rgba(23,22,15,0.035)" }}>CONTACT</span>
        </div>
        <div className="page-container relative">
          <Reveal>
            <h1 className="font-display text-6xl md:text-8xl" style={{ color: "var(--text)" }}>{t("title")}</h1>
            <p className="mt-4 text-sm" style={{ color: "var(--text-muted)" }}>{t("subtitle")}</p>
          </Reveal>
        </div>
      </div>

      <div className="page-container py-20 grid md:grid-cols-2 gap-16">
        <Reveal>
          <ContactForm />
        </Reveal>
        <Reveal delay={140}>
          <div className="flex flex-col gap-4 pt-2">
            {[
              { label: "Instagram", handle: "@tactical_hb", href: "https://instagram.com/tactical_hb" },
              { label: "Telegram", handle: "@tactical_hb", href: "https://t.me/tactical_hb" },
              { label: "WhatsApp", handle: t("whatsapp"), href: "https://wa.me/" },
            ].map((link) => (
              <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer"
                className="card-link flex items-center justify-between border p-5"
                style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
                <div>
                  <div className="text-xs tracking-[0.25em] uppercase mb-1" style={{ color: "var(--text-faint)" }}>{link.label}</div>
                  <div className="text-sm font-medium" style={{ color: "var(--text)" }}>{link.handle}</div>
                </div>
                <span style={{ color: "var(--gold)" }}>→</span>
              </a>
            ))}
          </div>
        </Reveal>
      </div>
    </div>
  );
}
