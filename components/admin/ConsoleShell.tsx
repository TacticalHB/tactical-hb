"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/AuthContext";

/* ---------------------------------------------------------------------------
   THB-OS console frame: department sidebar, shop exit, its own sign-out.

   Reachability rule, Phase E edition: EVERY /admin page must appear both here
   and on the ops map (components/admin/OfficeMap via the home page). The old
   AccountNav scaffolding is gone — this sidebar is now the doorway Mario uses,
   so a page missing from this list ships invisible.
--------------------------------------------------------------------------- */

type NavItem = { href: string; en: string; uk: string };
type NavSection = { en: string; uk: string; items: NavItem[] };

const SECTIONS: NavSection[] = [
  {
    en: "Command",
    uk: "Командування",
    items: [
      { href: "", en: "Ops map", uk: "Мапа" },
      { href: "/brief", en: "Weekly Brief", uk: "Тижневий бриф" },
    ],
  },
  {
    en: "Commerce",
    uk: "Продажі",
    items: [
      { href: "/orders", en: "Orders", uk: "Замовлення" },
      { href: "/vouchers", en: "Vouchers", uk: "Ваучери" },
    ],
  },
  {
    en: "Stock & Production",
    uk: "Склад і виробництво",
    items: [
      { href: "/stock", en: "Stock", uk: "Склад" },
      { href: "/advisor", en: "Stock Advisor", uk: "Радник складу" },
    ],
  },
  {
    en: "Suppliers & Costs",
    uk: "Постачання і витрати",
    items: [
      { href: "/costs", en: "Costs", uk: "Витрати" },
      { href: "/suppliers", en: "Suppliers", uk: "Постачальники" },
    ],
  },
  {
    en: "Workshop",
    uk: "Майстерня",
    items: [{ href: "/workshop", en: "Machines", uk: "Машини" }],
  },
  {
    en: "Finance",
    uk: "Фінанси",
    items: [
      { href: "/finance", en: "Finance", uk: "Фінанси" },
      { href: "/margin", en: "Cost & Margin Guard", uk: "Вартість і маржа" },
    ],
  },
  {
    en: "Wholesale CRM",
    uk: "Опт",
    items: [
      { href: "/partners", en: "Partners", uk: "Партнери" },
      { href: "/followups", en: "Follow-ups", uk: "Листи партнерам" },
    ],
  },
  {
    en: "Marketing",
    uk: "Маркетинг",
    items: [
      { href: "/marketing", en: "Marketing", uk: "Маркетинг" },
      { href: "/strategist", en: "Strategist", uk: "Стратег" },
    ],
  },
  {
    en: "Projects",
    uk: "Проєкти",
    items: [{ href: "/projects", en: "Projects & Exhibitions", uk: "Проєкти та виставки" }],
  },
];

export default function ConsoleShell({
  locale,
  children,
}: {
  locale: string;
  children: React.ReactNode;
}) {
  const uk = locale === "uk";
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);

  const base = `/${locale}/admin`;
  const otherLocale = uk ? "en" : "uk";
  const otherLocalePath = pathname.replace(`/${locale}`, `/${otherLocale}`);

  const isActive = (href: string) =>
    href === "" ? pathname === base || pathname === `${base}/` : pathname.startsWith(base + href);

  const doSignOut = async () => {
    await signOut();
    router.push(`/${locale}`);
  };

  const sidebar = (
    <div className="flex h-full flex-col" style={{ background: "var(--console-panel)" }}>
      {/* On mobile the top bar already carries the wordmark. */}
      <Link href={base} className="hidden lg:block px-5 pt-5 pb-4">
        <span className="font-display text-2xl tracking-widest" style={{ color: "var(--console-text)" }}>
          THB<span style={{ color: "var(--console-accent)" }}>-OS</span>
        </span>
        <span className="block text-[10px] tracking-[0.22em] uppercase mt-0.5" style={{ color: "var(--console-faint)" }}>
          {uk ? "Операційний центр" : "Operations Centre"}
        </span>
      </Link>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {SECTIONS.map((s) => (
          <div key={s.en} className="mt-2.5">
            <div className="console-section-label px-3 mb-0.5">{uk ? s.uk : s.en}</div>
            {s.items.map((it) => (
              <Link
                key={it.href}
                href={base + it.href}
                onClick={() => setOpen(false)}
                className={`console-nav-link${isActive(it.href) ? " active" : ""}`}
              >
                {uk ? it.uk : it.en}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="px-3 py-4 space-y-1" style={{ borderTop: "1px solid var(--console-border)" }}>
        <Link href={otherLocalePath} onClick={() => setOpen(false)} className="console-nav-link">
          {otherLocale === "uk" ? "Українська" : "English"}
        </Link>
        <Link href={`/${locale}`} onClick={() => setOpen(false)} className="console-nav-link">
          {uk ? "↗ До магазину" : "↗ View shop"}
        </Link>
        {/* The founder is a customer too. Phase E pointed the shop's person
            icon at this console, which left his own orders, loyalty and
            favourites with no doorway at all — this is it. */}
        <Link href={`/${locale}/account`} onClick={() => setOpen(false)} className="console-nav-link">
          {uk ? "↗ Мій акаунт" : "↗ My account"}
        </Link>
        <button onClick={doSignOut} className="console-nav-link w-full text-left cursor-pointer">
          {uk ? "Вийти" : "Sign out"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="thb-console min-h-screen w-full">
      {/* Mobile top bar */}
      <div
        className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-14"
        style={{ background: "var(--console-panel)", borderBottom: "1px solid var(--console-border)" }}
      >
        <Link href={base} className="font-display text-xl tracking-widest" style={{ color: "var(--console-text)" }}>
          THB<span style={{ color: "var(--console-accent)" }}>-OS</span>
        </Link>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label={uk ? "Меню" : "Menu"}
          aria-expanded={open}
          style={{ color: "var(--console-text)" }}
        >
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            {open ? <path d="M6 18L18 6M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>
      {open && (
        <div className="lg:hidden fixed inset-0 top-14 z-40" style={{ background: "var(--console-bg)" }}>
          {sidebar}
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className="hidden lg:block fixed inset-y-0 left-0 w-60 z-40"
        style={{ borderRight: "1px solid var(--console-border)" }}
      >
        {sidebar}
      </aside>

      <div className="lg:pl-60 min-h-screen flex flex-col">
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
