import { NextResponse } from "next/server";
import { products } from "@/lib/products";
import { retailRows } from "@/lib/retail-reference";

export const runtime = "nodejs";

/* ---------------------------------------------------------------------------
   The retail rows as JSON, for scripts/build-retail-prices.py — the same rows
   the portal's "Retail prices" tab renders, so the PDF and the screen cannot
   disagree. Each row carries its product photo for the PDF's thumbnails.

   Development only; 404 in production.
--------------------------------------------------------------------------- */

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not found", { status: 404 });
  }
  const rows = retailRows().map((r) => {
    const p = products.find((x) => x.slug === r.key.split("__")[0]);
    const v = p?.variants?.find((x) => x.name === r.colour);
    return { ...r, image: r.addon ? null : v?.image || p?.gridImage || p?.image || null };
  });
  return NextResponse.json({ rows });
}
