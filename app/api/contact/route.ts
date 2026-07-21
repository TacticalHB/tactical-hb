import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { screen } from "@/lib/anti-spam";

/* ---------------------------------------------------------------------------
   Contact form → admin@tactical-hb.com, via Resend.

   Server-only on purpose: RESEND_API_KEY never reaches the browser (no
   NEXT_PUBLIC_ prefix, and this file only ever runs on the server).

   The Resend client is built INSIDE the handler, not at module scope. A
   missing or malformed key must fail this one request, never throw while the
   module is imported — that's how a bad env var takes a whole site down.

   Prerequisites (both in Vercel → Settings → Environment Variables):
     RESEND_API_KEY       — from resend.com/api-keys. Add it as a NORMAL
                            variable, not "Sensitive".
     CONTACT_FROM_EMAIL   — optional. Must be on a domain verified in Resend;
                            unverified senders are rejected by the API.
--------------------------------------------------------------------------- */

export const runtime = "nodejs";

const TO = "admin@tactical-hb.com";
const FROM = process.env.CONTACT_FROM_EMAIL || "Tactical HB <contact@tactical-hb.com>";

/** Caps so a bot can't post a novel; generous for a real enquiry. */
const LIMITS = { name: 100, email: 200, subject: 200, message: 5000 };

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const b = (body ?? {}) as Record<string, unknown>;

  // Spam screening before any work. "drop" answers 200 so a bot never learns
  // to retry; the message simply goes nowhere.
  const verdict = screen(request, b);
  if (verdict === "reject") return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  if (verdict === "drop") return NextResponse.json({ ok: true });

  const name = String(b.name ?? "").trim();
  const email = String(b.email ?? "").trim();
  const message = String(b.message ?? "").trim();
  // The form has no subject field today; accept one if it ever gains it.
  const subject = String(b.subject ?? "").trim();

  // Validate server-side — the client's `required` attributes are a convenience,
  // not a guarantee; this endpoint is public.
  if (!name || !email || !message || !isEmail(email)) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }
  if (
    name.length > LIMITS.name ||
    email.length > LIMITS.email ||
    subject.length > LIMITS.subject ||
    message.length > LIMITS.message
  ) {
    return NextResponse.json({ ok: false, error: "too_long" }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[contact] RESEND_API_KEY is not set — cannot send mail.");
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 500 });
  }

  const lines = [
    `Name:    ${name}`,
    `Email:   ${email}`,
    ...(subject ? [`Subject: ${subject}`] : []),
    "",
    message,
  ];

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: FROM,
      to: TO,
      // Hitting reply in the inbox answers the customer directly.
      replyTo: email,
      subject: subject || `New contact message from ${name}`,
      text: lines.join("\n"),
      html: `
        <div style="font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.6;color:#111">
          <p style="margin:0 0 16px"><strong>New message from the Tactical HB contact form</strong></p>
          <table cellpadding="0" cellspacing="0" style="margin:0 0 16px">
            <tr><td style="padding:2px 16px 2px 0;color:#707072">Name</td><td>${esc(name)}</td></tr>
            <tr><td style="padding:2px 16px 2px 0;color:#707072">Email</td><td><a href="mailto:${esc(email)}">${esc(email)}</a></td></tr>
            ${subject ? `<tr><td style="padding:2px 16px 2px 0;color:#707072">Subject</td><td>${esc(subject)}</td></tr>` : ""}
          </table>
          <div style="white-space:pre-wrap;border-top:1px solid #e5e5e5;padding-top:16px">${esc(message)}</div>
        </div>
      `,
    });

    if (error) {
      // Most common cause: FROM is on a domain not verified in Resend.
      console.error("[contact] Resend rejected the send:", error);
      return NextResponse.json({ ok: false, error: "send_failed" }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[contact] Unexpected failure sending mail:", e);
    return NextResponse.json({ ok: false, error: "send_failed" }, { status: 500 });
  }
}

/** Escape user input before it goes anywhere near the HTML body. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
