"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { products, type Product } from "@/lib/products";
import { priceCart } from "@/lib/pricing";
import { useCart, type CartOptions } from "@/components/CartContext";
import Price from "@/components/Price";
import { money } from "@/lib/currency";

/* ---------------------------------------------------------------------------
   Build a setup — bowl, heat device, wind cover, in that order.

   NOT A CONFIGURATOR. Three rows of real products, the add-ons each one
   actually takes, and a running total. Every choice is a catalogue slug, so
   there is no bundle SKU, no bundle price and no second discount engine to
   keep in step with the first: a kit is exactly the lines it is made of, and
   the basket cannot tell it apart from three separate visits to three pages.

   THE TOTAL COMES FROM priceCart — the SAME function the invoice route prices
   the real order with. Not a reimplementation of it, and not a sum of
   catalogue fields either, so a kit total that matched the PDPs but not the
   charge is not a shape this can take. The server still re-prices at checkout;
   this is the preview agreeing with it in advance.

   PARTIAL KITS ARE ALLOWED. Somebody who already owns a bowl should be able to
   take the other two, so nothing is gated — only the CTA changes wording once
   all three slots are filled, which is the honest way to say "this is now a
   full setup" without refusing the sale until it is.
--------------------------------------------------------------------------- */

type SlotKey = "bowl" | "hmd" | "windcover";

type Selection = {
  slug: string | null;
  variant?: string;
  lid?: boolean;
  rubber?: boolean;
  timer?: boolean;
};

const EMPTY: Record<SlotKey, Selection> = {
  bowl: { slug: null },
  /* The add-ons start on, matching the product pages: a device is shown with
     its lid and a cover with its timer, and a customer who wants neither turns
     them off in the same place they would there. */
  hmd: { slug: null, lid: true, rubber: true },
  windcover: { slug: null, timer: true },
};

const SLOT_ORDER: SlotKey[] = ["bowl", "hmd", "windcover"];

/* Hairline ghosts from the design export, normalised on extract to
   public/setup/ghost-<slot>-hairline.png. The fill variants and the lineup /
   stack / connector reference sheets are not shipped: the connectors are drawn
   in CSS below, and the rest were reference only. Their white point was remapped
   255 -> 245 so an empty slot sits on the same studio plate as a real photo
   instead of showing a brighter square next to one. */
const GHOST: Record<SlotKey, string> = {
  bowl: "/setup/ghost-bowl-hairline.png",
  hmd: "/setup/ghost-hmd-hairline.png",
  windcover: "/setup/ghost-windcover-hairline.png",
};

export default function KitBuilder({ locale }: { locale: string }) {
  const uk = locale === "uk";
  const { addToCart, setCartOpen } = useCart();
  const [sel, setSel] = useState<Record<SlotKey, Selection>>(EMPTY);

  const byCategory = useMemo(
    () => ({
      bowl: products.filter((p) => p.category === "bowl"),
      hmd: products.filter((p) => p.category === "hmd"),
      windcover: products.filter((p) => p.category === "windcover"),
    }),
    []
  );

  const L = {
    title: uk ? "Зібрати сет" : "Build a setup",
    intro: uk
      ? "Оберіть чашу, пристрій нагріву та ковпак. Додайте все одним рухом."
      : "Pick a bowl, a heat device and a wind cover. Add the lot in one move.",
    steps: {
      bowl: uk ? "Чаша" : "Bowl",
      hmd: uk ? "Пристрій нагріву" : "Heat device",
      windcover: uk ? "Ковпак" : "Wind cover",
    } as Record<SlotKey, string>,
    none: uk ? "Не обрано" : "Not selected",
    skip: uk ? "Пропустити" : "Skip",
    summary: uk ? "Ваш сет" : "Your setup",
    total: uk ? "Разом" : "Total",
    addFull: uk ? "Додати комплект" : "Add full kit",
    addPartial: uk ? "Додати вибране" : "Add selection",
    empty: uk ? "Оберіть хоча б один виріб" : "Choose at least one piece",
    lid: uk ? "Кришка" : "Lid",
    rubber: uk ? "Гумка" : "Rubber",
    timer: uk ? "Таймер" : "Timer",
    incoming: uk ? "Незабаром" : "Incoming",
  };

  /* Priced through the shop's own pricing, in the page's own locale, so the
     figures here and on a product page are the same figures. */
  const chosen = useMemo(
    () =>
      SLOT_ORDER.map((k) => ({ slot: k, s: sel[k] }))
        .filter((x) => x.s.slug)
        .map((x) => ({
          slot: x.slot,
          slug: x.s.slug as string,
          qty: 1,
          options: {
            variant: x.s.variant,
            lid: x.slot === "hmd" ? x.s.lid : undefined,
            rubber: x.slot === "hmd" ? x.s.rubber : undefined,
            timer: x.slot === "windcover" ? x.s.timer : undefined,
          } as CartOptions,
        })),
    [sel]
  );

  const priced = useMemo(
    () => priceCart(chosen.map((c) => ({ slug: c.slug, qty: c.qty, options: c.options })), locale),
    [chosen, locale]
  );

  const filled = chosen.length;
  const full = filled === SLOT_ORDER.length;

  /* ---- The locked-in cue ----
     Fired the moment the third core slot is answered, and only then.

     `full` is derived from the three SKU slots alone, so a lid, a rubber or a
     timer moving does not touch it — the effect below depends on `full`, and a
     boolean that did not change does not re-run an effect. That is the whole
     guard against replaying on every toggle and every render, and it is why
     the flag is a ref rather than state: it records what the previous run saw
     without itself causing another one.

     The pulse is one-shot, so the class has to come off again or a re-entry
     would find it already applied and animate nothing. The stack's own tighten
     is NOT here — it is a plain state transition in CSS keyed on the same
     completeness, which cannot double-fire by construction and eases back open
     if a piece is removed. */
  const [pulse, setPulse] = useState(false);
  const wasFull = useRef(false);

  useEffect(() => {
    if (full && !wasFull.current) {
      setPulse(true);
      const t = window.setTimeout(() => setPulse(false), 420);
      wasFull.current = full;
      return () => window.clearTimeout(t);
    }
    wasFull.current = full;
  }, [full]);

  const choose = useCallback((slot: SlotKey, slug: string | null) => {
    setSel((prev) => ({ ...prev, [slot]: { ...prev[slot], slug } }));
  }, []);

  const toggle = useCallback((slot: SlotKey, key: "lid" | "rubber" | "timer") => {
    setSel((prev) => ({ ...prev, [slot]: { ...prev[slot], [key]: !prev[slot][key] } }));
  }, []);

  const addKit = useCallback(() => {
    /* One line per piece, added the same way the product page adds them, so a
       kit in the basket is indistinguishable from the pieces bought singly —
       which is the point. The slide-over is suppressed on each (false) and the
       drawer is opened once at the end, or three panels would stack up. */
    for (const c of chosen) {
      const product = products.find((p) => p.slug === c.slug);
      if (product) addToCart(product, null, c.options, false);
    }
    setCartOpen(true);
  }, [chosen, addToCart, setCartOpen]);

  return (
    <div className="page-container py-16 md:py-24">
      <header className="max-w-2xl mb-12">
        <h1 className="font-display text-5xl md:text-7xl" style={{ color: "var(--text)" }}>{L.title}</h1>
        <p className="mt-5 text-base leading-relaxed" style={{ color: "var(--text-muted)" }}>{L.intro}</p>
      </header>

      <div className="grid lg:grid-cols-[1fr_360px] gap-12 lg:gap-16 items-start">
        <div className="kit-steps flex flex-col gap-12">
          {SLOT_ORDER.map((slot, idx) => {
            const list = byCategory[slot];
            const current = sel[slot];
            return (
              <section key={slot} aria-labelledby={`kit-${slot}`} className="kit-step">
                {/* The connector rail: a hairline dropping to the next step with
                    a node at this one, lit once the step has a choice. Purely
                    decorative and hidden from assistive tech — the numbered
                    headings already say what order these come in. The last step
                    draws no segment, or the line would run off into nothing. */}
                <span
                  className="kit-rail"
                  data-last={idx === SLOT_ORDER.length - 1 ? "true" : undefined}
                  data-on={current.slug ? "true" : undefined}
                  aria-hidden="true"
                />
                <div className="flex items-baseline gap-3 mb-5">
                  <span
                    className="font-mono text-[11px] tracking-[0.2em]"
                    style={{ color: current.slug ? "var(--accent-ink)" : "var(--text-faint)" }}
                  >
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <h2
                    id={`kit-${slot}`}
                    className="text-[13px] tracking-[0.22em] uppercase"
                    style={{ color: "var(--text)" }}
                  >
                    {L.steps[slot]}
                  </h2>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {list.map((p) => {
                    const active = current.slug === p.slug;
                    return (
                      <button
                        key={p.slug}
                        type="button"
                        onClick={() => choose(slot, active ? null : p.slug)}
                        aria-pressed={active}
                        className="kit-tile text-left"
                        data-active={active ? "true" : undefined}
                      >
                        {/* #f5f5f5, the catalogue's studio plate — the same
                            literal the products grid, the PDP gallery and the
                            favourites list all set behind a product photo.

                            NOT var(--bg-card). That is the page's warm cream
                            (#f1eee8), and behind a product it splits the shelf
                            in two: photos with a baked-in plate (the bowls, the
                            Classic, the A.Craft) showed a cool 245 square
                            floating on cream, while the cut-outs with a
                            transparent background (the OP, both wind covers)
                            took the cream directly and read as a different
                            studio. The plate has to match what the photos were
                            cut against, and that is 245. */}
                        <div className="relative aspect-square overflow-hidden" style={{ background: "#f5f5f5" }}>
                          <Image
                            src={p.gridImage ?? p.image}
                            alt=""
                            fill
                            sizes="(max-width: 640px) 45vw, 220px"
                            className="object-contain p-2"
                          />
                        </div>
                        <div className="px-3 py-2.5">
                          <div className="text-[13px] leading-tight" style={{ color: "var(--text)" }}>
                            {uk ? p.nameUk : p.nameEn}
                          </div>
                          <div className="text-[12px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                            <Price money={money(p.price, p.priceUah)} locale={locale} />
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {/* The empty fourth wind cover slot the catalogue shows as
                      Incoming. Present so the row reads complete, and not
                      selectable because there is nothing behind it to sell. */}
                  {slot === "windcover" && (
                    <div className="kit-tile kit-tile-incoming grid place-items-center" aria-disabled="true">
                      <span className="text-[10px] tracking-[0.28em] uppercase" style={{ color: "var(--text-faint)" }}>
                        {L.incoming}
                      </span>
                    </div>
                  )}
                </div>

                {/* Add-ons, only for the slot that takes them and only once
                    something is chosen — the same options, and the same
                    defaults, as the product page. */}
                {current.slug && (slot === "hmd" || slot === "windcover") && (
                  <div className="flex flex-wrap gap-2 mt-3.5">
                    {(slot === "hmd"
                      ? ([["lid", L.lid], ["rubber", L.rubber]] as const)
                      : ([["timer", L.timer]] as const)
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggle(slot, key)}
                        aria-pressed={!!current[key]}
                        className="kit-chip text-[12px]"
                        data-active={current[key] ? "true" : undefined}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        {/* Summary. Sticky on desktop so the total is never scrolled away from
            the choice that changes it. */}
        <aside className="lg:sticky lg:top-28 p-7" style={{ background: "var(--bg-soft)" }}>
          <h2 className="text-[15px] font-medium mb-5" style={{ color: "var(--text)" }}>{L.summary}</h2>

          {/* ---- The stack ----
              Assembled the way the thing actually sits: cover on top, device
              under it, bowl at the bottom — so the panel reads as the setup
              rather than as a list that happens to be vertical. SLOT_ORDER is
              selection order, so it is reversed here and only here.

              A slot with nothing in it shows its hairline ghost, which is the
              only place on the page a ghost earns its keep: the step grids
              already show what is chosen by the tile border, and an empty slot
              in the stack is the one thing that says "you still need a bowl".
              Once a real photograph exists the ghost gives way to it — the two
              are never stacked.

              Keyed on the slug so choosing a different piece remounts the
              image and replays the settle. */}
          <div className="kit-stack mb-6" data-complete={full ? "true" : undefined} aria-hidden="true">
            {[...SLOT_ORDER].reverse().map((slot) => {
              const slug = sel[slot].slug;
              const product = slug ? products.find((p) => p.slug === slug) : null;
              return (
                <div key={slot} className="kit-stack-slot">
                  {product ? (
                    <Image
                      key={product.slug}
                      src={product.gridImage ?? product.image}
                      alt=""
                      fill
                      sizes="120px"
                      className="kit-stack-img object-contain p-1.5"
                    />
                  ) : (
                    <Image
                      src={GHOST[slot]}
                      alt=""
                      fill
                      sizes="120px"
                      className="object-contain p-1.5"
                    />
                  )}
                </div>
              );
            })}
          </div>

          <ul className="flex flex-col gap-3 text-[14px]">
            {SLOT_ORDER.map((slot) => {
              const line = priced.lines.find(
                (l) => l.slug === sel[slot].slug
              );
              return (
                <li key={slot} className="flex justify-between gap-4">
                  <span style={{ color: "var(--text-muted)" }}>{L.steps[slot]}</span>
                  <span className="text-right" style={{ color: line ? "var(--text)" : "var(--text-faint)" }}>
                    {line ? (
                      <>
                        {line.name}
                        <span className="block text-[13px]" style={{ color: "var(--text-muted)" }}>
                          <Price money={line.total} locale={locale} />
                        </span>
                      </>
                    ) : (
                      L.none
                    )}
                  </span>
                </li>
              );
            })}
          </ul>

          <div
            className="flex items-center justify-between mt-6 pt-5"
            style={{ borderTop: "1px solid var(--border-strong)" }}
          >
            <span className="text-[15px] font-medium" style={{ color: "var(--text)" }}>{L.total}</span>
            <span className="text-[20px] font-medium" style={{ color: "var(--text)" }}>
              <Price money={priced.subtotal} locale={locale} />
            </span>
          </div>

          <button
            type="button"
            onClick={addKit}
            disabled={filled === 0}
            className={`w-full h-12 rounded-full mt-6 text-[15px] font-medium transition-opacity${pulse ? " kit-cta-pulse" : ""}`}
            style={{
              background: filled === 0 ? "var(--border-strong)" : "var(--accent)",
              color: filled === 0 ? "var(--text-faint)" : "#111114",
              cursor: filled === 0 ? "not-allowed" : "pointer",
            }}
          >
            {filled === 0 ? L.empty : full ? L.addFull : L.addPartial}
          </button>
        </aside>
      </div>
    </div>
  );
}
