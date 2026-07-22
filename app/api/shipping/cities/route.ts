import { NextRequest, NextResponse } from "next/server";
import { searchCities, NovaPoshtaError } from "@/lib/nova-poshta";

/* ---------------------------------------------------------------------------
   City type-ahead for the Nova Poshta picker.

   A thin proxy whose only job is to keep NOVA_POSHTA_API_KEY on the server.
   Read-only and cheap; the query is length-capped so it cannot be used to push
   arbitrary payloads at Nova Poshta.
--------------------------------------------------------------------------- */

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const query = String((body as { query?: unknown })?.query ?? "").trim().slice(0, 80);
  if (query.length < 2) return NextResponse.json({ ok: true, cities: [] });

  try {
    return NextResponse.json({ ok: true, cities: await searchCities(query) });
  } catch (e) {
    if (e instanceof NovaPoshtaError && e.message.includes("NOVA_POSHTA_API_KEY")) {
      console.error("[shipping] NOVA_POSHTA_API_KEY is not configured");
      return NextResponse.json({ ok: false, error: "not_configured" }, { status: 500 });
    }
    console.error("[shipping] city search failed:", e);
    return NextResponse.json({ ok: false, error: "lookup_failed" }, { status: 502 });
  }
}
