import "server-only";
import type { NextRequest } from "next/server";

/* ---------------------------------------------------------------------------
   Cheap first-line spam screening for the public form endpoints.

   Aimed at the overwhelming majority of form spam, which is dumb automated
   scripts rather than someone targeting this shop. Deliberately NOT a
   substitute for rate limiting — that needs shared state (Upstash/Redis or a
   Vercel Firewall rule), because each serverless instance has its own memory.

   Every check is built to fail OPEN. Dropping a genuine wholesale enquiry or a
   real customer's order is far worse than letting a bot through, so anything
   ambiguous is allowed.
--------------------------------------------------------------------------- */

/** A human cannot complete one of these forms faster than this. */
export const MIN_FILL_MS = 3000;

/** The hidden field bots fill in. Named to look worth filling. */
export const HONEYPOT_FIELD = "company_website";

export type SpamVerdict =
  /** Looks human — carry on. */
  | "ok"
  /** Almost certainly a bot. Answer 200 so it never learns to retry. */
  | "drop"
  /** Not from our site at all. */
  | "reject";

export function screen(request: NextRequest, body: Record<string, unknown>): SpamVerdict {
  // 1. Origin. Browsers send this on same-origin POSTs, so a mismatch means
  //    the request did not come from our pages. Spoofable, so this only stops
  //    what isn't deliberately targeting us. A MISSING origin is allowed —
  //    rejecting those risks breaking a legitimate client.
  const origin = request.headers.get("origin");
  if (origin) {
    const host = request.headers.get("host");
    try {
      if (host && new URL(origin).host !== host) return "reject";
    } catch {
      return "reject"; // unparseable Origin
    }
  }

  // 2. Honeypot — invisible to people, irresistible to scripts.
  if (String(body[HONEYPOT_FIELD] ?? "").trim()) return "drop";

  // 3. Time on form. The timestamp comes from the client so it is spoofable;
  //    it catches scripts that post instantly, not a determined attacker.
  const ts = Number(body.ts);
  if (Number.isFinite(ts) && ts > 0) {
    const elapsed = Date.now() - ts;
    // Only judge plausible elapsed times. A negative value means the client's
    // clock runs fast — that is clock skew, not evidence of a bot.
    if (elapsed >= 0 && elapsed < MIN_FILL_MS) return "drop";
  }

  return "ok";
}
