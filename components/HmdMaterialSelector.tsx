"use client";

import { useState } from "react";

/* ---------------------------------------------------------------------------
   Rimowa-style material selector for HMD product cards.

   Two square swatches, light/white, hairline border, with a thin offset ring
   on a selected one (Rimowa's "floating outline"). The options have no colour,
   so they're told apart by a minimal glyph — a filled disc for the lid (a
   solid cover) and a ring for the rubber (an O-ring).

   ADDITIVE, not mutually exclusive: each option is an independent toggle, so
   none / one / both can be on. These are paid add-ons, so the module owns the
   upcharges and exposes materialUpcharge() for the card to fold into its
   live price. Controlled component — the card holds the state so the price
   and the swatches never disagree.
--------------------------------------------------------------------------- */

export type HmdMaterial = { lid: boolean; rubber: boolean };

/** Add-on upcharges (EUR). Both selected = 4 + 2.5 = 6.50, i.e. purely additive. */
export const MATERIAL_PRICE = { lid: 4, rubber: 2.5 } as const;

export function materialUpcharge(sel: HmdMaterial): number {
  return (sel.lid ? MATERIAL_PRICE.lid : 0) + (sel.rubber ? MATERIAL_PRICE.rubber : 0);
}

const OPTIONS = [
  { key: "lid" as const, en: "With Lid", uk: "З кришкою", glyph: "disc" as const },
  { key: "rubber" as const, en: "With Rubber", uk: "З гумкою", glyph: "ring" as const },
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

export default function HmdMaterialSelector({
  value,
  onChange,
  locale,
}: {
  value: HmdMaterial;
  onChange: (next: HmdMaterial) => void;
  locale: string;
}) {
  const uk = locale === "uk";
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const label = uk ? "Комплектація" : "Configuration";
  const names = OPTIONS.filter((o) => value[o.key]).map((o) => (uk ? o.uk : o.en));
  const summary = names.length ? names.join(" + ") : uk ? "Базова" : "Base";

  return (
    <div className="mt-3">
      <div className="text-[11px] tracking-[0.08em] uppercase mb-1.5" style={{ color: "#8a8a8e" }}>
        {label}: <span style={{ color: "#111111" }}>{summary}</span>
      </div>
      <div className="flex gap-1.5" role="group" aria-label={label}>
        {OPTIONS.map((o) => {
          const active = value[o.key];
          const name = uk ? o.uk : o.en;
          const price = MATERIAL_PRICE[o.key];
          return (
            <button
              key={o.key}
              type="button"
              aria-pressed={active}
              aria-label={`${name} (+€${price.toFixed(2)})`}
              title={`${name} · +€${price.toFixed(2)}`}
              onClick={() => onChange({ ...value, [o.key]: !active })}
              onMouseEnter={() => setHoverKey(o.key)}
              onMouseLeave={() => setHoverKey(null)}
              className="grid place-items-center w-[30px] h-[30px] rounded-[5px] transition-colors"
              style={{
                background: "#ffffff",
                color: active ? "#111111" : "#9a9a9e",
                // Hover activates the ink frame on unselected swatches;
                // the selected state (below) is unchanged. transition-colors
                // smooths the border-colour change.
                border: active
                  ? "1px solid #111111"
                  : `1px solid ${hoverKey === o.key ? "#111111" : "#d9d9d9"}`,
                // Rimowa's selected swatch: a thin ink ring floating just
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
