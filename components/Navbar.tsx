"use client";

import Link from "next/link";
import Wordmark from "@/components/Wordmark";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useCart } from "./CartContext";
import CartDrawer from "./CartDrawer";
import AddedToBagPanel from "./AddedToBagPanel";
import SearchOverlay from "./SearchOverlay";
import AccountMenu from "./AccountMenu";
import LocaleSwitch from "@/components/LocaleSwitch";

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
  /* Icon-only controls carry their name in aria-label, so it has to be a
     translated one — four buttons announced in English was the whole of the
     mobile bar speaking the wrong language. */
  const a = useTranslations("a11y");
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { count, setCartOpen, registerCartIcon, bump } = useCart();


  // Checkout runs on its own minimal chrome — every nav link there is a way to
  // lose someone mid-purchase. Declared after the hooks so hook order is stable.
  const onCheckout = pathname.startsWith(`/${locale}/checkout`);

  const navLinks = [
    { href: `/${locale}/products`, label: t("products") },
    { href: `/${locale}/wholesale`, label: t("wholesale") },
    { href: `/${locale}/about`, label: t("about") },
    { href: `/${locale}/contact`, label: t("contact") },
  ];

  /* THE HIT AREA IS 44px, THE ICON STAYS 20px. Measured at 375 these were the
     four things a phone user actually presses — search, account, bag, menu —
     and they were 20×20, 21×21, 20×22 and 24×24. Under a thumb that is a
     coin-toss between opening the bag and opening the menu.

     The box grows, not the artwork: `w-11 h-11` with the icon centred, and
     `-mx-1.5` pulling the boxes back together so the icons stay the same
     distance apart as before. Without that the row would grow by ~70px and
     shove the wordmark off a 375 screen — the fix for one defect creating a
     worse one. */
  const iconBtn =
    "nav-link relative flex items-center justify-center w-11 h-11 -mx-1.5 shrink-0";

  const bag = (
    <button
      ref={registerCartIcon}
      data-cart-icon=""
      onClick={() => setCartOpen(true)}
      className={iconBtn}
      aria-label={a("cart")}
    >
      {/* THE BADGE HANGS OFF THE ICON, NOT OFF THE BUTTON. It used to be
          positioned against the button box, which was the same size as the
          glyph — then the box grew to 44px for the thumb and the badge went
          with it, ending up adrift in the corner of an invisible square with
          no obvious relationship to the bag. This wrapper is the icon's own
          bounds, so the count sits on the bag at any button size. */}
      <span className="relative flex items-center justify-center">
        <BagIcon />
        {count > 0 && (
          <span
            key={bump}
            className="cart-badge absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 flex items-center justify-center rounded-full text-[10px] font-semibold tabular-nums"
            style={{ background: "var(--accent)", color: "var(--ink)" }}
          >
            {count}
          </span>
        )}
      </span>
    </button>
  );

  if (onCheckout) return null;

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50"
        /* THE RIB FIELD, and it is the packaging's, not a texture for its own
           sake: fine vertical slats in the matt black the pouch is printed on.

           DARK ON DARKER, NOT LIGHT ON DARK. A white-alpha rib would lighten
           the ground, and .nav-link (#9a978f) already sits at about 4.6:1 here
           — barely over AA. Lightening the bar would push it under. Darkening
           it moves the other way, so the ribs make the links slightly EASIER
           to read than the flat bar did, never harder.

           AMPLITUDE IS THE DIAL. If this ever reads as busy, lower the alpha
           rather than widening the pitch: wider slats start to look like bars
           behind the type, which is the failure mode to avoid.

           Static, so there is nothing for prefers-reduced-motion to turn off. */
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg," +
            " rgba(0,0,0,0.20) 0px," +
            " rgba(0,0,0,0.00) 5px," +
            " rgba(0,0,0,0.00) 9px," +
            " rgba(0,0,0,0.20) 14px), var(--fog)",
          borderBottom: "1px solid var(--border-dark)",
        }}
      >
        {/* The TCT mark used to sit pinned to the very left edge here. It was
            removed deliberately — the wordmark alone carries the brand in the
            bar. On md+ the left padding stays: it is what holds the wordmark in
            the position it has always occupied, so nothing else in the bar
            moves. On mobile that padding is now gone, because there is a
            wordmark to put there.

            THE WORDMARK IS NO LONGER DESKTOP-ONLY. It was `hidden md:block`,
            which left the phone — the first touchpoint for most of this
            audience — showing a bar of four unlabelled icons and no brand at
            all. It is the smaller `text-xl` here so the four icons on the
            right keep their spacing at 375px; below that the flex row shrinks
            it rather than wrapping. */}
        <div className="page-container pl-5 sm:pl-16 md:pl-20 h-16 flex items-center justify-between gap-3">
          <Link
            href={`/${locale}`}
            /* flex + h-11 so the home link is a full-height target rather than
               a 28px band of text in the middle of the bar. */
            /* Sizing only — the lockup itself lives in components/Wordmark,
               shared with the footer so the two cannot drift apart again. */
            className="flex items-center h-11 shrink-0"
            /* dir="ltr" travels with the mark now, inside Wordmark. */
          >
            <Wordmark className="text-[15px] md:text-[17px]" />
          </Link>

          <nav className="hidden md:flex items-center gap-9">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="nav-link text-xs tracking-[0.2em] uppercase">
                {link.label}
              </Link>
            ))}
            <button onClick={() => setSearchOpen(true)} className={iconBtn} aria-label={a("search")}>
              <SearchIcon />
            </button>
            {bag}
            <AccountMenu locale={locale} />
            {/* One compact trigger that opens the four — see LocaleSwitch.
                It used to be the four badges inline, which at four locales was
                eight glyphs and three dots wedged against the bag icon. */}
            <LocaleSwitch locale={locale} className="ms-1" />
          </nav>

          {/* Mobile right cluster. gap-1 rather than gap-5: the buttons now
              carry 44px boxes with 12px of padding built in, so the old 20px
              gap on top of that would have spread four icons across 250px. */}
          <div className="flex md:hidden items-center gap-1 ml-auto">
            <button onClick={() => setSearchOpen(true)} className={iconBtn} aria-label={a("search")}>
              <SearchIcon />
            </button>
            <AccountMenu locale={locale} />
            {bag}
            <button className={iconBtn} onClick={() => setMenuOpen(!menuOpen)} aria-label={a("menu")} aria-expanded={menuOpen}>
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5">
                {menuOpen ? <path d="M6 18L18 6M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>

        {/* The menu sheet.

            EVERY ROW IS 44px TALL AND FULL WIDTH. They were 20px lines of text
            with 20px between them, which on a phone means the gap between two
            links is bigger than either link — the classic mis-tap.

            IT SCROLLS RATHER THAN OVERFLOWING. Five rows fit any phone today,
            but the sheet hangs off a fixed header and a sixth link, or a
            landscape phone at 375×390, would push the last row under the fold
            with no way to reach it. max-height is measured from the bar's own
            64px so it can never exceed what is left of the screen.

            The bottom padding carries the safe-area inset, so on a notched
            device in landscape the final row does not sit under the home
            indicator. */}
        {menuOpen && (
          <div
            className="md:hidden border-t px-6 pt-2 flex flex-col overflow-y-auto overscroll-contain"
            style={{
              background: "#1c1f24",
              borderColor: "var(--border-dark)",
              maxHeight: "calc(100dvh - 64px)",
              paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))",
            }}
          >
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)}
                className="nav-link text-xs tracking-[0.2em] uppercase flex items-center h-11">
                {link.label}
              </Link>
            ))}
            {/* THE MENU GETS ROWS, NOT A POPOVER. A dropdown opening inside
                an already-open sheet is a layer on a layer, and on a phone the
                panel would have to decide whether to cover the links it just
                sat under. Four full-width 44px rows are easier to hit and read
                as part of the menu rather than as a control bolted into it.

                Each language names ITSELF — a visitor stranded on the wrong
                storefront is looking for the word they recognise, and
                "Українська" is that word in a way "UA" is not. */}
            <div
              className="mt-2 pt-3"
              style={{ borderTop: "1px solid var(--border-dark)" }}
            >
              <span
                className="block text-xs tracking-[0.2em] uppercase mb-1"
                style={{ color: "#5c5a55" }}
                lang="en"
              >
                {t("language")}
              </span>
              <LocaleSwitch
                locale={locale}
                variant="list"
                onNavigate={() => setMenuOpen(false)}
              />
            </div>
          </div>
        )}
      </header>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} locale={locale} />
      <CartDrawer locale={locale} />
      <AddedToBagPanel locale={locale} />
    </>
  );
}
