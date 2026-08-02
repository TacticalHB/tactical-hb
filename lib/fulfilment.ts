import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_EMAIL, SALES_EMAIL } from "@/lib/contact-info";
import { esc, rowsHtml, sendMail } from "@/lib/email";
import { buildOrderEmail } from "@/lib/order-email";
import { createTtnForOrder } from "@/lib/order-ttn";
import { fiscaliseOrder, type FiscalLine } from "@/lib/checkbox";
import { checkboxCode, unmappedSlugs } from "@/lib/checkbox-catalogue";

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
  shipping_method: string | null;
  shipping_uah: number;
  np_delivery_type: string | null;
  np_city_ref: string | null;
  np_city_name: string | null;
  np_warehouse_ref: string | null;
  np_warehouse_name: string | null;
  np_address: string | null;
  np_notes: string | null;
  /** Courier address in parts — np_address is the readable line, these are
      what Nova Poshta's API can actually resolve. Null for branch delivery
      and for orders placed before migration 0013. */
  np_street: string | null;
  np_building: string | null;
  np_flat: string | null;
  delivery: Record<string, unknown>;
  lines: {
    slug: string; name: string; qty: number;
    unit_eur: number; unit_uah: number;
    colour?: string | null; material?: string | null; addons?: string | null;
    /** What was chosen, in catalogue terms rather than the customer's language.
        colour/addons above are translated for display and cannot be matched
        back to a product; these can, which is what stock is decremented from.
        Absent on orders placed before migration 0015 — those resolve to the
        bare slug, which is all that can honestly be said about them. */
    variant?: string | null; lid?: boolean; rubber?: boolean;
    /** Per-unit packed weight in grams, add-ons included. Absent on orders
        placed before weights existed — the waybill falls back to catalogue
        weights, then the default. */
    weight_g?: number | null;
    /** Captured at checkout so the confirmation shows the chosen variant.
        Absent on orders placed before it was recorded — the email falls back
        to the product's default image. */
    image?: string | null;
  }[];
};

export type FulfilResult =
  | { ok: true; orderId: string }
  | { ok: false; reason: "already_fulfilled" | "error" };

/* ---------------------------------------------------------------------------
   Fiscalisation — the PRRO receipt for an order that has already been paid.

   IDEMPOTENT TWICE OVER. The order row is checked first, so a webhook retry
   normally never reaches Checkbox at all; and the receipt UUID is derived from
   the order reference, so if it does reach them, Checkbox refuses the duplicate
   and we treat that refusal as success. Neither path can produce a second
   fiscal document, which would be false turnover.

   THE RECEIPT MUST EQUAL THE CARD. amountKop is read back from the payment row
   — the exact figure Monobank was asked for — never recomputed from the lines,
   because the lines are the thing being adjusted to absorb shipping.
--------------------------------------------------------------------------- */
export async function fiscaliseOrderRow(orderId: string, payment: PaymentRow): Promise<void> {
  const admin = createAdminClient();

  try {
    const { data: existing } = await admin
      .from("orders")
      .select("checkbox_receipt_id")
      .eq("id", orderId)
      .maybeSingle();
    if (existing?.checkbox_receipt_id) {
      console.log("[fiscal] already fiscalised, skipping:", payment.reference);
      return;
    }

    // A product with no Checkbox code cannot be put on a receipt honestly, and
    // inventing one is worse than leaving the order for a human.
    const missing = unmappedSlugs(payment.lines.map((l) => ({ slug: l.slug, variant: l.variant })));
    if (missing.length > 0) {
      const err = `no Checkbox product for: ${missing.join(", ")} — fiscalise by hand`;
      console.error("[fiscal]", payment.reference, err);
      await admin.from("orders").update({ checkbox_error: err }).eq("id", orderId);
      await alertFiscalFailure(payment.reference, err);
      return;
    }

    const lines: FiscalLine[] = payment.lines.map((l) => ({
      code: checkboxCode(l.slug, l.variant)!,
      name: l.name,
      qty: l.qty,
      unitKop: Math.round(l.unit_uah * 100),
    }));

    const result = await fiscaliseOrder({
      reference: payment.reference,
      // What the card was actually charged: goods after discount, plus shipping.
      amountKop: Math.round((payment.amount_uah + payment.shipping_uah) * 100),
      lines,
      email: payment.email || null,
    });

    if (result.ok) {
      await admin
        .from("orders")
        .update({
          checkbox_receipt_id: result.receiptId,
          checkbox_fiscalised_at: new Date().toISOString(),
          checkbox_error: null,
        })
        .eq("id", orderId);
      console.log(
        "[fiscal] receipt", result.receiptId, "for", payment.reference,
        result.alreadyExisted ? "(already existed — retry)" : ""
      );
      return;
    }

    console.error("[fiscal] FAILED for", payment.reference, ":", result.error);
    await admin.from("orders").update({ checkbox_error: result.error }).eq("id", orderId);
    await alertFiscalFailure(payment.reference, result.error);
  } catch (e) {
    // Fiscalisation must never be able to break fulfilment. The payment is real
    // and the order exists; this only means the receipt needs issuing by hand.
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[fiscal] unexpected failure for", payment.reference, msg);
    await admin.from("orders").update({ checkbox_error: msg.slice(0, 500) }).eq("id", orderId).then(
      () => {},
      () => {}
    );
    await alertFiscalFailure(payment.reference, msg).catch(() => {});
  }
}

/** Tell a human. A missing fiscal receipt is a tax problem, not a log line. */
async function alertFiscalFailure(reference: string, error: string): Promise<void> {
  await sendMail({
    to: ADMIN_EMAIL,
    subject: `PRRO: fiscal receipt NOT issued — ${reference}`,
    text:
      `Order ${reference} was paid but NO fiscal receipt was created.\n\n${error}\n\n` +
      `The payment is valid and the order stands — only the PRRO step failed. ` +
      `Issue the receipt from the Checkbox app for the full amount charged, as a ` +
      `sale of goods, with no separate delivery line.`,
    html: `<p style="font-family:sans-serif;font-size:15px">
        Order <b>${esc(reference)}</b> was paid but <b>no fiscal receipt was created</b>.
      </p>
      <p style="font-family:sans-serif;font-size:14px;color:#96322c">${esc(error)}</p>
      <p style="font-family:sans-serif;font-size:14px;max-width:560px">
        The payment is valid and the order stands — only the PRRO step failed.
        Issue the receipt from the Checkbox app for the full amount charged, as a
        sale of goods, with no separate delivery line.
      </p>`,
  }).catch((e) => console.error("[fiscal] alert email failed:", e));
}

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
        // Reached only after the webhook confirmed the invoice with Monobank,
        // so the order is paid the moment it exists.
        status: "paid",
        // Carried onto the order because the shipping email is sent later by a
        // cron job that has no payment row to read the language from.
        locale: payment.locale,
        amount_eur: payment.amount_eur,
        amount_uah: payment.amount_uah,
        currency: "UAH",
        discount_eur: payment.discount_eur,
        voucher_code: payment.voucher_code,
        email: payment.email,
        delivery: payment.delivery,
        shipping_method: payment.shipping_method,
        shipping_uah: payment.shipping_uah,
        np_delivery_type: payment.np_delivery_type,
        np_city_ref: payment.np_city_ref,
        np_city_name: payment.np_city_name,
        np_warehouse_ref: payment.np_warehouse_ref,
        np_warehouse_name: payment.np_warehouse_name,
        np_address: payment.np_address,
        np_notes: payment.np_notes,
        np_street: payment.np_street,
        np_building: payment.np_building,
        np_flat: payment.np_flat,
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
          variant: l.variant ?? null,
          addon_lid: !!l.lid,
          addon_rubber: !!l.rubber,
        }))
      );
      // Non-fatal: the order and the money are the important part, and the
      // items are recoverable from the payment row.
      if (itemsErr) console.error("[fulfil] order_items insert failed:", itemsErr.message);
    }

    // 2b. Take the goods off the shelf.
    //
    //     Reads the order_items just written, so it must follow them. Idempotent
    //     in the database (one movement per order+sku), which is what makes a
    //     replayed Monobank webhook safe.
    //
    //     Non-fatal, for the same reason as the line items: refusing to record a
    //     paid order because a stock table disagreed would be far worse than a
    //     count that needs correcting by hand. An unmatched sku is logged loudly
    //     — it means something was sold that nobody has stocked yet, and only a
    //     human can decide what that thing is.
    {
      const { data: stock, error: stockErr } = await admin.rpc("apply_order_stock", {
        p_order_id: order.id,
      });
      if (stockErr) {
        console.error("[fulfil] stock apply failed:", stockErr.code, stockErr.message);
      } else {
        const unmatched = (stock as { unmatched?: string[] } | null)?.unmatched ?? [];
        if (unmatched.length) {
          console.error("[fulfil] STOCK NOT DECREMENTED for unknown sku(s):",
            unmatched.join(", "), "order:", order.id);
        }
      }
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

    // 5. Tell the shop, then the customer. Both are best-effort: a mail
    //    failure must never undo a paid order, and each is awaited separately
    //    so one failing still lets the other through.
    await notifySales(payment, order.id).catch((e) =>
      console.error("[fulfil] sales notification failed:", e)
    );
    await sendOrderConfirmation(payment).catch((e) =>
      console.error("[fulfil] customer confirmation failed:", e)
    );

    // 6. Book the parcel with Nova Poshta. Last on purpose: it is the only
    //    step that can be redone by hand from /admin/orders, so nothing more
    //    important should wait behind a courier API. Never throws — a failure
    //    leaves the order 'paid', which is the manual-waybill queue.
    await createTtnForOrder(order.id, payment);

    // 7. Fiscalise with Checkbox. After the waybill because a fiscal receipt is
    //    a legal record of a sale that HAS happened — it must never gate the
    //    money, the confirmation, or the parcel. Never throws; a failure is
    //    written to the order for the admin queue and alerted, and the payment
    //    stands regardless (brief rule 10).
    await fiscaliseOrderRow(order.id, payment);

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
  const np = p.shipping_method === "nova_poshta";
  const courier = np && p.np_delivery_type === "courier";

  // Branch delivery has no street address (the fields were never collected) —
  // the branch IS the address. Courier has a street address but no branch.
  const address = np
    ? courier
      ? [name, p.np_city_name ?? "", p.np_address ?? "", p.np_notes ? `Notes: ${p.np_notes}` : ""].filter(Boolean).join("\n")
      : [name, p.np_city_name ?? "", p.np_warehouse_name ?? ""].filter(Boolean).join("\n")
    : [name, d.address, d.apartment, [d.city, d.postcode].filter(Boolean).join(", "), d.country]
        .filter(Boolean).join("\n");

  const totalUah = Math.round(p.amount_uah + p.shipping_uah);

  const rows: [string, string][] = [
    ["Order", p.reference],
    ["Paid", `₴${totalUah.toLocaleString("uk-UA")}  (goods ₴${Math.round(p.amount_uah).toLocaleString("uk-UA")} / €${p.amount_eur.toFixed(2)})`],
    // Internal breakdown only — the customer-facing documents state one order
    // total. An international row reaching this point was paid via a manual
    // one-total request, so its delivery is already inside the amount.
    ["Shipping", np
      ? `Nova Poshta ${courier ? "courier" : "branch"} — ₴${Math.round(p.shipping_uah).toLocaleString("uk-UA")}`
      : "International — included in the paid total"],
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

/**
 * The customer's own confirmation.
 *
 * Sent from admin@tactical-hb.com with the same address as reply-to, so a
 * customer with a question simply replies and it lands in the right inbox.
 * Language follows the locale captured at checkout, never the email address.
 */
async function sendOrderConfirmation(p: PaymentRow): Promise<void> {
  const siteUrl = (process.env.SITE_URL || "https://tactical-hb.com").replace(/\/$/, "");
  const { subject, html, text } = buildOrderEmail(p, siteUrl);

  const result = await sendMail({
    to: p.email,
    from: `Tactical HB <${ADMIN_EMAIL}>`,
    replyTo: ADMIN_EMAIL,
    subject,
    html,
    text,
  });

  if (!result.ok) {
    console.error("[fulfil] confirmation email not sent:", result.error, "ref", p.reference);
  }
}
