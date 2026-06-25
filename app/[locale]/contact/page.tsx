import { useTranslations } from "next-intl";
import ContactForm from "@/components/ContactForm";

export default function ContactPage() {
  return <ContactContent />;
}

function ContactContent() {
  const t = useTranslations("contact");

  return (
    <div className="pt-16">
      <div className="max-w-7xl mx-auto px-6 py-20">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">{t("title")}</h1>
        <p className="text-[#888] text-lg mb-16 max-w-xl">{t("subtitle")}</p>

        <div className="grid md:grid-cols-2 gap-16">
          <ContactForm />

          <div className="flex flex-col gap-6 justify-start pt-2">
            {[
              { label: t("instagram"), href: "https://instagram.com/tactical_hb", icon: "IG" },
              { label: t("telegram"), href: "https://t.me/tactical_hb", icon: "TG" },
              { label: t("whatsapp"), href: "https://wa.me/", icon: "WA" },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 border border-[#1a1a1a] p-5 hover:border-[#c9a84c]/40 transition-colors group"
              >
                <span className="text-xs font-bold text-[#c9a84c] w-8">{link.icon}</span>
                <span className="text-sm tracking-wider text-[#888] group-hover:text-[#f5f5f5] transition-colors">
                  {link.label}
                </span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
