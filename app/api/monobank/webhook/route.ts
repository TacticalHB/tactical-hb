import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getInvoiceStatus, isDead, isPaid, verifyWebhookSignature } from "@/lib/monobank";
import { fulfilPayment } from "@/lib/fulfilment";

/* ---------------------------------------------------------------------------
   Monobank payment webhook.

   This endpoint creates orders and awards loyalty, so it is the most
   security-sensitive route on the site. Anyone can POST to it. Three gates,
   in order, and all three must pass:

     1. SIGNATURE. The raw body must verify against Monobank's public key.
     2. CONFIRMATION. We then ask Monobank ourselves what the invoice's status
        is. We act on their answer to our question, not on what arrived here.
     3. AMOUNT. The confirmed amount must equal what we recorded when the
        invoice was created. A payment for less than the basket is refused.

   Only then does fulfilment run — and that is idempotent, because Monobank
   delivers webhooks at least once.

   ALWAYS RETURNS 200 once the signature is valid. A non-2xx makes Monobank
   retry, and retrying will not fix a bad amount or a missing payment row; it
   would just hammer the endpoint. Failures are logged loudly instead.
--------------------------------------------------------------------------- */

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  // The signature covers the EXACT bytes sent. Parsing first and re-serialising
  // would reorder keys and change whitespace, and nothing would ever verify.
  const rawBody = await request.text();
  const signature = request.headers.get("x-sign");

  let verified = false;
  try {
    verified = await verifyWebhookSignature(rawBody, signature);
  } catch (e) {
    // Could not reach Monobank for the public key. Refuse and let them retry —
    // this is the one case where a retry genuinely helps.
    console.error("[webhook] could not verify signature:", e);
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  if (!verified) {
    console.warn("[webhook] REJECTED: bad or missing signature");
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let payload: { invoiceId?: string; status?: string; reference?: string; amount?: number };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    console.warn("[webhook] signed but unparseable body");
    return NextResponse.json({ ok: true });
  }

  const invoiceId = String(payload.invoiceId ?? "");
  if (!invoiceId) {
    console.warn("[webhook] no invoiceId in payload");
    return NextResponse.json({ ok: true });
  }

  // ---- Gate 2: ask Monobank directly --------------------------------------
  let confirmed;
  try {
    confirmed = await getInvoiceStatus(invoiceId);
  } catch (e) {
    console.error("[webhook] could not confirm invoice status:", e);
    return NextResponse.json({ ok: false }, { status: 503 }); // retry is useful here
  }

  const admin = createAdminClient();
  const { data: payment, error } = await admin
    .from("payments")
    .select("reference, amount_kop, status")
    .eq("invoice_id", invoiceId)
    .maybeSingle();

  if (error) {
    console.error("[webhook] payment lookup failed:", error.code, error.message);
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  if (!payment) {
    // Signed by Monobank but unknown to us. Nothing safe to do.
    console.error("[webhook] no payment row for invoice", invoiceId);
    return NextResponse.json({ ok: true });
  }

  const status = String(confirmed.status ?? "");

  if (isDead(status)) {
    if (payment.status === "pending") {
      await admin
        .from("payments")
        .update({ status: status === "expired" ? "expired" : "failed" })
        .eq("invoice_id", invoiceId)
        .eq("status", "pending");
    }
    console.log("[webhook] invoice", invoiceId, "closed as", status);
    return NextResponse.json({ ok: true });
  }

  if (!isPaid(status)) {
    // created / processing / hold — nothing to do yet; a later webhook follows.
    console.log("[webhook] invoice", invoiceId, "status", status, "— no action");
    return NextResponse.json({ ok: true });
  }

  // ---- Gate 3: the amount must match what we asked for --------------------
  const paidKop = Number(confirmed.amount);
  if (!Number.isFinite(paidKop) || paidKop !== payment.amount_kop) {
    console.error(
      "[webhook] AMOUNT MISMATCH — refusing to fulfil.",
      "invoice:", invoiceId,
      "expected:", payment.amount_kop,
      "confirmed:", confirmed.amount
    );
    return NextResponse.json({ ok: true });
  }

  const result = await fulfilPayment(payment.reference);
  if (!result.ok && result.reason === "error") {
    console.error("[webhook] fulfilment failed for", payment.reference, "— needs manual completion");
  }

  return NextResponse.json({ ok: true });
}
