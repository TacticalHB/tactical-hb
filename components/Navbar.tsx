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
    <header
      className="fixed top-0 left-0 right-0 z-50"
      style={{ background: "var(--ink)", borderBottom: "1px solid var(--border-dark)" }}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href={`/${locale}`} className="font-display text-2xl tracking-widest" style={{ color: "#f4f3f0" }}>
          TACTICAL <span style={{ color: "var(--gold-bright)" }}>HB</span>
        </Link>

        <nav className="hidden md:flex items-center gap-10">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="nav-link text-xs tracking-[0.2em] uppercase">
              {link.label}
            </Link>
          ))}
          <Link href={otherLocalePath} className="nav-lang text-xs tracking-[0.2em] uppercase px-3 py-1.5 border">
            {otherLocale === "uk" ? "УКР" : "ENG"}
          </Link>
        </nav>

        <button className="md:hidden nav-link" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5">
            {menuOpen ? <path d="M6 18L18 6M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t px-6 py-6 flex flex-col gap-5"
          style={{ background: "var(--ink-2)", borderColor: "var(--border-dark)" }}>
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)}
              className="nav-link text-xs tracking-[0.2em] uppercase">
              {link.label}
            </Link>
          ))}
          <Link href={otherLocalePath} onClick={() => setMenuOpen(false)}
            className="nav-link text-xs tracking-[0.2em] uppercase">
            {otherLocale === "uk" ? "УКР" : "ENG"}
          </Link>
        </div>
      )}
    </header>
  );
}
