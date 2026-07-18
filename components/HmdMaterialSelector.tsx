"use client";

import { useState } from "react";
import { addMoney, currencyForLocale, formatMoney, money, type Money } from "@/lib/currency";

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

/**
 * Add-on upcharges. Derived from EUR at the display rate (see lib/currency),
 * so both currencies stay in step if the rate moves:
 *   lid    €4.00 → ₴206
 *   rubber €2.50 → ₴129
 *   both   €6.50 → ₴335   (purely additive in both currencies)
 */
export const MATERIAL_PRICE: Record<"lid" | "rubber", Money> = {
  lid: money(4),
  rubber: money(2.5),
};

export function materialUpcharge(sel: HmdMaterial): Money {
  let total = money(0, 0);
  if (sel.lid) total = addMoney(total, MATERIAL_PRICE.lid);
  if (sel.rubber) total = addMoney(total, MATERIAL_PRICE.rubber);
  return total;
}

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
      "pdp"  = larger Rimowa-style squares sized to match the colour swatches
               already on the detail page (36px, gap-3, 13px label). */
  variant?: "card" | "pdp";
}) {
  const uk = locale === "uk";
  const isPdp = variant === "pdp";
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const label = uk ? "Комплектація" : "Configuration";
  const names = OPTIONS.filter((o) => value[o.key]).map((o) => (uk ? o.uk : o.en));
  const summary = names.length ? names.join(" + ") : uk ? "Базова" : "Base";

  return (
    <div className={isPdp ? "" : "mt-3"}>
      <div
        className={isPdp ? "text-[13px] mb-2" : "text-[11px] tracking-[0.08em] uppercase mb-1.5"}
        style={{ color: isPdp ? "#707072" : "#8a8a8e" }}
      >
        {label}: <span style={{ color: "#111111" }}>{summary}</span>
      </div>
      <div className={`flex ${isPdp ? "gap-3" : "gap-1.5"}`} role="group" aria-label={label}>
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
              className={`grid place-items-center transition-colors ${isPdp ? "w-9 h-9 rounded-[4px]" : "w-[30px] h-[30px] rounded-[5px]"}`}
              style={{
                background: "#ffffff",
                color: active ? "#111111" : "#9a9a9e",
                // Hover activates the ink frame on unselected swatches;
                // the selected state (below) is unchanged. transition-colors
                // smooths the border-colour change.
                border: active
                  ? "1px solid #111111"
                  : `1px solid ${hoverKey === o.key ? "#111111" : isPdp ? "#d6d6d6" : "#d9d9d9"}`,
                // Rimowa's selected swatch: a thin ink ring floating just
                // outside the square (1px white gap, then 1px ink).
                boxShadow: active ? "0 0 0 2px #ffffff, 0 0 0 3px #111111" : "none",
              }}
            >
              <Glyph kind={o.glyph} size={isPdp ? 16 : 14} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
