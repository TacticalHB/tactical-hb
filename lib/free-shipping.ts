/* ---------------------------------------------------------------------------
   Free delivery inside Ukraine from ₴5 000 (Mario, 15 Oct 2026).

   ONLY THE UKRAINIAN STOREFRONT. /uk is the one that ships inside Ukraine (see
   lib/shipping-locale), so the offer is tied to the locale rather than to a
   destination field a request could set.

   MEASURED ON THE GOODS THE CUSTOMER PAYS FOR — the basket after the set
   saving and after a voucher or rank discount — never on list prices. The
   threshold is about what was spent, so a discount that takes a ₴5 100 basket
   to ₴4 800 takes it under.

   The cart and checkout show the same figure the invoice route enforces:
   create-invoice charges ₴0 shipping when freeShippingApplies() says so, and
   the business still books and pays the Nova Poshta waybill as before.

   Pure, so the browser and the server read one rule.
--------------------------------------------------------------------------- */

export const FREE_SHIPPING_UAH = 5000;

/** Does this order ship free? Ukrainian storefront, goods at or over ₴5 000. */
export function freeShippingApplies(locale: string, goodsUah: number): boolean {
  return locale === "uk" && goodsUah >= FREE_SHIPPING_UAH;
}

/**
 * How much more until delivery is free, in hryvnia — 0 once it is, and null
 * on a storefront the offer does not apply to.
 */
export function toFreeShipping(locale: string, goodsUah: number): number | null {
  if (locale !== "uk") return null;
  return Math.max(0, Math.ceil(FREE_SHIPPING_UAH - goodsUah));
}
