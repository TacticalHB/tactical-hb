import { NextRequest, NextResponse } from "next/server";
import { getWarehouses, NovaPoshtaError } from "@/lib/nova-poshta";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const b = (body ?? {}) as { cityRef?: unknown; query?: unknown };
  const cityRef = String(b.cityRef ?? "").trim().slice(0, 80);
  const query = String(b.query ?? "").trim().slice(0, 80);
  if (!cityRef) return NextResponse.json({ ok: true, warehouses: [] });

  try {
    return NextResponse.json({ ok: true, warehouses: await getWarehouses(cityRef, query) });
  } catch (e) {
    if (e instanceof NovaPoshtaError && e.message.includes("NOVA_POSHTA_API_KEY")) {
      return NextResponse.json({ ok: false, error: "not_configured" }, { status: 500 });
    }
    console.error("[shipping] warehouse lookup failed:", e);
    return NextResponse.json({ ok: false, error: "lookup_failed" }, { status: 502 });
  }
}
