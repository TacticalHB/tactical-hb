import type { Money } from "@/lib/currency";
import type { LineAddons } from "@/lib/wholesale-display";

/* ---------------------------------------------------------------------------
   The wholesale price books.

   SOURCE: Tactical_HB_Wholesale_Price_List.pdf, both pages — the EUR export
   list and the UAH Ukraine list. Every number below is transcribed from it.
   Nothing here is derived from the retail catalogue, and nothing is a
   conversion of anything: the euro and hryvnia lists were set independently by
   the business, exactly as the retail prices are.

   TWO BOOKS, AND THEY ARE FAR APART. HMD TCT Classic is €12.00 to a shop and
   €19.50 to a lounge. Serving the wrong one quotes a lounge shop margin in
   writing to somebody who will hold you to it, which is why partner_type has
   no default and no fallback (0034).

   SHOPS AND DISTRIBUTORS SHARE THE SHOP BOOK, as the printed list says:
   "SHOP / DISTRIBUTION — wholesale book for specialty shops, online retailers
   and distributors".

   ---- Two places the list and the catalogue do not line up 1:1 -------------

   THE TIMER. The list prices "Windcover (standard)" and "Windcover with
   timer" as two products; the site models the timer as an add-on flag, the
   way retail and stock already do (part__timer). The surcharge below is the
   difference between the two listed prices, so a wind cover with the timer
   ticked comes to exactly the listed "with timer" figure:

     shop    €24.30 − €14.30 = €10.00      ₴1100 − ₴650 = ₴450
     lounge  €38.00 − €19.50 = €18.50      ₴1440 − ₴765 = ₴675

   ONE WIND COVER LINE, TWO WIND COVERS. The list says "Windcover (standard)"
   once; the catalogue sells the Detonator and the KH. Both are priced from
   that single line here. If they are ever meant to differ, this is the place
   that has to change, not the caller.

   HMD TCT OP IS PRICED PER COLOUR, ON BOTH BOOKS AND IN BOTH CURRENCIES. The
   printed list quotes it once; these eight figures were set afterwards by
   Mario and are a deliberate departure from it:

     shop    Black €19.00 / ₴820    Purple €20.00 / ₴890    (list: €19.50 / ₴860)
     lounge  Black €25.50 / ₴1080   Purple €27.00 / ₴1125   (list: €25.50 / ₴1035)

   Each was given explicitly. None is a conversion of another — the hryvnia
   gaps (₴70 and ₴45) do not track the euro ones (€1.00 and €1.50), which is
   exactly what you would expect from two lists set independently, and is why
   this file never derives one currency from the other.

   They live here rather than in the PDF because this file is what the portal
   actually reads. If the list is ever reissued, these are the numbers it
   should carry.
--------------------------------------------------------------------------- */

export const PARTNER_TYPES = ["shop", "lounge"] as const;
export type PartnerType = (typeof PARTNER_TYPES)[number];

export function isPartnerType(v: unknown): v is PartnerType {
  return typeof v === "string" && (PARTNER_TYPES as readonly string[]).includes(v);
}

type Book = {
  /* Keyed by product slug, OR by the stock key `slug__variant` where a colour
     is priced apart from its product. The variant key wins when present, so a
     product can price most colours together and one of them differently
     without listing every colour. A key absent from here has no trade price. */
  products: Record<string, Money>;
  /** Surcharges, added to the unit price when the flag is on. */
  addons: Record<keyof LineAddons, Money>;
};

const m = (eur: number, uah: number): Money => ({ eur, uah });

const BOOKS: Record<PartnerType, Book> = {
  /* SHOP / DISTRIBUTION — specialty shops, online retailers and distributors. */
  shop: {
    products: {
      "hmd-tct-classic": m(12.0, 550),
      "hmd-a-craft": m(13.0, 590),
      /* OP is priced per colour on this book — Black and Purple are not the
         same money to a shop, the way they are not at retail. The bare slug
         stays as the fallback for any colour not listed. */
      "hmd-tct-op": m(19.5, 860),
      "hmd-tct-op__black": m(19.0, 820),
      "hmd-tct-op__purple": m(20.0, 890),
      "bowl-killer": m(6.9, 320),
      "bowl-livanka": m(6.0, 280),
      "bowl-phunnel": m(8.0, 375),
      "windcover-detonator": m(14.3, 650),
      "windcover-kh": m(14.3, 650),
    },
    addons: {
      lid: m(2.5, 150),
      rubber: m(2.3, 120), // FEAR 9E418 — the key stayed `rubber`, see 0029.
      timer: m(10.0, 450), // 24.30 − 14.30 / 1100 − 650
    },
  },

  /* LOUNGE / BAR — shisha lounges and bars. */
  lounge: {
    products: {
      "hmd-tct-classic": m(19.5, 765),
      "hmd-a-craft": m(20.4, 810),
      /* Priced per colour here too. Black is listed explicitly even though it
         equals the fallback: writing it out means the pair is visible as a
         pair, and changing the fallback later cannot move Black by accident. */
      "hmd-tct-op": m(25.5, 1035),
      "hmd-tct-op__black": m(25.5, 1080),
      "hmd-tct-op__purple": m(27.0, 1125),
      "bowl-killer": m(9.5, 390),
      "bowl-livanka": m(8.5, 340),
      "bowl-phunnel": m(11.0, 460),
      "windcover-detonator": m(19.5, 765),
      "windcover-kh": m(19.5, 765),
    },
    addons: {
      lid: m(3.5, 190),
      rubber: m(3.0, 145),
      timer: m(18.5, 675), // 38.00 − 19.50 / 1440 − 765
    },
  },
};

/**
 * The base trade price for one product in one book, or null if it has none.
 *
 * Null is a real answer, not an error: a product added to the catalogue before
 * it reaches the price list simply has no trade price yet, and the portal
 * shows "—" against it rather than inventing one or falling back to retail.
 */
export function bookPrice(type: PartnerType, slug: string, variant?: string | null): Money | null {
  const book = BOOKS[type].products;
  /* The colour first, the product second. Looked up by the same
     `slug__variant` key stock uses, so one spelling serves both. */
  if (variant) {
    const keyed = book[`${slug}__${variant.toLowerCase()}`];
    if (keyed) return keyed;
  }
  return book[slug] ?? null;
}

/** What one add-on costs in one book. Always priced — the list gives all three. */
export function addonPrice(type: PartnerType, addon: keyof LineAddons): Money {
  return BOOKS[type].addons[addon];
}

/**
 * The price of one configured unit — base plus whatever is ticked.
 *
 * THIS IS THE ONLY PLACE A LINE PRICE IS COMPUTED, and the server calls it on
 * submit with flags it has already sanitised against the catalogue. The client
 * calls it too, for the live total, but nothing the client computes is ever
 * stored: what a browser says a thing costs is not evidence.
 */
export function unitPrice(
  type: PartnerType,
  slug: string,
  addons: LineAddons,
  variant?: string | null
): Money | null {
  const base = bookPrice(type, slug, variant);
  if (!base) return null;
  let eur = base.eur;
  let uah = base.uah;
  for (const key of ["lid", "rubber", "timer"] as (keyof LineAddons)[]) {
    if (!addons[key]) continue;
    const a = BOOKS[type].addons[key];
    eur += a.eur;
    uah += a.uah;
  }
  // Two decimals in euro, whole hryvnia — the same shape the lists are in.
  return { eur: Math.round(eur * 100) / 100, uah: Math.round(uah) };
}
