"use client";

import { useHalloween } from "@/components/halloween/useHalloween";
import { halloweenEligible } from "@/lib/halloween";

/* ---------------------------------------------------------------------------
   The Halloween marks on a product photo (31 Oct 2026 only — Mario's option C,
   made small): a square "−20%" stamp in the top-left corner and a line-drawn
   pumpkin in the top-right. Corners only — the house standard keeps the
   product to the middle 80% of the frame, so neither touches it.

   The stamp is the same in every language, like TOP SECRET: it is a stamp,
   not a sentence. Physical left/right, so the pumpkin stays in the right
   corner on the Arabic pages too. Delete with lib/halloween.
--------------------------------------------------------------------------- */

export function Pumpkin({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 10c-6.4 0-10.5 3.9-10.5 8.8S9.6 27.5 16 27.5s10.5-3.8 10.5-8.7S22.4 10 16 10z" />
      <path d="M16 10c-2.8 0-4.6 3.9-4.6 8.8s1.8 8.7 4.6 8.7 4.6-3.8 4.6-8.7S18.8 10 16 10z" />
      <path d="M16 10V6.2c0-.9.5-1.7 1.4-2" />
      <path d="M17.6 7.2c1.6-1.5 3.9-1.6 5.2-.6" />
    </svg>
  );
}

export default function SaleStamp({ category, size = "pdp" }: { category: string; size?: "pdp" | "card" }) {
  const on = useHalloween();
  if (!on || !halloweenEligible(category)) return null;
  const pdp = size === "pdp";
  return (
    <>
      <div
        dir="ltr"
        aria-hidden="true"
        className={`absolute z-[2] pointer-events-none select-none text-center leading-none ${pdp ? "top-4 left-4 px-2 pt-1.5 pb-1" : "top-2.5 left-2.5 px-1.5 pt-1 pb-0.5"}`}
        style={{ border: `${pdp ? 1.5 : 1}px solid var(--accent)`, color: "var(--accent-ink)", transform: "rotate(-6deg)", background: "rgba(255,255,255,0.6)" }}
      >
        <div className={`uppercase ${pdp ? "text-[7.5px] tracking-[0.22em]" : "text-[6px] tracking-[0.18em]"}`}>Halloween</div>
        <div className={`font-display ${pdp ? "text-[24px] mt-0.5" : "text-[17px]"}`} style={{ color: "var(--accent)" }}>−20%</div>
        <div className={`${pdp ? "text-[7.5px] tracking-[0.22em]" : "text-[6px] tracking-[0.18em]"}`}>31·10</div>
      </div>
      <div
        aria-hidden="true"
        /* Bottom-right on a catalogue card: the heart owns its top-right. */
        className={`absolute z-[2] pointer-events-none ${pdp ? "top-4 right-4" : "bottom-3 right-3"}`}
        style={{ color: "var(--accent)", opacity: 0.9 }}
      >
        <Pumpkin size={pdp ? 24 : 16} />
      </div>
    </>
  );
}
