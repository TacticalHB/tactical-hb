import { products, availabilityOf, availabilityText, type Availability, type Product } from "@/lib/products";
import { PARTNER_TYPES, bookPrice, addonPrice, type PartnerType } from "@/lib/wholesale-prices";
import type { Money } from "@/lib/currency";

/* ---------------------------------------------------------------------------
   The trade price books, laid out as one table anyone can read.

   BUILT FROM THE BOOKS, NOT RETYPED BESIDE THEM. This is the same rule the
   printed price list follows and for the same reason: the PDF and the code
   disagreed twice within a week of each other when they were two hand-kept
   copies, and the portal charges from the code. An admin screen that restated
   the numbers would be a third copy and would be wrong third.

   IT READS THE CATALOGUE, NOT A FIXED ROW LIST. app/api/dev/price-list keeps a
   hand-ordered ROWS array because the printed document has to match the layout
   partners were sent before — labels and all. This one answers a different
   question: "what do we charge for everything we sell, right now". A product
   added to the catalogue tomorrow appears here without anyone remembering to
   add it, and one with no trade price appears as a gap rather than vanishing.

   COLOURS ARE THEIR OWN ROWS where a book prices them apart, because HMD TCT
   OP is not one number on any book.
--------------------------------------------------------------------------- */

export type PriceRow = {
  /** Catalogue slug, or the add-on key — the identifier, for the eye. */
  key: string;
  label: string;
  /** What kind of thing it is, for grouping. */
  group: "hmd" | "bowl" | "windcover" | "accessory" | "addon";
  /** One entry per book, in PARTNER_TYPES order. Null = no trade price set. */
  prices: (Money | null)[];
  /**
   * True when SHOP AND DISTRIBUTION differ on this line.
   *
   * NOT "the books are not all equal" — that was the first version and it
   * marked every row in the table, because the lounge book differs on all of
   * them by design. A flag that is always on is a flag nobody reads. The one
   * fact worth catching at a glance is where distribution has been repriced
   * away from shop, which today is nowhere and tomorrow is the point.
   */
  distributionDiffers: boolean;
  /**
   * Whether it can be sold right now.
   *
   * SHOWN, NOT FILTERED. The first version hid anything unavailable, which
   * quietly dropped the FTP bowl and both accessories from a table whose whole
   * job is to be looked up at any time. What something costs does not stop
   * being true because the shelf is empty this week — and a partner asking the
   * price of a sold-out bowl is an ordinary question to be able to answer.
   */
  availability: Availability;
  availabilityLabel: string;
};

const GROUP_LABEL: Record<PriceRow["group"], { en: string; uk: string }> = {
  hmd: { en: "Heat management devices", uk: "Пристрої для керування жаром" },
  bowl: { en: "Bowls", uk: "Чаші" },
  windcover: { en: "Wind covers", uk: "Ковпаки" },
  /* The lid and the ring sit here, and their price is the same whether they
     are ticked on a device or bought loose — one number per book per part. */
  accessory: { en: "Accessories — same price fitted or loose", uk: "Аксесуари — ціна однакова окремо чи на пристрої" },
  addon: { en: "Options with no page of their own", uk: "Опції без окремої сторінки" },
};

export function groupLabel(g: PriceRow["group"], locale: string): string {
  return locale === "uk" ? GROUP_LABEL[g].uk : GROUP_LABEL[g].en;
}

export function bookLabel(t: PartnerType, locale: string): string {
  const uk = locale === "uk";
  if (t === "shop") return uk ? "Магазин / Рітейл" : "Shop / Retail";
  if (t === "distribution") return uk ? "Дистрибуція" : "Distribution";
  return uk ? "Кальянна / Бар" : "Lounge / Bar";
}

function eq(a: Money | null, b: Money | null): boolean {
  if (a === null || b === null) return a === b;
  return a.eur === b.eur && a.uah === b.uah;
}

function row(
  key: string,
  label: string,
  group: PriceRow["group"],
  prices: (Money | null)[],
  availability: Availability,
  locale: string
): PriceRow {
  const shopIdx = PARTNER_TYPES.indexOf("shop");
  const distIdx = PARTNER_TYPES.indexOf("distribution");
  return {
    key,
    label,
    group,
    prices,
    distributionDiffers: !eq(prices[shopIdx] ?? null, prices[distIdx] ?? null),
    availability,
    availabilityLabel: availabilityText(availability, locale),
  };
}

/** Every sellable line, priced across every book. */
export function priceTable(locale: string): PriceRow[] {
  const uk = locale === "uk";
  const books = PARTNER_TYPES;
  const out: PriceRow[] = [];

  /* EVERYTHING WITH A TRADE PRICE, whether or not the shelf is empty today.
     The withheld listing is the one exclusion and it excludes itself: it has
     no trade price on any book, so it would be a row of dashes naming a
     product nobody is allowed to know about. */
  const priced = products.filter((p: Product) => p.incoming !== true);

  for (const p of priced) {
    const availability = availabilityOf(p);
    const group = (p.category === "hookah" ? "accessory" : p.category) as PriceRow["group"];
    const name = uk ? p.nameUk : p.nameEn;

    if (p.variants?.length) {
      /* One row per colour when the books price them apart, one row for the
         product when they do not — the same test the spec sheet applies to
         retail, so the two documents describe the catalogue the same way. */
      const perColour = p.variants.map((v) => ({
        name: v.name,
        prices: books.map((b) => bookPrice(b, p.slug, v.name)),
      }));
      const flat = books.map((b) => bookPrice(b, p.slug));
      const differs = perColour.some((c) =>
        c.prices.some((m, i) => (m?.eur ?? null) !== (flat[i]?.eur ?? null))
      );
      if (differs) {
        for (const c of perColour) {
          out.push(row(`${p.slug}__${c.name}`, `${name} — ${c.name}`, group, c.prices, availability, locale));
        }
        continue;
      }
    }
    out.push(row(p.slug, name, group, books.map((b) => bookPrice(b, p.slug)), availability, locale));
  }

  /* ONLY THE TIMER. The lid and the ring are add-ons too, but they are also
     catalogue products and already have rows above — and it is the SAME
     number either way, because bookPrice maps those slugs onto the add-on
     figure rather than keeping a second copy. Listing them twice put two
     identical rows in a table whose whole job is to be scanned, and invited
     the reader to wonder which one applied. The timer has no product of its
     own, so without this row it would have no price anywhere. */
  const addonLabels: { key: "timer"; en: string; uk: string }[] = [
    { key: "timer", en: "Timer (on a wind cover)", uk: "Таймер (на ковпаку)" },
  ];
  for (const a of addonLabels) {
    out.push(row(a.key, uk ? a.uk : a.en, "addon", books.map((b) => addonPrice(b, a.key)), "available", locale));
  }

  return out;
}

/** The books, in the order the table's columns run. */
export function tableBooks(): readonly PartnerType[] {
  return PARTNER_TYPES;
}
