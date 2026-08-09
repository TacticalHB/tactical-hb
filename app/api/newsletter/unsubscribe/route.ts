import { NextRequest, NextResponse } from "next/server";
import { unsubscribeByToken } from "@/lib/email/flows";

/* ---------------------------------------------------------------------------
   One-click unsubscribe — the mailbox provider's button, not ours.

   This is the target of the List-Unsubscribe header. Gmail and Yahoo have
   required it of bulk senders since February 2024: the provider shows its own
   "unsubscribe" control next to the sender name and POSTs here when it is
   pressed, expecting the list removal to happen with no further interaction.

   POST ONLY, AND THAT IS THE WHOLE SECURITY MODEL OF THE THING. Corporate link
   scanners and Outlook Safe Links fetch every URL in a message with a GET
   before the recipient sees it; a GET that unsubscribed would quietly remove
   people who never touched anything. A GET here returns 405 and the human-
   facing path lives on the preferences page, behind a button.

   THE TOKEN IS THE AUTHORISATION. It is unguessable, per subscriber, and only
   ever appears in mail we sent to that address, so holding one is proof enough
   to act on. There is no session here and there cannot be — the provider makes
   this request, not the browser.

   ALWAYS 200. RFC 8058 says a failure should not be reported back to the
   provider in a way that makes it retry, and a distinguishable error would
   also let someone probe which tokens are live.
--------------------------------------------------------------------------- */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const ok = await unsubscribeByToken(token);
  if (!ok) console.warn("[newsletter] one-click unsubscribe: token not matched");
  return new NextResponse(null, { status: 200 });
}

export async function GET() {
  // Deliberate: see above. A scanner following the link must change nothing.
  return new NextResponse("Method not allowed", { status: 405 });
}
