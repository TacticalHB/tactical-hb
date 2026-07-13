"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useCart } from "./CartContext";
import CartDrawer from "./CartDrawer";
import SearchOverlay from "./SearchOverlay";
import FavouritesMenu from "./FavouritesMenu";

function SearchIcon() {
  return (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <circle cx="9" cy="9" r="6.5" />
      <path d="M14 14l5 5" />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg width="20" height="22" viewBox="0 0 20 22" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M3.2 6.5h13.6l-.9 12.3a1.6 1.6 0 0 1-1.6 1.5H5.7a1.6 1.6 0 0 1-1.6-1.5L3.2 6.5Z" />
      <path d="M7 6.5V5.2a3 3 0 0 1 6 0v1.3" />
    </svg>
  );
}

export default function Navbar({ locale }: { locale: string }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { count, cartOpen, setCartOpen, registerCartIcon, bump } = useCart();

  const otherLocale = locale === "uk" ? "en" : "uk";
  const otherLocalePath = pathname.replace(`/${locale}`, `/${otherLocale}`);

  const navLinks = [
    { href: `/${locale}/products`, label: t("products") },
    { href: `/${locale}/wholesale`, label: t("wholesale") },
    { href: `/${locale}/about`, label: t("about") },
    { href: `/${locale}/contact`, label: t("contact") },
  ];

  const iconBtn = "nav-link relative flex items-center justify-center";

  const bag = (
    <button
      ref={registerCartIcon}
      data-cart-icon=""
      onClick={() => setCartOpen(true)}
      className={iconBtn}
      aria-label="Cart"
    >
      <BagIcon />
      {count > 0 && (
        <span
          key={bump}
          className="cart-badge absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 flex items-center justify-center rounded-full text-[10px] font-semibold tabular-nums"
          style={{ background: "var(--gold-bright)", color: "var(--ink)" }}
        >
          {count}
        </span>
      )}
    </button>
  );

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50"
        style={{ background: "var(--ink)", borderBottom: "1px solid var(--border-dark)" }}
      >
        {/* TCT logo — pinned to the very left edge of the page (Nike-style) */}
        <Link
          href={`/${locale}`}
          aria-label="Tactical HB — home"
          className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 flex items-center transition-opacity hover:opacity-80"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/tct-logo.svg" alt="TCT" className="h-9 w-9 sm:h-10 sm:w-10" />
        </Link>

        <div className="max-w-7xl mx-auto pl-16 sm:pl-20 md:pl-24 pr-6 h-16 flex items-center justify-between">
          <Link href={`/${locale}`} className="hidden md:block font-display text-2xl tracking-widest" style={{ color: "#f4f3f0" }}>
            TACTICAL <span style={{ color: "var(--gold-bright)" }}>HB</span>
          </Link>

          <nav className="hidden md:flex items-center gap-9">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="nav-link text-xs tracking-[0.2em] uppercase">
                {link.label}
              </Link>
            ))}
            <button onClick={() => setSearchOpen(true)} className={iconBtn} aria-label="Search">
              <SearchIcon />
            </button>
            <FavouritesMenu locale={locale} />
            {bag}
            <Link href={otherLocalePath} className="nav-lang text-xs tracking-[0.2em] uppercase px-3 py-1.5 border">
              {otherLocale === "uk" ? "УКР" : "ENG"}
            </Link>
          </nav>

          {/* Mobile right cluster */}
          <div className="flex md:hidden items-center gap-5 ml-auto">
            <button onClick={() => setSearchOpen(true)} className={iconBtn} aria-label="Search">
              <SearchIcon />
            </button>
            <FavouritesMenu locale={locale} />
            {bag}
            <button className="nav-link" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5">
                {menuOpen ? <path d="M6 18L18 6M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
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

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} locale={locale} />
      <CartDrawer locale={locale} />
    </>
  );
}
