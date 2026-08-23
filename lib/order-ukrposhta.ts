import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createShipment, ukrposhtaBookingEnabled } from "@/lib/ukrposhta-shipment";
import { UkrposhtaNotConfigured } from "@/lib/ukrposhta";
import { parcelFor } from "@/lib/parcel";
import { priceCart } from "@/lib/pricing";

/* ---------------------------------------------------------------------------
   Book the Ukrposhta parcel for a paid order.

   The Ukrposhta counterpart of lib/order-ttn, and it follows that file's rules
   because they were the right ones: it runs AFTER the money, it NEVER throws,
   and a failure leaves the order 'paid' so it surfaces in the admin queue for
   a human rather than unwinding a payment the customer has already made.

   ── IDEMPOTENCY LIVES HERE, NOT IN THE API CLIENT ────────────────────────
   Ukrposhta has no natural key to deduplicate on: post the same parcel twice
   and you get two parcels, two labels and two charges. Monobank retries its
   webhook, so "twice" is not hypothetical.

   The order row is the lock. ukrposhta_uuid is written the moment a shipment
   exists, and this refuses to book when one is already there — so a retry
   costs one SELECT and returns the parcel that already exists. The check reads
   the row fresh rather than trusting anything passed in, because the whole
   point is to catch a second call that believes it is the first.
--------------------------------------------------------------------------- */

export async function createUkrposhtaShipmentForOrder(
  orderId: string,
  payment: {
    shipping_carrier?: string | null;
    shipping_method?: string | null;
    shipping_uah?: number | null;
    delivery?: unknown;
    lines?: unknown;
  }
): Promise<void> {
  try {
    if (payment.shipping_carrier !== "ukrposhta") return;

    if (!ukrposhtaBookingEnabled()) {
      /* Not a failure — booking is deliberately off while the sender postcode
         is being confirmed. Logged at info so the admin queue is explained
         rather than looking like an outage. */
      console.info(
        `[ukrposhta] booking disabled — order ${orderId} needs a parcel bought by hand`
      );
      return;
    }

    const admin = createAdminClient();

    // The lock: already booked?
    const { data: existing } = await admin
      .from("orders")
      .select("ukrposhta_uuid, ukrposhta_barcode")
      .eq("id", orderId)
      .maybeSingle();

    if (existing?.ukrposhta_uuid) {
      console.info(`[ukrposhta] order ${orderId} already booked (${existing.ukrposhta_barcode ?? "no barcode"})`);
      return;
    }

    const d = (payment.delivery ?? {}) as Record<string, string>;
    const countryIso2 = String(d.countryCode ?? "").trim().toUpperCase().slice(0, 2);
    if (!countryIso2) {
      console.error(`[ukrposhta] order ${orderId} has no destination country — cannot book`);
      return;
    }

    /* The parcel is re-derived from the catalogue, not read off the payment.
       Same rule as the price: the browser described the basket, the server
       decides what it weighs. */
    const priced = priceCart(payment.lines);
    const parcel = parcelFor(priced.lines);

    const result = await createShipment({
      recipient: {
        firstName: String(d.firstName ?? "").trim(),
        lastName: String(d.surname ?? "").trim(),
        phone: String(d.phone ?? "").trim(),
        email: String(d.email ?? "").trim(),
        countryIso2,
        city: String(d.city ?? "").trim(),
        postcode: String(d.postcode ?? "").trim(),
        street: String(d.address ?? "").trim(),
        apartment: String(d.apartment ?? "").trim() || undefined,
      },
      weightKg: parcel.weightKg,
      dims: parcel.dims,
      declaredValueUah: priced.subtotal.uah,
      deliveryPriceUah: Number(payment.shipping_uah ?? 0),
      /* What customs will read. Generic on purpose — it describes the class of
         goods rather than listing a model number that means nothing to an
         inspector. */
      description: "Hookah accessories (aluminium)",
    });

    await admin
      .from("orders")
      .update({ ukrposhta_uuid: result.uuid, ukrposhta_barcode: result.barcode })
      .eq("id", orderId);

    console.log(`[ukrposhta] booked order ${orderId}: ${result.barcode || result.uuid}`);
  } catch (e) {
    /* NEVER THROWS. The customer has paid; a courier API having a bad day must
       not turn that into a failed order. The order stays 'paid' with no
       barcode, which is exactly the "buy this one by hand" queue in
       /admin/orders. */
    const quiet = e instanceof UkrposhtaNotConfigured;
    (quiet ? console.warn : console.error)(
      `[ukrposhta] could not book order ${orderId}:`,
      e instanceof Error ? e.message : e
    );
  }
}
