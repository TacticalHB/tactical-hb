import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordCartSnapshot, type CartSnapshotLine } from "@/lib/email/flows";

/* ---------------------------------------------------------------------------
   The bag, told to the server so it can be recovered later.

   WHY THIS EXISTS AT ALL. The shop's cart lives in localStorage — there is no
   server cart to read three days later when the recovery mail is built. So the
   browser posts a snapshot whenever the bag settles, and that row is what the
   mail describes.

   THE ADDRESS COMES FROM THE SESSION, NEVER FROM THE BODY, and that is the
   important line in this file. A route that accepted `{ email, lines }` from
   anyone would be a way to make this shop send three mails about a bag someone
   else chose to a stranger's inbox — the marketing gate would narrow it to
   people who had opted in, but that only makes the victims customers. There is
   no version of accepting a browser-supplied address that is safe, so the
   snapshot is for signed-in customers only.

   WHAT THAT COSTS: a guest who fills a bag and leaves is not recovered, even
   if they typed an address at checkout. That is the right trade for now — a
   guest has not opted into marketing either, so the consent gate would have
   dropped almost all of them anyway. The way to widen it later is a signed,
   expiring token in the links we already mail people, not a trusted body.

   PRICES ARE NOT ACCEPTED AND WOULD NOT BE BELIEVED. The body carries slugs,
   quantities and options; every amount is recomputed from the catalogue when
   the mail is built.
--------------------------------------------------------------------------- */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A bag larger than this is a mistake or an attack, not a customer. */
const MAX_LINES = 50;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;

  // No session, no snapshot. Answered as success so the client has nothing to
  // retry and no way to tell a signed-out state from a disabled feature.
  if (!user?.email) return NextResponse.json({ ok: true, tracked: false });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const payload = body as { lines?: unknown; locale?: unknown };
  const raw = Array.isArray(payload.lines) ? payload.lines.slice(0, MAX_LINES) : [];
  const locale = payload.locale === "uk" ? "uk" : "en";

  // Shape only — priceCart does the real validation, dropping unknown slugs
  // and clamping quantities before anything is stored.
  const lines: CartSnapshotLine[] = raw
    .filter((l): l is Record<string, unknown> => !!l && typeof l === "object")
    .map((l) => ({
      slug: String(l.slug ?? ""),
      qty: Number(l.qty ?? 0),
      options: (l.options as CartSnapshotLine["options"]) ?? undefined,
    }));

  const result = await recordCartSnapshot({ email: user.email, locale, lines });
  return NextResponse.json({ ok: true, tracked: result.ok ? result.tracked : false });
}
