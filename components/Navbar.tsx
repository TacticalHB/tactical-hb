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
    <header className="fixed top-0 left-0 right-0 z-50" style={{ background: "var(--bg-dark)" }}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link
          href={`/${locale}`}
          className="font-display text-2xl tracking-widest"
          style={{ color: "#fff" }}
        >
          TACTICAL <span style={{ color: "var(--gold)" }}>HB</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-10">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xs tracking-[0.2em] uppercase transition-colors"
              style={{ color: "#aaa" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--gold)")}
              onMouseLeave={e => (e.currentTarget.style.color = "#aaa")}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href={otherLocalePath}
            className="text-xs tracking-[0.2em] uppercase px-3 py-1.5 border transition-colors"
            style={{ color: "#aaa", borderColor: "#333" }}
            onMouseEnter={e => {
              e.currentTarget.style.color = "var(--gold)";
              e.currentTarget.style.borderColor = "var(--gold)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = "#aaa";
              e.currentTarget.style.borderColor = "#333";
            }}
          >
            {otherLocale === "uk" ? "УКР" : "ENG"}
          </Link>
        </nav>

        {/* Mobile button */}
        <button
          className="md:hidden"
          style={{ color: "#aaa" }}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
        >
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5">
            {menuOpen
              ? <path d="M6 18L18 6M6 6l12 12" />
              : <path d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          className="md:hidden border-t px-6 py-6 flex flex-col gap-5"
          style={{ background: "var(--bg-dark-2)", borderColor: "var(--border-dark)" }}
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="text-xs tracking-[0.2em] uppercase"
              style={{ color: "#aaa" }}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href={otherLocalePath}
            onClick={() => setMenuOpen(false)}
            className="text-xs tracking-[0.2em] uppercase"
            style={{ color: "#aaa" }}
          >
            {otherLocale === "uk" ? "УКР" : "ENG"}
          </Link>
        </div>
      )}
    </header>
  );
}
