import type { Metadata } from "next";
import { metadataFor } from "@/lib/seo";
import { useTranslations } from "next-intl";
import ContactForm from "@/components/ContactForm";
import Reveal from "@/components/Reveal";
import { SALES_EMAIL, SOCIAL_HANDLE, SOCIAL_URLS, LINKEDIN_NAME } from "@/lib/contact-info";


export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return metadataFor({ locale, path: "/contact", key: "contact" });
}

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
      // Wholesale and sales go to a separate inbox; general enquiries stay above.
      label: t("method_sales"),
      handle: SALES_EMAIL,
      href: `mailto:${SALES_EMAIL}`,
    },
    /* The three social rows. Same shape as the two above them, so they inherit
       the row's height, type and arrow rather than introducing a second visual
       language for links that happen to be social.

       Handles come from lib/contact-info, not from the message files: they are
       proper nouns, identical in both locales, and keeping them beside the
       footer's marks is what stops the two drifting to different spellings of
       the same account — which had already happened to Instagram. */
    {
      label: t("method_instagram"),
      handle: SOCIAL_HANDLE,
      href: SOCIAL_URLS.instagram,
    },
    {
      label: t("method_tiktok"),
      handle: SOCIAL_HANDLE,
      href: SOCIAL_URLS.tiktok,
    },
    {
      // LinkedIn has no @handle — the company page carries a name instead.
      label: t("method_linkedin"),
      handle: LINKEDIN_NAME,
      href: SOCIAL_URLS.linkedin,
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
                <span style={{ color: "var(--accent-ink)" }}>→</span>
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
