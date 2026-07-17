"use client";

import { useState } from "react";

/* ---------------------------------------------------------------------------
   Rimowa-style material selector for HMD product cards.

   Two square swatches, light/white, hairline border, with a thin offset ring
   on the selected one (Rimowa's "floating outline"). The options have no
   colour, so they're told apart by a minimal glyph — a filled disc for the
   lid (a solid cover) and a ring for the rubber (an O-ring) — and a small
   caption naming the current choice, the way Rimowa labels "Colour: Silver".

   UI-only by request: local state, nothing wired to cart or URL.
--------------------------------------------------------------------------- */

const OPTIONS = [
  { key: "lid", en: "With Lid", uk: "З кришкою", glyph: "disc" as const },
  { key: "rubber", en: "With Rubber", uk: "З гумкою", glyph: "ring" as const },
];

function Glyph({ kind }: { kind: "disc" | "ring" }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      {kind === "disc" ? (
        <circle cx="7" cy="7" r="5" fill="currentColor" />
      ) : (
        <circle cx="7" cy="7" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
      )}
    </svg>
  );
}

export default function HmdMaterialSelector({ locale }: { locale: string }) {
  const uk = locale === "uk";
  const [sel, setSel] = useState(0);
  const label = uk ? "Комплектація" : "Configuration";
  const selectedName = uk ? OPTIONS[sel].uk : OPTIONS[sel].en;

  return (
    <div className="mt-3">
      <div className="text-[11px] tracking-[0.08em] uppercase mb-1.5" style={{ color: "#8a8a8e" }}>
        {label}: <span style={{ color: "#111111" }}>{selectedName}</span>
      </div>
      <div className="flex gap-1.5" role="radiogroup" aria-label={label}>
        {OPTIONS.map((o, i) => {
          const active = i === sel;
          const name = uk ? o.uk : o.en;
          return (
            <button
              key={o.key}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={name}
              title={name}
              onClick={() => setSel(i)}
              className="grid place-items-center w-[30px] h-[30px] rounded-[5px] transition-colors"
              style={{
                background: "#ffffff",
                color: active ? "#111111" : "#9a9a9e",
                border: active ? "1px solid #111111" : "1px solid #d9d9d9",
                // Rimowa's selected swatch: a thin dark ring floating just
                // outside the square (1px white gap, then 1px ink).
                boxShadow: active ? "0 0 0 2px #ffffff, 0 0 0 3px #111111" : "none",
              }}
            >
              <Glyph kind={o.glyph} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
