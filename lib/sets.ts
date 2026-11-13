import { products, isPurchasable, type Product } from "@/lib/products";
import { materialUpcharge, materialWeightG } from "@/lib/hmd-options";
import { timerUpcharge, timerWeightG } from "@/lib/windcover-options";
import { addMoney, money, scaleMoney, type Money } from "@/lib/currency";

/* ---------------------------------------------------------------------------
   Sets — a fixed bundle sold as one product (Mario, 13 Nov 2026).

   The first is Black On Black: Project KI 06, HMD TCT OP Black with Lid 9E418
   and FEAR 9E418 fitted, and the Tactical Killer bowl.

   ONE PRICE IN THE CATALOGUE, REAL LINES EVERYWHERE ELSE. A set is listed,
   carded and added to the bag as one thing at its own price. The moment
   lib/pricing prices it, it becomes the products it is made of, each carrying
   a share of the set price and tagged with the set it came from. Every
   downstream consumer — stock, the fiscal receipt, the parcel weight, the
   Monobank basket, the waybill — therefore sees ordinary product lines it
   already knows how to handle, and nothing there had to learn what a set is.

   THE SAVING IS NEVER STATED. The page crosses out what the parts cost on
   their own and prints the set price beside it. No percentage, anywhere — the
   same copy rule as the full-setup saving in lib/bundle.

   NOT DISCOUNTED AGAIN. The set's share of the basket is outside gift codes,
   vouchers, the rank discount and the full-setup saving (`discountable` in
   PricedCart). Its price already is the reduction.

   RETAIL ONLY. A set has no wholesale price and the portal does not list it.
--------------------------------------------------------------------------- */

export type SetItem = {
  slug: string;
  qty: number;
  variant?: string;
  lid?: boolean;
  rubber?: boolean;
  timer?: boolean;
};

export function isSet(p: Product | undefined): boolean {
  return !!p?.setItems?.length;
}

function productOf(slug: string): Product | undefined {
  return products.find((x) => x.slug === slug);
}

/** One unit of a component at its ordinary catalogue price, add-ons included. */
export function componentUnitPrice(item: SetItem): Money {
  const p = productOf(item.slug);
  if (!p) return money(0, 0);
  const v = item.variant ? p.variants?.find((x) => x.name === item.variant) : undefined;
  let unit = money(v?.price ?? p.price, v?.priceUah ?? p.priceUah);
  if (p.category === "hmd") unit = addMoney(unit, materialUpcharge({ lid: !!item.lid, rubber: !!item.rubber }));
  if (p.category === "windcover") unit = addMoney(unit, timerUpcharge({ timer: !!item.timer }));
  return unit;
}

/** Packed weight of one unit of a component, add-ons included. */
export function componentWeightG(item: SetItem): number {
  const p = productOf(item.slug);
  if (!p) return 0;
  let g = p.weightG;
  if (p.category === "hmd") g += materialWeightG({ lid: !!item.lid, rubber: !!item.rubber });
  if (p.category === "windcover") g += timerWeightG({ timer: !!item.timer });
  return g;
}

/** What the parts cost bought separately — the crossed-out figure. */
export function setFullPrice(p: Product): Money {
  return (p.setItems ?? []).reduce<Money>(
    (sum, it) => addMoney(sum, scaleMoney(componentUnitPrice(it), it.qty)),
    money(0, 0)
  );
}

/**
 * Can the set be sold right now? Only if the set itself and every part of it
 * can — a set with a sold-out bowl in it is a set that cannot ship.
 */
export function setAvailable(p: Product): boolean {
  // isPurchasable already checks every part of a set (lib/products).
  return isSet(p) && isPurchasable(p);
}

export type SetShare = { item: SetItem; product: Product; unit: Money };

/**
 * The set price shared out over its parts, per unit.
 *
 * PROPORTIONAL TO WHAT EACH PART COSTS ON ITS OWN, in each currency
 * separately (the two price lists are set independently, so one must never be
 * derived from the other). Euro to the cent, hryvnia to the whole hryvnia, and
 * the rounding remainder goes on the dearest single-unit part so that the
 * shares add up to the set price EXACTLY — the Monobank basket and the fiscal
 * receipt both reject lines that do not sum to the amount charged.
 */
export function splitSetPrice(p: Product): SetShare[] {
  const items = (p.setItems ?? []).map((item) => ({ item, product: productOf(item.slug)!, full: componentUnitPrice(item) }));
  if (items.some((x) => !x.product)) return [];
  const full = setFullPrice(p);
  const share = (cur: "eur" | "uah", step: number) => {
    const target = cur === "eur" ? p.price : p.priceUah;
    const units = items.map((x) =>
      full[cur] > 0 ? Math.round(((x.full[cur] * target) / full[cur]) / step) * step : 0
    );
    const got = units.reduce((s, u, i) => s + u * items[i].item.qty, 0);
    const diff = Math.round((target - got) / step) * step;
    if (diff !== 0) {
      let k = -1;
      items.forEach((x, i) => {
        if (x.item.qty === 1 && (k < 0 || x.full[cur] > items[k].full[cur])) k = i;
      });
      if (k >= 0) units[k] = units[k] + diff;
    }
    return units.map((u) => (cur === "eur" ? Math.round(u * 100) / 100 : Math.round(u)));
  };
  const eur = share("eur", 0.01);
  const uah = share("uah", 1);
  return items.map((x, i) => ({ item: x.item, product: x.product, unit: { eur: eur[i], uah: uah[i] } }));
}
