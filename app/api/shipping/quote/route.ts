import { NextRequest, NextResponse } from "next/server";
import { getDeliveryPrice, NovaPoshtaError } from "@/lib/nova-poshta";
import { priceCart } from "@/lib/pricing";

/* ---------------------------------------------------------------------------
   Delivery quote for a Nova Poshta branch.

   The declared value is derived from the catalogue, not taken from the caller —
   the same rule as everywhere else. This quote is for DISPLAY. The amount
   actually charged is re-quoted when the invoice is created, so a stale or
   tampered figure here cannot become the price someone pays.
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
  const cityRef = String(b.cityRef ?? "").trim().slice(0, 80);
  if (!cityRef) return NextResponse.json({ ok: false, error: "no_city" }, { status: 400 });

  // Branch pickup by default; courier delivers to the door.
  const serviceType = b.deliveryType === "courier" ? "WarehouseDoors" : "WarehouseWarehouse";

  const { subtotal } = priceCart(b.lines);
  if (subtotal.uah <= 0) return NextResponse.json({ ok: false, error: "empty_cart" }, { status: 400 });

  try {
    const costUah = await getDeliveryPrice({ cityRecipientRef: cityRef, declaredValueUah: subtotal.uah, serviceType });
    return NextResponse.json({ ok: true, costUah });
  } catch (e) {
    if (e instanceof NovaPoshtaError && e.message.includes("NOVA_POSHTA_API_KEY")) {
      return NextResponse.json({ ok: false, error: "not_configured" }, { status: 500 });
    }
    console.error("[shipping] quote failed:", e);
    return NextResponse.json({ ok: false, error: "quote_failed" }, { status: 502 });
  }
}
