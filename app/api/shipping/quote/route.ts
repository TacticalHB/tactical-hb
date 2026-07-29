import { NextRequest, NextResponse } from "next/server";
import { getDeliveryPrice, NovaPoshtaError } from "@/lib/nova-poshta";
import { quoteInternational, NovaPostError } from "@/lib/novapost";
import { priceCart } from "@/lib/pricing";
import { parcelFor } from "@/lib/parcel";

/* ---------------------------------------------------------------------------
   Delivery quote — a Nova Poshta branch at home, or a country abroad.

   The declared value is derived from the catalogue, not taken from the caller —
   the same rule as everywhere else. This quote is for DISPLAY. The amount
   actually charged is re-quoted when the invoice is created, so a stale or
   tampered figure here cannot become the price someone pays.

   TWO CARRIERS' APIS BEHIND ONE ROUTE. Domestic goes to api.novaposhta.ua,
   international to api.novapost.com — see lib/novapost.ts for why they are not
   interchangeable. A country Nova Post will not carry to is NOT an error here:
   it answers ok with unsupported, and the checkout falls back to the
   request-by-email flow rather than showing a failure.
--------------------------------------------------------------------------- */

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
    try {
      const quote = await quoteInternational({
        countryCode,
        weightKg: parcel.weightKg,
        dims: parcel.dims,
        declaredValueUah: subtotal.uah,
        city: String(b.city ?? "").trim() || undefined,
      });
      return quote.ok
        ? NextResponse.json({ ok: true, costUah: quote.costUah })
        : NextResponse.json({ ok: true, unsupported: true });
    } catch (e) {
      if (e instanceof NovaPostError && e.message.includes("NOVA_POSHTA_API_KEY")) {
        return NextResponse.json({ ok: false, error: "not_configured" }, { status: 500 });
      }
      console.error("[shipping] international quote failed:", e);
      // Degrade to the request flow rather than block the sale on an outage.
      return NextResponse.json({ ok: true, unsupported: true });
    }
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
