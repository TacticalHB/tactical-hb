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

   TWO LANGUAGES ONLY (Mario, 4 Oct 2026): Ukrainian for /uk, English for
   every other storefront. The files are traced into the function by
   outputFileTracingIncludes in next.config.ts.
--------------------------------------------------------------------------- */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FILES = {
  uk: { file: "project-ki-06-uk.pdf", name: "Tactical_HB_Project_KI_06_UK.pdf" },
  en: { file: "project-ki-06-en.pdf", name: "Tactical_HB_Project_KI_06_EN.pdf" },
} as const;

const notFound = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

export async function GET(_req: Request, { params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const sheet = lang === "uk" ? FILES.uk : FILES.en;

  const supabase = await createClient();
  if (!supabase) return notFound();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return notFound();
  const partner = await partnerForUser(data.user.id);
  if (!partner || !canAccessPortal(partner.accountStatus)) return notFound();

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
