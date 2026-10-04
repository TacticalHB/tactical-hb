"use client";

import { useCallback, useState } from "react";
import { t } from "@/lib/i18n-text";
import HmdViewer3D from "./HmdViewer3D";

/* ---------------------------------------------------------------------------
   "View in 3D" — under every HMD, and on the LID and FEAR 9E418 listings
   (Mario, 4 Oct 2026). Opens the Classic-only 3D viewer; which parts start
   fitted follows the page it was opened from.
--------------------------------------------------------------------------- */
export default function View3DButton({ slug, locale }: { slug: string; locale: string }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const onLid = slug === "lid-9e418", onFear = slug === "fear-9e418";
  const initial = onLid ? { lid: true, fear: false } : onFear ? { lid: false, fear: true } : { lid: true, fear: true };
  const classicNote = slug === "hmd-a-craft" || slug === "hmd-tct-op";
  const label = onLid || onFear
    ? t(locale, { en: "View in 3D", uk: "Переглянути в 3D", ja: "3Dで見る", ar: "عرض ثلاثي الأبعاد" })
    : t(locale, { en: "View LID & FEAR in 3D", uk: "LID і FEAR у 3D", ja: "LID と FEAR を3Dで見る", ar: "عرض LID وFEAR ثلاثي الأبعاد" });
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 w-full h-14 rounded-full text-[15px] font-medium flex items-center justify-center gap-2.5 transition-colors cursor-pointer hover:bg-[#f5f5f5]"
        style={{ border: "1px solid #d6d6d6", color: "#111", background: "#ffffff" }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" /><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" />
        </svg>
        {label}
      </button>
      {open && <HmdViewer3D locale={locale} initial={initial} classicNote={classicNote} onClose={close} />}
    </>
  );
}
