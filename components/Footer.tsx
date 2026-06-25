"use client";

import { useTranslations } from "next-intl";

export default function Footer() {
  const t = useTranslations("footer");

  return (
    <footer style={{ background: "var(--ink)" }}>
      <div className="max-w-7xl mx-auto px-6 py-16 flex flex-col items-center text-center gap-8">
        <div className="font-display text-3xl tracking-widest" style={{ color: "#f4f3f0" }}>
          TACTICAL <span style={{ color: "var(--gold-bright)" }}>HB</span>
        </div>

        <a href="https://instagram.com/tactical_hb" target="_blank" rel="noopener noreferrer"
          className="text-sm tracking-[0.2em] uppercase nav-link">
          {t("follow")} <span style={{ color: "var(--gold-bright)" }}>@tactical_hb</span>
        </a>

        <div className="w-full pt-8 flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{ borderTop: "1px solid var(--border-dark)" }}>
          <p className="text-xs tracking-wider" style={{ color: "#6a665e" }}>{t("tagline")}</p>
          <p className="text-xs" style={{ color: "#6a665e" }}>
            © {new Date().getFullYear()} Tactical HB. {t("rights")}
          </p>
        </div>
      </div>
    </footer>
  );
}
