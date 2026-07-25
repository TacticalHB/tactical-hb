import { NextRequest, NextResponse } from "next/server";
import { ADMIN_EMAIL, SALES_EMAIL } from "@/lib/contact-info";
import { esc, rowsHtml, sendMail } from "@/lib/email";
import { screen } from "@/lib/anti-spam";
import { buildWholesaleReply } from "@/lib/wholesale-email";

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

/** Absolute origin, so Resend can fetch the attached form. */
function siteUrl(): string {
  return (process.env.SITE_URL || "https://tactical-hb.com").replace(/\/$/, "");
}

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

  // Same locale handling as the checkout: whatever next-intl reported on the
  // page, narrowed to the two languages the site actually has.
  const locale = String(b.locale ?? "uk") === "uk" ? "uk" : "en";

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
    // Tells sales which language to answer in, and which form the customer got.
    ["Language", locale === "uk" ? "Ukrainian" : "English"],
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

  // The enquiry is safely with sales, so the customer's auto-reply is
  // best-effort from here: a missing acknowledgement is a follow-up email, a
  // rejected submission would be a lost lead. Reply-To is the sales inbox so
  // the returned form and any questions land where they are handled.
  const reply = buildWholesaleReply(locale, siteUrl());
  const ack = await sendMail({
    to: f.email,
    from: `Tactical HB <${ADMIN_EMAIL}>`,
    replyTo: SALES_EMAIL,
    subject: reply.subject,
    html: reply.html,
    text: reply.text,
    attachments: reply.attachments,
  });
  if (!ack.ok) {
    // Loud: sales has the enquiry but the applicant is holding no form, so
    // someone should send it by hand.
    console.error("[wholesale] auto-reply not sent to", f.email, "-", ack.error);
  }

  return NextResponse.json({ ok: true });
}
