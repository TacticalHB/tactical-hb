import { NextResponse } from "next/server";
import { products } from "@/lib/products";
import { bookPrice } from "@/lib/wholesale-prices";
import { LID_WEIGHT_G } from "@/lib/hmd-options";

export const runtime = "nodejs";

/* ---------------------------------------------------------------------------
   The catalogue as JSON, for the product specification PDF.

   SAME RULE AS /api/dev/price-list, and for the same reason it was written:
   a printed document that restates numbers the code already holds will be
   wrong within a week of the first change. The site is what a customer reads,
   so the site's data is what the document is generated from. Reprice or
   respec in lib/products.ts, run the script, and the sheet cannot be stale.

   EVERYTHING IS PASSED THROUGH VERBATIM. This route decides nothing about
   what a product IS — no derived claims, no filled-in blanks. Where the
   catalogue is silent, the JSON is silent, and the PDF prints that silence
   as "not specified" rather than borrowing a number from a similar product.

   Development only, 404 in production.

   Rebuild the PDF with:  python3 scripts/build-product-spec.py
--------------------------------------------------------------------------- */

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not found", { status: 404 });
  }

  const out = products.map((p) => ({
    slug: p.slug,
    name: p.nameEn,
    tagline: p.taglineEn,
    description: p.descriptionEn,
    short: p.pdp?.shortEn ?? null,
    statement: p.pdp?.statementEn ?? null,
    category: p.category,
    incoming: p.incoming === true,

    priceEur: p.price,
    priceUah: p.priceUah,
    /* Trade prices come from the price book, never from the product — the two
       books differ by ~60% and neither is derived from retail. */
    tradeShop: bookPrice("shop", p.slug) ?? null,
    tradeLounge: bookPrice("lounge", p.slug) ?? null,

    weightG: p.weightG,
    dims: p.dims,
    /* An HMD's weight excludes the lid; the sheet says so rather than quoting
       a figure that is only true for a device nobody configured. */
    lidWeightG: p.category === "hmd" ? LID_WEIGHT_G : null,

    /* PER COLOUR, BECAUSE THE MONEY IS PER COLOUR. HMD TCT OP is €30 in black
       and €32 in purple, and its two trade books differ by colour as well —
       so a sheet quoting the product-level figure alone would understate
       every purple line on it. Retail falls back to the product's price the
       way the PDP does; trade is read from the book, which answers per
       colour or not at all. */
    colours: (p.variants ?? []).map((v) => ({
      name: v.name,
      priceEur: v.price ?? p.price,
      priceUah: v.priceUah ?? p.priceUah,
      tradeShop: bookPrice("shop", p.slug, v.name) ?? null,
      tradeLounge: bookPrice("lounge", p.slug, v.name) ?? null,
    })),
    colourShown: p.pdp?.colourShownEn ?? null,

    specs: (p.pdp?.specs ?? []).map((s) => ({ label: s.labelEn, value: s.valueEn })),
    benefits: p.pdp?.benefitsEn ?? [],
    tips: p.pdp?.tipsEn ?? [],
    features: (p.pdp?.features ?? []).map((f) => ({ title: f.titleEn, text: f.textEn })),
  }));

  return NextResponse.json({ products: out, count: out.length });
}
