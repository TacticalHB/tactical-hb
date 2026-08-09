import "server-only";
import { Resend } from "resend";

/* ---------------------------------------------------------------------------
   Outbound mail.

   The Resend client is built INSIDE the call, never at module scope. A missing
   or malformed key must fail one request, not throw while the module is
   imported — that is how a bad env var takes a whole site down.

   FROM must be on a domain verified in Resend (tactical-hb.com). The
   destination can be anywhere, which is why sending to an outlook.com sales
   address works without any extra setup.

   app/api/contact deliberately does NOT use this helper. It is the one mail
   path already verified in production, and rewiring it to satisfy a refactor
   would risk the only form that currently works.
--------------------------------------------------------------------------- */

const FROM = process.env.CONTACT_FROM_EMAIL || "Tactical HB <contact@tactical-hb.com>";

export type SendResult = { ok: true } | { ok: false; error: "not_configured" | "send_failed" };

export async function sendMail(opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** Hitting reply in the inbox should answer the customer directly. */
  replyTo?: string;
  /**
   * Override the sender. Must be on a domain verified in Resend — anything
   * else is rejected outright. Used so order confirmations come from the
   * address customers should reply to.
   */
  from?: string;
  /**
   * Files to attach, referenced by absolute URL — Resend fetches them itself.
   *
   * A URL rather than bytes on purpose: `public/` is deployed to the CDN and is
   * not reliably present on a serverless function's own filesystem, so reading
   * the file at send time is exactly the kind of thing that works locally and
   * fails once deployed. The URL is the same asset the site already serves.
   */
  attachments?: { filename: string; path: string }[];
  /**
   * Extra RFC-5322 headers.
   *
   * Added for List-Unsubscribe and List-Unsubscribe-Post, which Gmail and
   * Yahoo have required of bulk senders since February 2024: without them a
   * marketing send is throttled or binned regardless of how clean the list is.
   * The transactional callers pass nothing and are unchanged.
   */
  headers?: Record<string, string>;
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[mail] RESEND_API_KEY is not set — cannot send to", opts.to);
    return { ok: false, error: "not_configured" };
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: opts.from ?? FROM,
      to: opts.to,
      replyTo: opts.replyTo,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
      ...(opts.attachments?.length ? { attachments: opts.attachments } : {}),
      ...(opts.headers && Object.keys(opts.headers).length ? { headers: opts.headers } : {}),
    });
    if (error) {
      // Most common cause: FROM is on a domain not verified in Resend.
      console.error("[mail] Resend rejected the send:", error);
      return { ok: false, error: "send_failed" };
    }
    return { ok: true };
  } catch (e) {
    console.error("[mail] Unexpected failure sending mail:", e);
    return { ok: false, error: "send_failed" };
  }
}

/** Escape user input before it goes anywhere near an HTML body. */
export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Rows for the little detail tables used in both notification emails. */
export function rowsHtml(rows: [string, string][]): string {
  return rows
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:3px 18px 3px 0;color:#707072;white-space:nowrap">${esc(k)}</td><td style="padding:3px 0">${esc(v)}</td></tr>`
    )
    .join("");
}
