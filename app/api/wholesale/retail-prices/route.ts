import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@/lib/supabase/server";
import { partnerForUser } from "@/lib/wholesale-portal";
import { canAccessPortal } from "@/lib/wholesale-display";

/* ---------------------------------------------------------------------------
   The retail price list as a PDF — the download under the portal's "Retail
   prices" tab (Mario, 14 Oct 2026).

   The same gate as the product sheet: a signed-in partner whose account is
   approved, anyone else a 404. Retail prices are public on the storefront, but
   this download belongs to the portal, so it gets the portal's gate.

   THE PARTNER'S CURRENCY PICKS THE FILE: hryvnia partners get the Ukrainian
   list, euro partners the English one, whatever page they came from.

   The files are built from the catalogue by scripts/build-retail-prices.py;
   test/retail-reference.test.ts fails if a retail price changes without them.
--------------------------------------------------------------------------- */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FILES = {
  UAH: { file: "retail-prices-uah.pdf", name: "Tactical_HB_Retail_Prices_UAH.pdf" },
  EUR: { file: "retail-prices-eur.pdf", name: "Tactical_HB_Retail_Prices_EUR.pdf" },
} as const;

const notFound = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

export async function GET() {
  const supabase = await createClient();
  if (!supabase) return notFound();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return notFound();
  const partner = await partnerForUser(data.user.id);
  if (!partner || !canAccessPortal(partner.accountStatus)) return notFound();

  const list = FILES[partner.currency];
  try {
    const body = await readFile(path.join(process.cwd(), "private", "wholesale", list.file));
    return new Response(new Uint8Array(body), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${list.name}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("[wholesale] retail price list missing:", list.file, err);
    return notFound();
  }
}
