"use client";

import Link from "next/link";
import { t } from "@/lib/i18n-text";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
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
  const { user, profile, loading, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  // Holds the user id admin status was confirmed FOR, so a sign-out or a
  // switch to another account can never leave a stale "yes" behind.
  const [adminFor, setAdminFor] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  /* Close the dropdown when the route changes. Adjusted during render rather
     than in an effect: an effect would paint the menu still open over the new
     page for a frame before closing it. */
  const [openOnPath, setOpenOnPath] = useState(pathname);
  if (openOnPath !== pathname) {
    setOpenOnPath(pathname);
    setOpen(false);
  }

  // Phase E: an admin's person icon opens the console, not the dropdown.
  // ADMIN_EMAILS lives server-side, so ask /api/admin/me once per sign-in.
  useEffect(() => {
    if (!user) return;
    const uid = user.id;
    let cancelled = false;
    fetch("/api/admin/me")
      .then((r) => (r.ok ? r.json() : { admin: false }))
      .then((d) => !cancelled && setAdminFor(d.admin === true ? uid : null))
      .catch(() => !cancelled && setAdminFor(null));
    return () => {
      cancelled = true;
    };
  }, [user]);

  const isAdmin = !!user && adminFor === user.id;

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
    account: t(locale, { uk: "Акаунт", en: "Account", ja: "アカウント" }),
    signIn: t(locale, { uk: "Увійти", en: "Sign in", ja: "ログイン" }),
    join: t(locale, { uk: "Приєднатися", en: "Join us", ja: "登録する" }),
    hi: t(locale, { uk: "Вітаємо", en: "Hi", ja: "こんにちは" }),
    profile: t(locale, { uk: "Профіль", en: "Profile", ja: "プロフィール" }),
    orders: t(locale, { uk: "Замовлення", en: "Orders", ja: "ご注文" }),
    favourites: t(locale, { uk: "Обране", en: "Favourites", ja: "お気に入り" }),
    loyalty: t(locale, { uk: "Бонуси", en: "Loyalty", ja: "ロイヤルティ" }),
    settings: t(locale, { uk: "Налаштування", en: "Account Settings", ja: "アカウント設定" }),
    signOut: t(locale, { uk: "Вийти", en: "Sign Out", ja: "ログアウト" }),
    guestPrompt: t(locale, { uk: "Увійдіть, щоб бачити бонуси та обране", en: "Sign in for loyalty & favourites", ja: "ログインしてロイヤルティとお気に入りを利用" }),
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
        onClick={() => (isAdmin ? router.push(`/${locale}/admin`) : setOpen((o) => !o))}
        /* 44px tall so the thumb has something to hit — it was a bare 21px
           icon. min-w rather than a fixed width because on lg it also carries
           the customer's first name beside the mark. The negative inline
           margin keeps the icon where it sat in the row. */
        className="nav-link flex items-center justify-center gap-2 h-11 min-w-11 -mx-1.5 shrink-0"
        aria-label={isAdmin ? (t(locale, { uk: "Командний центр", en: "Command centre", ja: "コマンドセンター" })) : L.account}
        aria-expanded={isAdmin ? undefined : open}
      >
        <PersonIcon />
        {!loading && user && (
          <span className="hidden lg:inline text-xs tracking-[0.15em] uppercase max-w-[90px] truncate">
            {profile?.first_name || (t(locale, { uk: "Акаунт", en: "Account", ja: "アカウント" }))}
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
