import { NextRequest, NextResponse } from "next/server";
import { SALES_EMAIL } from "@/lib/contact-info";
import { esc, rowsHtml, sendMail } from "@/lib/email";
import { screen } from "@/lib/anti-spam";

/* ---------------------------------------------------------------------------
   Placed order → Sales.tactical-hb@outlook.com.

   Until orders are written to Supabase, this email IS the record of the order.
   Everything the shop needs to fulfil it therefore has to be in the message:
   who ordered, what, in which configuration, and where it goes.

   Prices arrive from the client and are echoed back for reference only. Never
   treat them as authoritative — a caller can send anything. Once the Monobank
   integration lands, the amount charged must come from the server-side cart,
   not from this payload.

   Public and unauthenticated, so it is validated and capped. No rate limiting
   yet (see the wholesale route) — a determined caller could spam the inbox.
--------------------------------------------------------------------------- */

export const runtime = "nodejs";

const MAX_LINES = 50;
const LIMITS = { orderNo: 40, name: 100, email: 200, phone: 40, text: 200 };

type InLine = {
  name?: unknown; qty?: unknown; colour?: unknown; material?: unknown;
  addons?: unknown; unitPriceLabel?: unknown;
};

const cap = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const b = (body ?? {}) as Record<string, unknown>;

  // A "drop" here answers 200, which is also what the checkout expects — the
  // customer is never blocked by our own screening.
  const verdict = screen(request, b);
  if (verdict === "reject") return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  if (verdict === "drop") return NextResponse.json({ ok: true });

  const d = (b.delivery ?? {}) as Record<string, unknown>;

  const orderNo = cap(b.orderNo, LIMITS.orderNo);
  const email = cap(d.email, LIMITS.email);
  const first = cap(d.firstName, LIMITS.name);
  const last = cap(d.surname, LIMITS.name);
  const rawLines = Array.isArray(b.lines) ? (b.lines as InLine[]).slice(0, MAX_LINES) : [];

  if (!orderNo || !email || rawLines.length === 0) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const lines = rawLines.map((l) => ({
    name: cap(l.name, LIMITS.text),
    qty: Math.max(1, Math.min(999, Number(l.qty) || 1)),
    spec: [cap(l.colour, LIMITS.text), cap(l.material, LIMITS.text), cap(l.addons, LIMITS.text)]
      .filter(Boolean)
      .join(" · "),
    price: cap(l.unitPriceLabel, 40),
  }));

  const address = [
    [first, last].filter(Boolean).join(" "),
    cap(d.address, LIMITS.text),
    cap(d.apartment, LIMITS.text),
    [cap(d.city, LIMITS.text), cap(d.postcode, 30)].filter(Boolean).join(", "),
    cap(d.country, LIMITS.text),
  ].filter(Boolean).join("\n");

  const rows: [string, string][] = [
    ["Order", orderNo],
    ["Customer", [first, last].filter(Boolean).join(" ")],
    ["Email", email],
    ["Telephone", cap(d.phone, LIMITS.phone)],
    ["Payment", cap(b.paymentMethod, LIMITS.text)],
    ["Voucher", cap(b.voucherCode, LIMITS.text)],
    ["Discount", cap(b.discountLabel, 40)],
    ["Total", cap(b.totalLabel, 40)],
    ["Language", cap(b.locale, 8)],
  ];

  const text = [
    `New order ${orderNo}`,
    "",
    ...rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`),
    "",
    "Items:",
    ...lines.map((l) => `  ${l.qty} × ${l.name}${l.spec ? ` (${l.spec})` : ""}${l.price ? ` — ${l.price}` : ""}`),
    "",
    "Ship to:",
    address,
  ].join("\n");

  const itemsHtml = lines
    .map(
      (l) => `
      <tr>
        <td style="padding:8px 12px 8px 0;vertical-align:top">
          <strong>${esc(l.name)}</strong>${l.spec ? `<br><span style="color:#707072;font-size:13px">${esc(l.spec)}</span>` : ""}
        </td>
        <td style="padding:8px 12px;vertical-align:top;white-space:nowrap">× ${l.qty}</td>
        <td style="padding:8px 0;vertical-align:top;text-align:right;white-space:nowrap">${esc(l.price)}</td>
      </tr>`
    )
    .join("");

  const result = await sendMail({
    to: SALES_EMAIL,
    replyTo: email,
    subject: `New order ${orderNo} — Tactical HB`,
    text,
    html: `
      <div style="font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.6;color:#111">
        <p style="margin:0 0 16px"><strong>New order placed on tactical-hb.com</strong></p>
        <table cellpadding="0" cellspacing="0" style="margin:0 0 20px">${rowsHtml(rows)}</table>

        <p style="margin:0 0 8px;font-weight:600">Items</p>
        <table cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #e5e5e5;border-bottom:1px solid #e5e5e5;margin:0 0 20px">
          ${itemsHtml}
        </table>

        <p style="margin:0 0 8px;font-weight:600">Ship to</p>
        <div style="white-space:pre-wrap;color:#333">${esc(address)}</div>

        <p style="margin:22px 0 0;color:#707072;font-size:13px">
          Payment is not yet collected online — contact the customer to arrange payment and delivery.
        </p>
      </div>
    `,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.error === "not_configured" ? 500 : 502 });
  }
  return NextResponse.json({ ok: true });
}
