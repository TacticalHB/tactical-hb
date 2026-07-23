"use client";

import { useTranslations, useLocale } from "next-intl";
import { usePathname } from "next/navigation";
import CookieSettingsButton from "./CookieSettingsButton";
import NewsletterPromo from "./NewsletterPromo";
import PaymentMethods from "./PaymentMethods";
import { ADMIN_EMAIL, SALES_EMAIL } from "@/lib/contact-info";

export default function Footer() {
  const t = useTranslations("footer");
  const locale = useLocale();
  const pathname = usePathname();

  // Checkout uses its own minimal chrome — see Navbar.
  if (pathname.startsWith(`/${locale}/checkout`)) return null;

  return (
    <footer style={{ background: "var(--fog)" }}>
      <div className="page-container py-16 flex flex-col items-center text-center gap-8">
        <div className="font-display text-3xl tracking-widest" style={{ color: "#f4f3f0" }}>
          TACTICAL <span style={{ color: "var(--accent)" }}>HB</span>
        </div>

        <a href="https://instagram.com/tactical_hb" target="_blank" rel="noopener noreferrer"
          className="text-sm tracking-[0.2em] uppercase nav-link">
          {t("follow")} <span style={{ color: "var(--accent)" }}>@tactical_hb</span>
        </a>

        {/* Contact addresses — site-wide, so neither inbox is more than a
            scroll away from any page. */}
        <div className="flex flex-col sm:flex-row items-center gap-x-10 gap-y-3">
          {[
            { label: t("email_general"), email: ADMIN_EMAIL },
            { label: t("email_sales"), email: SALES_EMAIL },
          ].map((c) => (
            <div key={c.email} className="text-center sm:text-left">
              <div className="text-[10px] tracking-[0.25em] uppercase mb-1" style={{ color: "#6a665e" }}>
                {c.label}
              </div>
              <a
                href={`mailto:${c.email}`}
                className="text-sm break-words transition-colors"
                style={{ color: "#c9c5bd" }}
              >
                {c.email}
              </a>
            </div>
          ))}
        </div>

        {/* Newsletter prompt — footer and cart page only. */}
        <div className="w-full max-w-[560px] flex justify-center pt-2">
          <NewsletterPromo locale={locale} variant="dark" />
        </div>

        {/* Accepted payment methods — the brands a customer meets on Monobank's
            secure page. */}
        <div className="flex flex-col items-center gap-3 pt-2">
          <span className="text-[10px] tracking-[0.25em] uppercase" style={{ color: "#6a665e" }}>
            {t("payment_methods")}
          </span>
          <PaymentMethods />
        </div>

        <div className="w-full pt-8 flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{ borderTop: "1px solid var(--border-dark)" }}>
          <p className="text-xs tracking-wider" style={{ color: "#6a665e" }}>{t("tagline")}</p>
          <div className="flex items-center gap-4">
            {/* Reopen the granular cookie settings at any time */}
            <CookieSettingsButton
              locale={locale}
              className="text-xs underline underline-offset-2 transition-opacity hover:opacity-70"
              style={{ color: "#6a665e" }}
            />
            <p className="text-xs" style={{ color: "#6a665e" }}>
              © {new Date().getFullYear()} Tactical HB. {t("rights")}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
