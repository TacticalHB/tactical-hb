import type { Money } from "@/lib/currency";

/* ---------------------------------------------------------------------------
   The order snapshot that carries checkout → confirmation.

   Deliberately client-side for now. The `orders` table has no line items,
   address or currency columns, and real order creation lands with the Monobank
   integration — so persisting a half-shaped row today would only have to be
   migrated later. sessionStorage (not localStorage) so a finished order dies
   with the tab instead of resurfacing days later on the confirmation URL.

   Prices are FROZEN into the snapshot at order time. Reading them back out of
   lib/products on the confirmation page would silently restate the order if a
   price ever changed between purchase and refresh.
--------------------------------------------------------------------------- */

export type OrderLine = {
  slug: string;
  qty: number;
  name: string;
  image: string;
  colour: string | null;
  material: string | null;
  addons: string | null;
  /** Unit price at the moment the order was placed. */
  unitPrice: Money;
};

export type DeliveryDetails = {
  email: string;
  firstName: string;
  surname: string;
  phone: string;
  address: string;
  apartment: string;
  city: string;
  postcode: string;
  country: string;
};

export type OrderSnapshot = {
  orderNo: string;
  createdAt: string;
  locale: string;
  delivery: DeliveryDetails;
  lines: OrderLine[];
  subtotal: Money;
  /** Voucher value applied, if any. Absent on orders saved before vouchers existed. */
  discount?: Money;
  /** Subtotal minus discount — what the customer actually pays. */
  total?: Money;
  voucherCode?: string | null;
  /** Payment method the shopper chose. No card data is ever held here. */
  paymentMethod: string;
  accountCreated: boolean;
};

const KEY = "tct-last-order";

/** e.g. TCT-7K2QF9 — a display reference only, not an identifier of record. */
export function makeOrderNo(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1
  let out = "";
  const bytes =
    typeof crypto !== "undefined" && crypto.getRandomValues
      ? crypto.getRandomValues(new Uint8Array(6))
      : Array.from({ length: 6 }, () => Math.floor(Math.random() * 256));
  for (let i = 0; i < 6; i++) out += alphabet[bytes[i] % alphabet.length];
  return `TCT-${out}`;
}

export function saveOrder(order: OrderSnapshot): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(order));
  } catch {
    // A blocked sessionStorage must not break the purchase flow; the
    // confirmation page degrades to its "no order found" state.
  }
}

export function loadOrder(): OrderSnapshot | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    // Untrusted: this came from storage the user can edit.
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof (parsed as OrderSnapshot).orderNo !== "string" ||
      !Array.isArray((parsed as OrderSnapshot).lines)
    ) {
      return null;
    }
    return parsed as OrderSnapshot;
  } catch {
    return null;
  }
}
