"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

/* ---------------------------------------------------------------------------
   Newsletter promotional strip.

   Mounted in exactly two places — the full cart page and the footer. It is
   deliberately NOT in the mini cart slide-over: that panel is a single-purpose
   confirmation, and a marketing prompt there would compete with checkout.

   Two skins, because the mark has to survive both backgrounds:
     • "light" — the Louis Vuitton treatment: black tile, white logo, on the
       cart's pale surface.
     • "dark"  — the footer already sits on --fog, where a black tile would
       disappear, so the logo stands on its own.
--------------------------------------------------------------------------- */

export default function NewsletterPromo({
  locale,
  variant = "light",
}: {
  locale: string;
  variant?: "light" | "dark";
}) {
  const t = useTranslations("newsletter");
  const dark = variant === "dark";

  return (
    <Link
      href={`/${locale}/newsletter`}
      className="group flex items-center gap-5 transition-opacity hover:opacity-80"
      style={
        dark
          ? { padding: "0" }
          : { background: "var(--bg-card)", border: "1px solid var(--border)" }
      }
    >
      {/* The mark. tct-logo.svg is white artwork, so it needs the black tile on
          light surfaces and nothing at all on dark ones. */}
      {dark ? (
        <img src="/tct-logo.svg" alt="" aria-hidden="true" className="w-9 h-9 shrink-0" />
      ) : (
        <span
          className="w-[68px] h-[68px] shrink-0 grid place-items-center self-stretch"
          style={{ background: "#111114" }}
        >
          <img src="/tct-logo.svg" alt="" aria-hidden="true" className="w-9 h-9" />
        </span>
      )}

      <span className={dark ? "text-[13.5px] leading-relaxed" : "text-[13.5px] leading-relaxed py-4 pr-5"}>
        <span
          className="underline underline-offset-4"
          style={{ color: dark ? "#f4f3f0" : "var(--text)" }}
        >
          {t("promo_cta")}
        </span>{" "}
        <span style={{ color: dark ? "#9a978f" : "var(--text-muted)" }}>{t("promo")}</span>
      </span>
    </Link>
  );
}
