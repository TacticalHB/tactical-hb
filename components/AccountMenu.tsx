"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthContext";

function PersonIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

export default function AccountMenu({ locale }: { locale: string }) {
  const uk = locale === "uk";
  const { user, profile, loading, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const L = {
    account: uk ? "Акаунт" : "Account",
    signIn: uk ? "Увійти" : "Sign in",
    join: uk ? "Приєднатися" : "Join us",
    hi: uk ? "Вітаємо" : "Hi",
    profile: uk ? "Профіль" : "Profile",
    orders: uk ? "Замовлення" : "Orders",
    favourites: uk ? "Обране" : "Favourites",
    loyalty: uk ? "Бонуси" : "Loyalty",
    settings: uk ? "Налаштування" : "Account Settings",
    signOut: uk ? "Вийти" : "Sign Out",
    guestPrompt: uk ? "Увійдіть, щоб бачити бонуси та обране" : "Sign in for loyalty & favourites",
  };

  const links = [
    { href: `/${locale}/account`, label: L.profile },
    { href: `/${locale}/account/orders`, label: L.orders },
    { href: `/${locale}/account/favourites`, label: L.favourites },
    { href: `/${locale}/account/loyalty`, label: L.loyalty },
    { href: `/${locale}/account/settings`, label: L.settings },
  ];

  return (
    <div className="relative flex items-center" ref={wrapRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="nav-link flex items-center justify-center gap-2"
        aria-label={L.account}
        aria-expanded={open}
      >
        <PersonIcon />
        {!loading && user && (
          <span className="hidden lg:inline text-xs tracking-[0.15em] uppercase max-w-[90px] truncate">
            {profile?.first_name || (uk ? "Акаунт" : "Account")}
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed top-[64px] right-3 md:absolute md:top-full md:right-0 md:mt-4 w-[260px] max-w-[calc(100vw-24px)] rounded-xl overflow-hidden z-50"
          style={{ background: "#ffffff", boxShadow: "0 12px 40px rgba(0,0,0,0.28)", border: "1px solid var(--border)" }}
        >
          {user ? (
            <div className="py-2">
              <div className="px-4 py-2">
                <div className="text-[11px] uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>{L.hi}</div>
                <div className="text-sm font-semibold truncate" style={{ color: "var(--ink)" }}>
                  {profile?.first_name ? `${profile.first_name}${profile.surname ? " " + profile.surname : ""}` : user.email}
                </div>
              </div>
              <div className="border-t my-1" style={{ borderColor: "var(--border)" }} />
              {links.map((l) => (
                <Link key={l.href} href={l.href} className="block px-4 py-2.5 text-sm hover:bg-[color:var(--bg-soft)]" style={{ color: "var(--ink)" }}>
                  {l.label}
                </Link>
              ))}
              <div className="border-t my-1" style={{ borderColor: "var(--border)" }} />
              <button
                onClick={() => signOut()}
                className="block w-full text-left px-4 py-2.5 text-sm hover:bg-[color:var(--bg-soft)]"
                style={{ color: "var(--ink)" }}
              >
                {L.signOut}
              </button>
            </div>
          ) : (
            <div className="p-4">
              <p className="text-[13px] mb-3" style={{ color: "var(--text-muted)" }}>{L.guestPrompt}</p>
              <Link
                href={`/${locale}/login`}
                className="block text-center h-11 leading-[44px] rounded-full text-sm font-medium mb-2"
                style={{ background: "var(--ink)", color: "#fff" }}
              >
                {L.signIn}
              </Link>
              <Link
                href={`/${locale}/register`}
                className="block text-center h-11 leading-[44px] rounded-full text-sm font-medium border"
                style={{ borderColor: "var(--border-strong)", color: "var(--ink)" }}
              >
                {L.join}
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
