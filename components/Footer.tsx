"use client";

import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import CookieSettingsButton from "./CookieSettingsButton";
import NewsletterPromo from "./NewsletterPromo";
import PaymentMethods from "./PaymentMethods";
import SocialLinks from "./SocialLinks";
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

        {/* Social — ONE cluster, label above the marks.

            This replaced a plain "Follow us @tactical_hb" link to Instagram.
            Keeping both would have said the same thing twice and named only one
            of the three accounts; all three are @tactical_hb, so the handle now
            lives in the icons' aria-labels and titles instead of on screen.

            Column, not a row, so the label owns the marks the way the payment
            label owns its brands further down — the same fix the newsletter
            mark needed. */}
        <div className="flex flex-col items-center gap-3.5">
          <span className="text-sm tracking-[0.2em] uppercase" style={{ color: "#9a978f" }}>
            {t("follow")}
          </span>
          <SocialLinks />
        </div>

        {/* Store policies, side by side. The offer is the legal document; the
            delivery page is the plain-language version of the same model; the
            privacy policy is the one the consent checkboxes point at, which is
            why it has to be reachable from every page rather than only from
            the form that mentions it. */}
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          <Link href={`/${locale}/delivery`} className="text-sm tracking-[0.2em] uppercase nav-link">
            {t("link_delivery")}
          </Link>
          <Link href={`/${locale}/offer`} className="text-sm tracking-[0.2em] uppercase nav-link">
            {t("link_offer")}
          </Link>
          <Link href={`/${locale}/privacy`} className="text-sm tracking-[0.2em] uppercase nav-link">
            {t("link_privacy")}
          </Link>
        </div>

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

        {/* Newsletter prompt — footer and cart page only. The wrapper only
            centres; the promo itself is inline-flex, so the mark and the
            sentence size to their content and read as one block instead of the
            logo floating at the left edge of a 560px row. */}
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
