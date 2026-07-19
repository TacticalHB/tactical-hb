"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthContext";

export default function AccountNav({ locale, isAdmin = false }: { locale: string; isAdmin?: boolean }) {
  const uk = locale === "uk";
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();

  const base = `/${locale}/account`;
  const items = [
    { href: base, label: uk ? "Профіль" : "Profile" },
    { href: `${base}/orders`, label: uk ? "Замовлення" : "Orders" },
    { href: `${base}/favourites`, label: uk ? "Обране" : "Favourites" },
    { href: `${base}/loyalty`, label: uk ? "Бонуси" : "Loyalty" },
    { href: `${base}/settings`, label: uk ? "Налаштування" : "Account Settings" },
  ];

  // Admin-only. Hiding it is a convenience, not the security boundary — the
  // page 404s and the redeem action refuses independently for non-admins.
  if (isAdmin) {
    items.push({
      href: `${base}/admin/vouchers`,
      label: uk ? "Ваучери (адмін)" : "Vouchers (admin)",
    });
  }

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
              {it.label}
            </Link>
          </li>
        ))}
        <li className="shrink-0 md:mt-2">
          <button
            onClick={doSignOut}
            className="block w-full text-left whitespace-nowrap rounded-lg px-4 py-2.5 text-sm hover:bg-[color:var(--bg-soft)]"
            style={{ color: "var(--text-muted)" }}
          >
            {uk ? "Вийти" : "Sign Out"}
          </button>
        </li>
      </ul>
    </nav>
  );
}
