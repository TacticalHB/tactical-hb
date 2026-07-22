import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { SALES_EMAIL } from "@/lib/contact-info";
import { esc, rowsHtml, sendMail } from "@/lib/email";

/* ---------------------------------------------------------------------------
   Turning a confirmed payment into an order.

   Called ONLY from the Monobank webhook, after the signature has been verified
   and the status confirmed with Monobank directly.

   IDEMPOTENT. Monobank delivers webhooks at least once, so this can be invoked
   several times for one payment. The claim below is a conditional update: the
   first caller flips pending → paid and gets the row, everyone after gets
   nothing and stops. Without it, a retry would create a second order and award
   loyalty twice.
--------------------------------------------------------------------------- */

export type PaymentRow = {
  id: string;
  reference: string;
  invoice_id: string | null;
  user_id: string | null;
  email: string;
  locale: string;
  amount_eur: number;
  amount_uah: number;
  discount_eur: number;
  voucher_code: string | null;
  delivery: Record<string, unknown>;
  lines: {
    slug: string; name: string; qty: number;
    unit_eur: number; unit_uah: number;
    colour?: string | null; material?: string | null; addons?: string | null;
  }[];
};

export type FulfilResult =
  | { ok: true; orderId: string }
  | { ok: false; reason: "already_fulfilled" | "error" };

/**
 * Claim a pending payment. Returns the row only to the caller that won the
 * race; everyone else gets null and must do nothing.
 */
async function claim(reference: string): Promise<PaymentRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("payments")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("reference", reference)
    .eq("status", "pending") // ← the guard. Only one caller can match.
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[fulfil] claim failed:", error.code, error.message);
    return null;
  }
  return (data as PaymentRow | null) ?? null;
}

export async function fulfilPayment(reference: string): Promise<FulfilResult> {
  const payment = await claim(reference);
  if (!payment) {
    console.log("[fulfil] already fulfilled or not pending:", reference);
    return { ok: false, reason: "already_fulfilled" };
  }

  const admin = createAdminClient();

  try {
    // 1. The order. Inserting fires on_order_created, which awards XP and
    //    issues milestone vouchers — correct now, because money has moved.
    //    Guests have user_id null and earn nothing (see migration 0008).
    const { data: order, error: orderErr } = await admin
      .from("orders")
      .insert({
        user_id: payment.user_id,
        amount_eur: payment.amount_eur,
        amount_uah: payment.amount_uah,
        currency: "UAH",
        discount_eur: payment.discount_eur,
        voucher_code: payment.voucher_code,
        email: payment.email,
        delivery: payment.delivery,
        source: "monobank",
        external_ref: payment.reference,
      })
      .select("id")
      .single();

    if (orderErr || !order) {
      throw new Error(`order insert failed: ${orderErr?.code} ${orderErr?.message}`);
    }

    // 2. Line items.
    if (payment.lines.length) {
      const { error: itemsErr } = await admin.from("order_items").insert(
        payment.lines.map((l) => ({
          order_id: order.id,
          product_id: l.slug,
          product_name: l.name,
          quantity: l.qty,
          price_eur: l.unit_eur,
          price_uah: l.unit_uah,
        }))
      );
      // Non-fatal: the order and the money are the important part, and the
      // items are recoverable from the payment row.
      if (itemsErr) console.error("[fulfil] order_items insert failed:", itemsErr.message);
    }

    // 3. Burn the voucher. Non-fatal for the same reason — refusing to record
    //    a paid order because a voucher update failed would be far worse.
    if (payment.voucher_code) {
      const { error: vErr } = await admin.rpc("mark_voucher_used", {
        p_code: payment.voucher_code,
        p_order_id: order.id,
      });
      if (vErr) console.error("[fulfil] voucher mark failed:", vErr.message);
    }

    // 4. Link the order back to the payment for reconciliation.
    await admin.from("payments").update({ order_id: order.id }).eq("id", payment.id);

    // 5. Tell the shop. Never let a mail failure undo a paid order.
    await notifySales(payment, order.id).catch((e) =>
      console.error("[fulfil] sales notification failed:", e)
    );

    console.log("[fulfil] order created:", order.id, "ref", payment.reference);
    return { ok: true, orderId: order.id };
  } catch (e) {
    // The payment is already marked paid — correct, the customer HAS paid.
    // Loud log: this needs a human, and the payment row holds everything
    // required to complete the order by hand.
    console.error("[fulfil] FAILED AFTER PAYMENT — needs manual completion.",
      "reference:", payment.reference, "error:", e);
    return { ok: false, reason: "error" };
  }
}

async function notifySales(p: PaymentRow, orderId: string): Promise<void> {
  const d = p.delivery as Record<string, string>;
  const name = [d.firstName, d.surname].filter(Boolean).join(" ");
  const address = [
    name, d.address, d.apartment,
    [d.city, d.postcode].filter(Boolean).join(", "),
    d.country,
  ].filter(Boolean).join("\n");

  const rows: [string, string][] = [
    ["Order", p.reference],
    ["Paid", `₴${Math.round(p.amount_uah).toLocaleString("uk-UA")}  (€${p.amount_eur.toFixed(2)})`],
    ["Customer", name],
    ["Email", p.email],
    ["Telephone", d.phone ?? ""],
    ["Voucher", p.voucher_code ?? ""],
    ["Account", p.user_id ? "registered" : "guest"],
    ["Monobank invoice", p.invoice_id ?? ""],
  ];

  const items = p.lines
    .map((l) => `
      <tr>
        <td style="padding:8px 12px 8px 0;vertical-align:top"><strong>${esc(l.name)}</strong>${
          [l.colour, l.material, l.addons].filter(Boolean).length
            ? `<br><span style="color:#707072;font-size:13px">${esc([l.colour, l.material, l.addons].filter(Boolean).join(" · "))}</span>`
            : ""
        }</td>
        <td style="padding:8px 12px;vertical-align:top;white-space:nowrap">× ${l.qty}</td>
        <td style="padding:8px 0;vertical-align:top;text-align:right;white-space:nowrap">₴${Math.round(l.unit_uah * l.qty)}</td>
      </tr>`)
    .join("");

  await sendMail({
    to: SALES_EMAIL,
    replyTo: p.email,
    subject: `PAID — order ${p.reference} — Tactical HB`,
    text: [
      `Payment received for order ${p.reference}`,
      "",
      ...rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`),
      "",
      "Items:",
      ...p.lines.map((l) => `  ${l.qty} × ${l.name} — ₴${Math.round(l.unit_uah * l.qty)}`),
      "",
      "Ship to:",
      address,
      "",
      `Internal order id: ${orderId}`,
    ].join("\n"),
    html: `
      <div style="font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.6;color:#111">
        <p style="margin:0 0 16px"><strong>Payment received — order ${esc(p.reference)}</strong></p>
        <table cellpadding="0" cellspacing="0" style="margin:0 0 20px">${rowsHtml(rows)}</table>
        <p style="margin:0 0 8px;font-weight:600">Items</p>
        <table cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #e5e5e5;border-bottom:1px solid #e5e5e5;margin:0 0 20px">${items}</table>
        <p style="margin:0 0 8px;font-weight:600">Ship to</p>
        <div style="white-space:pre-wrap;color:#333">${esc(address)}</div>
        <p style="margin:22px 0 0;color:#707072;font-size:13px">Internal order id: ${esc(orderId)}</p>
      </div>
    `,
  });
}
