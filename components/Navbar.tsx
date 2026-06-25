"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function Navbar({ locale }: { locale: string }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const otherLocale = locale === "uk" ? "en" : "uk";
  const otherLocalePath = pathname.replace(`/${locale}`, `/${otherLocale}`);

  const navLinks = [
    { href: `/${locale}/products`, label: t("products") },
    { href: `/${locale}/wholesale`, label: t("wholesale") },
    { href: `/${locale}/about`, label: t("about") },
    { href: `/${locale}/contact`, label: t("contact") },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-[#1a1a1a] bg-[#0a0a0a]/90 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href={`/${locale}`} className="font-bold text-lg tracking-widest text-[#f5f5f5] uppercase">
          Tactical <span className="text-[#c9a84c]">HB</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm tracking-wider text-[#999] hover:text-[#c9a84c] transition-colors uppercase"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href={otherLocalePath}
            className="text-sm tracking-wider border border-[#2a2a2a] px-3 py-1 text-[#999] hover:text-[#c9a84c] hover:border-[#c9a84c] transition-colors uppercase"
          >
            {otherLocale === "uk" ? "УКР" : "ENG"}
          </Link>
        </nav>

        {/* Mobile menu button */}
        <button
          className="md:hidden text-[#999] hover:text-[#c9a84c]"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
        >
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
            {menuOpen ? (
              <path d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#0d0d0d] border-t border-[#1a1a1a] px-6 py-4 flex flex-col gap-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="text-sm tracking-wider text-[#999] hover:text-[#c9a84c] transition-colors uppercase"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href={otherLocalePath}
            onClick={() => setMenuOpen(false)}
            className="text-sm tracking-wider text-[#999] hover:text-[#c9a84c] transition-colors uppercase"
          >
            {otherLocale === "uk" ? "УКР" : "ENG"}
          </Link>
        </div>
      )}
    </header>
  );
}
