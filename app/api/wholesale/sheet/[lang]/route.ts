import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@/lib/supabase/server";
import { partnerForUser } from "@/lib/wholesale-portal";
import { canAccessPortal } from "@/lib/wholesale-display";

/* ---------------------------------------------------------------------------
   The Project KI 06 wholesale product sheet — approved partners only.

   NOT IN public/. The sheet prints trade prices and says "Confidential — for
   approved partners", so it is read from private/wholesale and handed only to
   a signed-in partner whose account is approved — the same gate the portal
   page applies. Anyone else gets a 404, which does not confirm the file exists.

   TWO LANGUAGES ONLY (Mario, 4 Oct 2026), each in both currencies — see
   FILES below. The files are traced into the function by
   outputFileTracingIncludes in next.config.ts.
--------------------------------------------------------------------------- */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* LANGUAGE FROM THE PAGE, PRICES FROM THE PARTNER (Mario, 15 Oct 2026). The
   sheet is read in the language of the storefront the partner is browsing —
   Ukrainian partners on /uk asked for Ukrainian — while its two price rows
   follow the currency on their partner card, so nobody is ever shown the
   other currency. Four files, one per pair. */
const FILES = {
  uk: {
    UAH: { file: "project-ki-06-uk.pdf", name: "Tactical_HB_Project_KI_06_UK.pdf" },
    EUR: { file: "project-ki-06-uk-eur.pdf", name: "Tactical_HB_Project_KI_06_UK_EUR.pdf" },
  },
  en: {
    EUR: { file: "project-ki-06-en.pdf", name: "Tactical_HB_Project_KI_06_EN.pdf" },
    UAH: { file: "project-ki-06-en-uah.pdf", name: "Tactical_HB_Project_KI_06_EN_UAH.pdf" },
  },
} as const;

const notFound = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

export async function GET(_req: Request, { params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;

  const supabase = await createClient();
  if (!supabase) return notFound();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return notFound();
  const partner = await partnerForUser(data.user.id);
  if (!partner || !canAccessPortal(partner.accountStatus)) return notFound();

  /* The URL names the language (Ukrainian or English — the two the sheet is
     written in); the partner's currency picks the prices. Editing the URL can
     change the language, never the currency. */
  const sheet = FILES[lang === "uk" ? "uk" : "en"][partner.currency];

  try {
    const body = await readFile(path.join(process.cwd(), "private", "wholesale", sheet.file));
    return new Response(new Uint8Array(body), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${sheet.name}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("[wholesale] product sheet missing:", sheet.file, err);
    return notFound();
  }
}
