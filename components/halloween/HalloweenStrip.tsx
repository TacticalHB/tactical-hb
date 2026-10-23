"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { t } from "@/lib/i18n-text";
import { HALLOWEEN_END } from "@/lib/halloween";
import { useHalloween, useSecondClock } from "@/components/halloween/useHalloween";
import { Pumpkin } from "@/components/halloween/SaleStamp";

/* ---------------------------------------------------------------------------
   The Halloween strip under the menu, with a live countdown to 23:59 Kyiv
   (31 Oct 2026 only). Part of the fixed header, so it follows the page.

   32px tall. --sale-strip on <html> (set by the root layout for the first
   paint, kept in step here if the page is left open across midnight) adds
   the same 32px to the pages whose top padding only clears the 64px menu.
   On Project KI 06's own page the strip says it is not part of the sale.
   Delete with lib/halloween.
--------------------------------------------------------------------------- */

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function HalloweenStrip({ locale }: { locale: string }) {
  const on = useHalloween();
  const now = useSecondClock();
  const path = usePathname() ?? "";

  useEffect(() => {
    document.documentElement.style.setProperty("--sale-strip", on ? "32px" : "0px");
  }, [on]);

  if (!on) return null;

  const left = now === null ? null : Math.max(0, HALLOWEEN_END - now);
  const clock =
    left === null
      ? "–– : –– : ––"
      : `${pad(Math.floor(left / 3_600_000))} : ${pad(Math.floor(left / 60_000) % 60)} : ${pad(Math.floor(left / 1000) % 60)}`;
  const hookahPage = path.includes("/products/incoming-hookah");

  const L = {
    offer: hookahPage
      ? t(locale, { en: "Project KI 06 is not included", uk: "Project KI 06 не бере участі", ja: "Project KI 06 は対象外", ar: "Project KI 06 غير مشمول" })
      : t(locale, { en: "−20% on everything", uk: "−20% на все", ja: "全品 −20%", ar: "−20% على كل شيء" }),
    except: t(locale, { en: "except Project KI 06", uk: "крім Project KI 06", ja: "Project KI 06 を除く", ar: "باستثناء Project KI 06" }),
    ends: t(locale, { en: "Ends in", uk: "До кінця", ja: "終了まで", ar: "ينتهي خلال" }),
  };

  return (
    <div
      className="h-8 flex items-center justify-center gap-3 sm:gap-5 px-4 whitespace-nowrap overflow-hidden"
      style={{ background: "#0b0b0d", borderTop: "1px solid rgba(255,255,255,0.06)", color: "#f4f3f0" }}
      role="note"
    >
      <span style={{ color: "var(--accent)" }} className="hidden sm:inline-flex"><Pumpkin size={15} /></span>
      <span className="font-display text-[14px] sm:text-[15px] tracking-[0.18em]" dir="ltr">HALLOWEEN</span>
      <span className="font-display text-[14px] sm:text-[15px] tracking-[0.14em] uppercase" style={{ color: "var(--accent)" }}>
        {L.offer}
        {!hookahPage && <span className="hidden md:inline" style={{ color: "rgba(244,243,240,0.55)" }}> · {L.except}</span>}
      </span>
      <span className="text-[11px] tracking-[0.06em] tabular-nums uppercase" style={{ color: "rgba(255,255,255,0.65)" }}>
        <span className="hidden sm:inline">{L.ends} </span>
        <span dir="ltr">{clock}</span>
      </span>
    </div>
  );
}
