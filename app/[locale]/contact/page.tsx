import { useTranslations } from "next-intl";
import ContactForm from "@/components/ContactForm";

export default function ContactPage() {
  return <ContactContent />;
}

function ContactContent() {
  const t = useTranslations("contact");

  return (
    <div className="pt-16" style={{ background: "var(--bg)" }}>
      <div className="relative overflow-hidden py-16 px-6" style={{ background: "var(--bg-dark)" }}>
        <div className="absolute inset-0 flex items-center justify-end pr-12 pointer-events-none overflow-hidden">
          <span className="font-display text-[15vw] leading-none select-none" style={{ color: "#ffffff04" }}>CONTACT</span>
        </div>
        <div className="max-w-7xl mx-auto relative">
          <h1 className="font-display text-5xl md:text-7xl" style={{ color: "#fff" }}>{t("title")}</h1>
          <p className="mt-3 text-sm" style={{ color: "#777" }}>{t("subtitle")}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-16">
        <ContactForm />
        <div className="flex flex-col gap-4 pt-2">
          {[
            { label: "Instagram", handle: "@tactical_hb", href: "https://instagram.com/tactical_hb" },
            { label: "Telegram", handle: "@tactical_hb", href: "https://t.me/tactical_hb" },
            { label: "WhatsApp", handle: t("whatsapp"), href: "https://wa.me/" },
          ].map((link) => (
            <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer"
              className="card-link flex items-center justify-between border p-5">
              <div>
                <div className="text-xs tracking-widest uppercase mb-1" style={{ color: "var(--text-muted)" }}>{link.label}</div>
                <div className="text-sm font-medium" style={{ color: "var(--text)" }}>{link.handle}</div>
              </div>
              <span style={{ color: "var(--border-light)" }}>→</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
