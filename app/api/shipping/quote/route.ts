import { NextRequest, NextResponse } from "next/server";
import { getDeliveryPrice, NovaPoshtaError } from "@/lib/nova-poshta";
import { quoteInternational as quoteNovaPost, NovaPostError } from "@/lib/novapost";
import {
  quoteInternational as quoteUkrposhta,
  UkrposhtaNotConfigured,
} from "@/lib/ukrposhta";
import { priceCart } from "@/lib/pricing";
import { parcelFor } from "@/lib/parcel";
import type { ShippingCarrier } from "@/lib/shipping-carriers";

/* ---------------------------------------------------------------------------
   Delivery quote — a Nova Poshta branch at home, or a country abroad.

   The declared value is derived from the catalogue, not taken from the caller —
   the same rule as everywhere else. This quote is for DISPLAY. The amount
   actually charged is re-quoted when the invoice is created, so a stale or
   tampered figure here cannot become the price someone pays.

   THREE CARRIER APIS BEHIND ONE ROUTE. Domestic goes to api.novaposhta.ua.
   International asks BOTH Nova Post (api.novapost.com) and Ukrposhta
   (dev/www.ukrposhta.ua/ecom) and returns whatever each of them offers, so the
   customer picks. See lib/novapost.ts and lib/ukrposhta.ts for why none of the
   three is interchangeable with another.

   NEITHER INTERNATIONAL CARRIER CAN TAKE THE OTHER DOWN. They are asked with
   Promise.allSettled and each is reduced independently: a rejection, a timeout
   or a "we do not go there" from one leaves the other's offer standing. Only
   when BOTH come back with nothing does the checkout fall through to the
   confirm-by-email flow it used before Ukrposhta existed — which is the same
   behaviour as before for every country Nova Post already refused, except that
   Ukrposhta now gets a chance to serve it first.

   DOMESTIC IS UNTOUCHED. Ukrposhta domestic is deliberately not implemented
   (see lib/ukrposhta.ts); inside Ukraine this route behaves exactly as it did.
--------------------------------------------------------------------------- */

/** One carrier's answer, as the checkout renders it. */
type Offer = { carrier: ShippingCarrier; costUah: number };

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const b = (body ?? {}) as Record<string, unknown>;

  // ---- International: priced by country, no branch involved -----------------
  const countryCode = String(b.countryCode ?? "").trim().toUpperCase().slice(0, 2);
  if (countryCode) {
    const { lines, subtotal } = priceCart(b.lines);
    if (subtotal.uah <= 0) return NextResponse.json({ ok: false, error: "empty_cart" }, { status: 400 });

    const parcel = parcelFor(lines);
    const city = String(b.city ?? "").trim() || undefined;

    /* BOTH CARRIERS, AT THE SAME TIME. Sequentially this step would cost the
       sum of two round trips on the one screen where a customer is already
       waiting to see a number. allSettled rather than all: one rejecting must
       not discard the other's answer, which is the entire point. */
    const [np, up] = await Promise.allSettled([
      quoteNovaPost({
        countryCode,
        weightKg: parcel.weightKg,
        dims: parcel.dims,
        declaredValueUah: subtotal.uah,
        city,
      }),
      quoteUkrposhta({
        countryCode,
        weightKg: parcel.weightKg,
        dims: parcel.dims,
        declaredValueUah: subtotal.uah,
      }),
    ]);

    const offers: Offer[] = [];

    if (np.status === "fulfilled" && np.value.ok) {
      offers.push({ carrier: "nova_poshta", costUah: np.value.costUah });
    } else if (np.status === "rejected") {
      /* A missing Nova Poshta key is a deployment fault, not a routing one, and
         it is the pre-existing carrier — so it is still reported loudly here
         even though the response degrades gracefully. */
      const missingKey =
        np.reason instanceof NovaPostError && np.reason.message.includes("NOVA_POSHTA_API_KEY");
      console.error(
        `[shipping] Nova Post quote failed for ${countryCode}` + (missingKey ? " (API key not set)" : ""),
        np.reason
      );
    }

    if (up.status === "fulfilled" && up.value.ok) {
      offers.push({ carrier: "ukrposhta", costUah: up.value.costUah });
    } else if (up.status === "rejected") {
      /* Not configured is the expected state until the bearers are in the
         environment, and it must stay quiet enough not to drown the log while
         still being visible. Everything else is a real fault. */
      if (up.reason instanceof UkrposhtaNotConfigured) {
        console.warn(`[shipping] Ukrposhta not configured — skipping (${up.reason.message})`);
      } else {
        console.error(`[shipping] Ukrposhta quote failed for ${countryCode}`, up.reason);
      }
    }

    /* Cheapest first. The customer still chooses, but the order of a list is
       itself a recommendation and the cheaper carrier is the honest default to
       put at the top. */
    offers.sort((a, b2) => a.costUah - b2.costUah);

    if (offers.length === 0) {
      /* Both refused or both broke. Identical to the old behaviour — the
         checkout offers to confirm the total by email — except that this now
         means TWO carriers could not serve the destination rather than one. */
      return NextResponse.json({ ok: true, unsupported: true });
    }

    return NextResponse.json({
      ok: true,
      offers,
      /* The cheapest, repeated at the top level. Older clients that only knew
         about `costUah` keep working against a two-carrier response instead of
         silently reading undefined and charging nothing. */
      costUah: offers[0].costUah,
    });
  }

  const cityRef = String(b.cityRef ?? "").trim().slice(0, 80);
  if (!cityRef) return NextResponse.json({ ok: false, error: "no_city" }, { status: 400 });

  // Branch pickup by default; courier delivers to the door.
  const serviceType = b.deliveryType === "courier" ? "WarehouseDoors" : "WarehouseWarehouse";
  // Poshtomat delivery carries a surcharge the city-level estimate can't see.
  // Only meaningful for branch pickup — courier never goes to a locker.
  const postomat = b.deliveryType !== "courier" && b.postomat === true;

  const { lines, subtotal } = priceCart(b.lines);
  if (subtotal.uah <= 0) return NextResponse.json({ ok: false, error: "empty_cart" }, { status: 400 });

  const parcel = parcelFor(lines);

  try {
    const costUah = await getDeliveryPrice({ cityRecipientRef: cityRef, declaredValueUah: subtotal.uah, serviceType, postomat, weightKg: parcel.weightKg });
    return NextResponse.json({ ok: true, costUah });
  } catch (e) {
    if (e instanceof NovaPoshtaError && e.message.includes("NOVA_POSHTA_API_KEY")) {
      return NextResponse.json({ ok: false, error: "not_configured" }, { status: 500 });
    }
    console.error("[shipping] quote failed:", e);
    return NextResponse.json({ ok: false, error: "quote_failed" }, { status: 502 });
  }
}
