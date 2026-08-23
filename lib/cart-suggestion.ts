import { products, type Product } from "./products";
import type { CartLine, CartOptions } from "@/components/CartContext";

/* ---------------------------------------------------------------------------
   What to suggest next, given a bag and the last thing put in it.

   A PURE FUNCTION OVER THE CART. No React, no storage, no side effects — it
   takes the lines and the last add and returns one suggestion or null, which
   is what makes the rules readable and testable without a browser.

   ONE CARD AT A TIME, AND ONLY THE LAST ADD DECIDES IT. A bag that has
   collected several things does not get several suggestions stacked up; the
   piece just added is the one the customer is thinking about.

   CATEGORY, NOT NAME. Matching is on `product.category`, the same field the
   setup builder groups by, so a new bowl called anything at all still reads as
   a bowl. Name matching would break on the first product that did not follow
   the convention — and the catalogue already has "Tactical 0.66 F.CK THE
   PHUNNEL" sitting next to "KILLER BOWL".
--------------------------------------------------------------------------- */

/** Session keys. One per pairing, so dismissing one does not silence another. */
export type PairingKey = "bowl-hmd" | "hmd-windcover" | "windcover-timer";

export type Suggestion = {
  pairingKey: PairingKey;
  poster: string;
  /** The product the Add button acts on. */
  slug: string;
  /** Options to add it with, or to set on a line already in the bag. */
  options?: CartOptions;
  /** True when the action upgrades an existing line rather than adding one —
      the timer case, where the customer already owns the cover in the bag. */
  upgradesLineKey?: string;
};

const POSTER: Record<PairingKey, string> = {
  "bowl-hmd": "/posters/poster-bowl-hmd-square.webp",
  "hmd-windcover": "/posters/poster-hmd-windcover-square.webp",
  "windcover-timer": "/posters/poster-windcover-timer-square.webp",
};

const bySlug = (slug: string): Product | undefined => products.find((p) => p.slug === slug);

/** Every category currently in the bag. */
function categoriesInCart(lines: CartLine[]): Set<Product["category"]> {
  const out = new Set<Product["category"]>();
  for (const l of lines) {
    const p = bySlug(l.slug);
    if (p) out.add(p.category);
  }
  return out;
}

/**
 * Pick the first candidate not already in the bag.
 *
 * The order IS the preference — Classic before A.Craft, Detonator before KH.
 *
 * THE FALL-THROUGH IS CURRENTLY UNREACHABLE, and that is deliberate. The brief
 * asked for "Classic, or A.Craft if Classic is already in the cart", but also
 * for the card to stay silent when the bag holds ANY heat device — and the two
 * cannot both fire. A bag containing Classic satisfies the second rule first,
 * so the card is already gone before a second choice is needed.
 *
 * The stricter rule wins on purpose: offering a second heat device to somebody
 * who just bought one is the nagging the brief set out to avoid. The ordering
 * is kept because it costs nothing and is the right preference the day those
 * rules loosen.
 */
function firstAbsent(candidates: string[], lines: CartLine[]): string | null {
  const owned = new Set(lines.map((l) => l.slug));
  return candidates.find((s) => !owned.has(s) && bySlug(s)) ?? null;
}

export function getCartSuggestion(
  lines: CartLine[],
  lastAdded: CartLine | null
): Suggestion | null {
  if (!lastAdded || lines.length === 0) return null;

  const last = bySlug(lastAdded.slug);
  if (!last) return null;

  const have = categoriesInCart(lines);

  /* A bowl wants a device. Silent if any device is already in the bag. */
  if (last.category === "bowl") {
    if (have.has("hmd")) return null;
    const slug = firstAbsent(["hmd-tct-classic", "hmd-a-craft", "hmd-tct-op"], lines);
    if (!slug) return null;
    /* The BASE device, deliberately. Most product pages preselect a lid and a
       ring; adding those here would charge for two upgrades the customer never
       saw, so the card offers the plain SKU and leaves the options to the page
       where they are actually shown. It also means this card is right whether
       the device it lands on preselects anything or not — the Classic does
       not — because "no options" is the one answer that is never an upsell. */
    return { pairingKey: "bowl-hmd", poster: POSTER["bowl-hmd"], slug };
  }

  /* A device wants a cover. Silent if any cover is already in the bag.

     WITH THE TIMER ON, because that is what the wind cover's own page offers.
     This is the one place the card follows a product's preselected option
     rather than stripping it, and the asymmetry with the heat device above is
     deliberate: a lid and a rubber are small parts a customer may not want,
     while the timer IS the wind cover's story — the poster sells the timed
     session, and quoting the bare cover under it would advertise one thing and
     add another. Someone who wants it bare turns the timer off on the page. */
  if (last.category === "hmd") {
    if (have.has("windcover")) return null;
    const slug = firstAbsent(["windcover-detonator", "windcover-kh"], lines);
    if (!slug) return null;
    return {
      pairingKey: "hmd-windcover",
      poster: POSTER["hmd-windcover"],
      slug,
      options: { timer: true },
    };
  }

  /* A cover wants its timer — on the cover already in the bag, not a second
     one. This is the only pairing that upgrades a line instead of adding one,
     because adding would sell a cover the customer did not ask for. */
  if (last.category === "windcover") {
    if (lastAdded.options?.timer) return null;
    /* `lastAdded` is a snapshot of the moment it went in and never changes
       afterwards, so accepting the timer upgraded the LINE while leaving that
       snapshot bare — and the card, reading only the snapshot, went on
       offering a timer the customer had already taken. Ask the bag instead:
       if no cover of this slug is still without its timer, there is nothing
       left to suggest. */
    const stillBare = lines.some((l) => l.slug === lastAdded.slug && !l.options?.timer);
    if (!stillBare) return null;
    /* A bag that already holds all three is a finished setup; suggesting a
       fourth thing to someone who has just completed one is nagging. */
    if (have.has("bowl") && have.has("hmd") && have.has("windcover")) return null;
    return {
      pairingKey: "windcover-timer",
      poster: POSTER["windcover-timer"],
      slug: lastAdded.slug,
      options: { ...lastAdded.options, timer: true },
      upgradesLineKey: lastAdded.slug,
    };
  }

  return null;
}
