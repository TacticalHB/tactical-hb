"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";

export default function Footer() {
  const t = useTranslations("footer");

  return (
    <footer style={{ background: "var(--bg-dark)", color: "#aaa" }}>
      <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row items-start justify-between gap-8">
        <div>
          <div className="font-display text-2xl tracking-widest mb-2" style={{ color: "#fff" }}>
            TACTICAL <span style={{ color: "var(--gold)" }}>HB</span>
          </div>
          <p className="text-xs tracking-wider" style={{ color: "#666" }}>{t("tagline")}</p>
        </div>
        <div className="flex gap-6 text-xs tracking-widest uppercase" style={{ color: "#555" }}>
          <a href="https://instagram.com/tactical_hb" target="_blank" rel="noopener noreferrer"
            className="hover:text-white transition-colors">Instagram</a>
          <a href="https://t.me/tactical_hb" target="_blank" rel="noopener noreferrer"
            className="hover:text-white transition-colors">Telegram</a>
        </div>
        <p className="text-xs" style={{ color: "#444" }}>
          © {new Date().getFullYear()} Tactical HB. {t("rights")}
        </p>
      </div>
    </footer>
  );
}
