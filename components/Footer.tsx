"use client";

import { useTranslations } from "next-intl";

export default function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="border-t border-[#1a1a1a] py-10 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-[#555]">
        <div>
          <span className="font-bold text-[#f5f5f5] tracking-widest uppercase">
            Tactical <span className="text-[#c9a84c]">HB</span>
          </span>
          <p className="mt-1">{t("tagline")}</p>
        </div>
        <p>© {new Date().getFullYear()} Tactical HB. {t("rights")}</p>
      </div>
    </footer>
  );
}
