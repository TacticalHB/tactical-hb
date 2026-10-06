import { NextRequest, NextResponse } from "next/server";
import { ADMIN_EMAIL, SALES_EMAIL } from "@/lib/contact-info";
import { sendMail } from "@/lib/email";
import { buildWholesaleEnquiryStaffMail } from "@/lib/wholesale-staff-email";
import { screen } from "@/lib/anti-spam";
import { allowSubmission } from "@/lib/rate-limit";
import { WHOLESALE_LIMITS as LIMITS, cleanBlock, cleanLine, isEmail, isPhone, isWord } from "@/lib/form-checks";
import { buildWholesaleReply } from "@/lib/wholesale-email";

/* ---------------------------------------------------------------------------
   Wholesale enquiry → SALES_EMAIL (lib/contact-info).

   This endpoint is public and unauthenticated, like any contact form, so
   everything is validated and length-capped server-side. The client's
   `required` attributes are a convenience, not a guarantee.

   Rate-limited per visitor (lib/rate-limit), and every field checked with the
   same rules the form uses (lib/form-checks).
--------------------------------------------------------------------------- */

export const runtime = "nodejs";


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

  if (!allowSubmission(request, "wholesale")) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const f = {
    name: cleanLine(b.name),
    company: cleanLine(b.company),
    email: cleanLine(b.email),
    phone: cleanLine(b.phone),
    country: cleanLine(b.country),
    city: cleanLine(b.city),
    businessType: cleanLine(b.businessType),
    message: cleanBlock(b.message),
  };

  if (
    !isWord(f.name, Infinity) ||
    !isWord(f.company, Infinity) ||
    !isEmail(f.email) ||
    !isPhone(f.phone) ||
    !isWord(f.country, Infinity) ||
    !isWord(f.city, Infinity) ||
    f.message.length < 2
  ) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }
  if ((Object.keys(LIMITS) as (keyof typeof LIMITS)[]).some((k) => f[k].length > LIMITS[k])) {
    return NextResponse.json({ ok: false, error: "too_long" }, { status: 400 });
  }

  const staff = buildWholesaleEnquiryStaffMail(
    { ...f, locale },
    process.env.SITE_URL || "https://tactical-hb.com"
  );

  const result = await sendMail({
    to: SALES_EMAIL,
    replyTo: f.email,
    subject: staff.subject,
    text: staff.text,
    html: staff.html,
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
