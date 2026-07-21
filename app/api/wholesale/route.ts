import { NextRequest, NextResponse } from "next/server";
import { SALES_EMAIL } from "@/lib/contact-info";
import { esc, rowsHtml, sendMail } from "@/lib/email";
import { screen } from "@/lib/anti-spam";

/* ---------------------------------------------------------------------------
   Wholesale enquiry → Sales.tactical-hb@outlook.com.

   This endpoint is public and unauthenticated, like any contact form, so
   everything is validated and length-capped server-side. The client's
   `required` attributes are a convenience, not a guarantee.

   No rate limiting yet — serverless has no shared counter to hang it on. Worth
   adding (Upstash or similar) before this address is published widely.
--------------------------------------------------------------------------- */

export const runtime = "nodejs";

const LIMITS = { name: 100, company: 150, email: 200, phone: 40, country: 80, city: 80, businessType: 60, message: 5000 };

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const b = (body ?? {}) as Record<string, unknown>;

  const verdict = screen(request, b);
  if (verdict === "reject") return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  if (verdict === "drop") return NextResponse.json({ ok: true });

  const f = {
    name: String(b.name ?? "").trim(),
    company: String(b.company ?? "").trim(),
    email: String(b.email ?? "").trim(),
    phone: String(b.phone ?? "").trim(),
    country: String(b.country ?? "").trim(),
    city: String(b.city ?? "").trim(),
    businessType: String(b.businessType ?? "").trim(),
    message: String(b.message ?? "").trim(),
  };

  if (!f.name || !f.company || !f.email || !f.message || !isEmail(f.email)) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }
  if ((Object.keys(LIMITS) as (keyof typeof LIMITS)[]).some((k) => f[k].length > LIMITS[k])) {
    return NextResponse.json({ ok: false, error: "too_long" }, { status: 400 });
  }

  const rows: [string, string][] = [
    ["Name", f.name],
    ["Company", f.company],
    ["Email", f.email],
    ["Telephone", f.phone],
    ["Business type", f.businessType],
    ["Country", f.country],
    ["City", f.city],
  ];

  const text = [
    ...rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`),
    "",
    f.message,
  ].join("\n");

  const result = await sendMail({
    to: SALES_EMAIL,
    replyTo: f.email,
    subject: `Wholesale enquiry — ${f.company}`,
    text,
    html: `
      <div style="font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.6;color:#111">
        <p style="margin:0 0 16px"><strong>New wholesale enquiry from the Tactical HB website</strong></p>
        <table cellpadding="0" cellspacing="0" style="margin:0 0 18px">${rowsHtml(rows)}</table>
        <div style="white-space:pre-wrap;border-top:1px solid #e5e5e5;padding-top:16px">${esc(f.message)}</div>
      </div>
    `,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.error === "not_configured" ? 500 : 502 });
  }
  return NextResponse.json({ ok: true });
}
