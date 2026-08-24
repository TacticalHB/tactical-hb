"use client";

import Link from "next/link";
import { t } from "@/lib/i18n-text";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthContext";
import RankBadge from "./RankBadge";
import type { Rank } from "@/lib/loyalty/ranks";

export default function AccountNav({ locale, rank }: { locale: string; rank?: Rank | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();

  const base = `/${locale}/account`;
  const items = [
    { href: base, label: t(locale, { uk: "Профіль", en: "Profile", ja: "プロフィール", ar: "الملف الشخصي" }) },
    { href: `${base}/orders`, label: t(locale, { uk: "Замовлення", en: "Orders", ja: "ご注文", ar: "الطلبات" }) },
    { href: `${base}/favourites`, label: t(locale, { uk: "Обране", en: "Favourites", ja: "お気に入り", ar: "المفضّلة" }) },
    { href: `${base}/loyalty`, label: t(locale, { uk: "Бонуси", en: "Loyalty", ja: "ロイヤルティ", ar: "الولاء" }), badge: true },
    { href: `${base}/settings`, label: t(locale, { uk: "Налаштування", en: "Account Settings", ja: "アカウント設定", ar: "إعدادات الحساب" }) },
  ];

  // The admin links that used to pile up here were Phase A–D scaffolding.
  // Phase E gave the OS its own shell: admins enter through the person icon
  // (AccountMenu routes them to /admin) and navigate in the console sidebar.

  const isActive = (href: string) =>
    href === base ? pathname === base || pathname === `${base}/` : pathname.startsWith(href);

  const doSignOut = async () => {
    await signOut();
    router.push(`/${locale}`);
  };

  return (
    <nav className="md:w-56 shrink-0">
      <ul className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible -mx-1 md:mx-0 px-1 md:px-0">
        {items.map((it) => (
          <li key={it.href} className="shrink-0">
            <Link
              href={it.href}
              className="block whitespace-nowrap rounded-lg px-4 py-2.5 text-sm transition-colors"
              style={
                isActive(it.href)
                  ? { background: "var(--ink)", color: "#fff", fontWeight: 500 }
                  : { color: "var(--ink)" }
              }
            >
              {/* Icon only at this size — the insignia carries its own
                  wordmark, which is illegible at 22px and is not needed
                  beside a link already labelled "Loyalty". */}
              {it.badge && rank ? (
                <span className="inline-flex items-center gap-2">
                  <RankBadge rank={rank} size={22} locale={locale} />
                  {it.label}
                </span>
              ) : (
                it.label
              )}
            </Link>
          </li>
        ))}
        <li className="shrink-0 md:mt-2">
          <button
            onClick={doSignOut}
            className="block w-full text-left whitespace-nowrap rounded-lg px-4 py-2.5 text-sm hover:bg-[color:var(--bg-soft)]"
            style={{ color: "var(--text-muted)" }}
          >
            {t(locale, { uk: "Вийти", en: "Sign Out", ja: "ログアウト", ar: "تسجيل الخروج" })}
          </button>
        </li>
      </ul>
    </nav>
  );
}
