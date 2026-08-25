import { NextResponse } from "next/server";
import { addonPrice, bookPrice, PARTNER_TYPES } from "@/lib/wholesale-prices";

export const runtime = "nodejs";

/* ---------------------------------------------------------------------------
   The price books as JSON, for the PDF generator.

   THE DOCUMENT IS BUILT FROM THE CODE, not typed alongside it. The printed
   list and lib/wholesale-prices disagreed within a day of the first repricing
   — twice — because they were two copies of the same numbers maintained by
   hand. This is the one that the portal actually charges from, so it is the
   one the PDF has to be generated from.

   Development only, and 404 in production: it is not a customer endpoint, and
   the whole point of a wholesale price list is that it is not public.

   Rebuild the PDF with:  python3 scripts/build-price-list.py
--------------------------------------------------------------------------- */

/** The rows the printed list carries, in its own order. */
const ROWS: { slug: string; label: string; variant?: string }[] = [
  { slug: "hmd-tct-classic", label: "HMD TCT Classic" },
  { slug: "hmd-a-craft", label: "HMD A.Craft" },
  { slug: "hmd-tct-op", label: "HMD TCT OP — Black", variant: "Black" },
  { slug: "hmd-tct-op", label: "HMD TCT OP — Purple", variant: "Purple" },
  { slug: "bowl-killer", label: "Tactical Killer" },
  { slug: "bowl-livanka", label: "Tactical Livanka" },
  { slug: "bowl-phunnel", label: "Tactical 0.66 F.CK THE PHUNNEL (FTP)" },
  { slug: "windcover-detonator", label: "Windcover (standard)" },
];

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not found", { status: 404 });
  }

  const books = Object.fromEntries(
    PARTNER_TYPES.map((book) => {
      const lines = ROWS.map((r) => {
        const p = bookPrice(book, r.slug, r.variant);
        return { label: r.label, eur: p?.eur ?? null, uah: p?.uah ?? null };
      });

      /* The list sells the wind cover's timer as a second product; the site
         models it as a surcharge. Printed back as the list expects it, so the
         document a partner holds matches the one they were sent before. */
      const wc = bookPrice(book, "windcover-detonator");
      const timer = addonPrice(book, "timer");
      if (wc) {
        lines.push({
          label: "Windcover with timer",
          eur: Math.round((wc.eur + timer.eur) * 100) / 100,
          uah: wc.uah + timer.uah,
        });
      }
      lines.push({ label: "Lid 9E418", ...addonPrice(book, "lid") });
      lines.push({ label: "FEAR 9E418", ...addonPrice(book, "rubber") });

      return [book, lines];
    })
  );

  return NextResponse.json({ books });
}
