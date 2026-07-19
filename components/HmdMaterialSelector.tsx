"use client";

import { useState } from "react";
import { currencyForLocale, formatMoney } from "@/lib/currency";
import { MATERIAL_PRICE, type HmdMaterial } from "@/lib/hmd-options";

/* ---------------------------------------------------------------------------
   HMD material add-ons, in two presentations:

   • "pdp"  — Rimowa's list selector: a bordered panel of full-width rows, name
              on the left and price on the right, selected rows filled.
   • "card" — compact square swatches for the products grid, where a full-width
              list would swamp the tile. Told apart by a minimal glyph: a filled
              disc for the lid (a solid cover), a ring for the rubber (an O-ring).

   ADDITIVE, not mutually exclusive: each option is an independent toggle, so
   none / one / both can be on. Pricing lives in lib/hmd-options so the cart can
   price a line without importing a component. Controlled — the parent holds the
   state so the price and the selector can never disagree.
--------------------------------------------------------------------------- */

const OPTIONS = [
  { key: "lid" as const, en: "With Lid", uk: "З кришкою", glyph: "disc" as const },
  { key: "rubber" as const, en: "With Rubber", uk: "З гумкою", glyph: "ring" as const },
];

function Glyph({ kind, size = 14 }: { kind: "disc" | "ring"; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true">
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
  onToggle,
  locale,
  variant = "card",
}: {
  value: HmdMaterial;
  /** Reports WHICH option was toggled, so the parent can use a functional
      state update. Passing a whole object here would let two toggles clicked
      in the same React batch clobber each other. */
  onToggle: (key: keyof HmdMaterial) => void;
  locale: string;
  /** "card" = compact swatches for the products grid.
      "pdp"  = Rimowa's list selector: a bordered panel of full-width rows,
               name on the left and price on the right, selected row filled. */
  variant?: "card" | "pdp";
}) {
  const uk = locale === "uk";
  const isPdp = variant === "pdp";
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const label = uk ? "Комплектація" : "Configuration";
  const names = OPTIONS.filter((o) => value[o.key]).map((o) => (uk ? o.uk : o.en));
  const summary = names.length ? names.join(" + ") : uk ? "Базова" : "Base";

  /* ---- PDP: Rimowa-style option list ----
     Rimowa's is a single-select dropdown; ours must allow none/one/both, so the
     rows stay open and toggle independently, with a tick marking the chosen
     ones. Everything else — the bordered panel, full-width rows, name left /
     detail right, filled selected row — follows the reference. */
  if (isPdp) {
    return (
      <div>
        <div className="text-[13px] mb-2" style={{ color: "#707072" }}>
          {label}: <span style={{ color: "#111111" }}>{summary}</span>
        </div>
        <div
          className="rounded-[4px] overflow-hidden"
          style={{ border: "1px solid #cacacc" }}
          role="group"
          aria-label={label}
        >
          {OPTIONS.map((o, i) => {
            const active = value[o.key];
            const name = uk ? o.uk : o.en;
            const price = formatMoney(MATERIAL_PRICE[o.key], currencyForLocale(locale));
            const hovered = hoverKey === o.key;
            return (
              <button
                key={o.key}
                type="button"
                role="checkbox"
                aria-checked={active}
                onClick={() => onToggle(o.key)}
                onMouseEnter={() => setHoverKey(o.key)}
                onMouseLeave={() => setHoverKey(null)}
                className="w-full flex items-center justify-between px-5 py-4 text-[15px] text-left transition-colors"
                style={{
                  background: active ? "#f0f0f0" : hovered ? "#f7f7f7" : "#ffffff",
                  borderTop: i > 0 ? "1px solid #e4e4e6" : "none",
                  color: "#111111",
                  fontWeight: active ? 500 : 400,
                }}
              >
                <span>{name}</span>
                <span
                  className="flex items-center gap-2 text-[14px]"
                  style={{ color: active ? "#111111" : "#707072" }}
                >
                  +{price}
                  {active && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <path
                        d="M2.5 7.5l3 3 6-6"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <div className="text-[11px] tracking-[0.08em] uppercase mb-1.5" style={{ color: "#8a8a8e" }}>
        {label}: <span style={{ color: "#111111" }}>{summary}</span>
      </div>
      <div className="flex gap-1.5" role="group" aria-label={label}>
        {OPTIONS.map((o) => {
          const active = value[o.key];
          const name = uk ? o.uk : o.en;
          const price = formatMoney(MATERIAL_PRICE[o.key], currencyForLocale(locale));
          return (
            <button
              key={o.key}
              type="button"
              aria-pressed={active}
              aria-label={`${name} (+${price})`}
              title={`${name} · +${price}`}
              onClick={() => onToggle(o.key)}
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
