/* ---------------------------------------------------------------------------
   Which carrier is moving the parcel.

   PLAIN CONSTANTS, NO "server-only" — the checkout renders the choice and the
   admin renders the result, so both a client component and a route handler
   read from here. Nothing in this file touches a credential.

   THE STRINGS ARE THE DATABASE VALUES. orders.shipping_carrier stores exactly
   these, so a rename here is a migration, not a refactor. They are snake_case
   to match every other enum-ish text column in the schema.

   `nova_poshta` covers BOTH Nova Poshta APIs — the domestic one and the Nova
   Post cross-border one. That is deliberate: they are two endpoints belonging
   to one carrier, the customer sees one brand, and the parcel is handed to one
   company. Which endpoint priced it is decided by the destination, not stored.
--------------------------------------------------------------------------- */

export const SHIPPING_CARRIERS = ["nova_poshta", "ukrposhta"] as const;

export type ShippingCarrier = (typeof SHIPPING_CARRIERS)[number];

export function isShippingCarrier(value: unknown): value is ShippingCarrier {
  return typeof value === "string" && (SHIPPING_CARRIERS as readonly string[]).includes(value);
}

/** The carrier's own name, which is a proper noun and is not translated. */
export const CARRIER_NAME: Record<ShippingCarrier, { en: string; uk: string }> = {
  nova_poshta: { en: "Nova Post", uk: "Nova Post" },
  ukrposhta: { en: "Ukrposhta", uk: "Укрпошта" },
};

export function carrierName(carrier: ShippingCarrier, locale: string): string {
  return CARRIER_NAME[carrier][locale === "uk" ? "uk" : "en"];
}
