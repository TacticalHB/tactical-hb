import "server-only";
import type { NextRequest } from "next/server";

/* ---------------------------------------------------------------------------
   A per-visitor submission limit for the public forms (pre-launch audit,
   BUG-10): N posts per window per IP, per form.

   IN MEMORY, AND THAT IS A KNOWN LIMIT. Each server instance keeps its own
   count, so a determined sender spread across instances gets a few more
   tries; it still stops the common case — one script hammering one form —
   without a new service or a database migration. A shared store (or a
   Vercel Firewall rate-limit rule) is the upgrade if spam ever gets past it.
--------------------------------------------------------------------------- */

const hits = new Map<string, number[]>();

function clientIp(request: NextRequest): string {
  const fwd = request.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] || request.headers.get("x-real-ip") || "unknown").trim();
}

/** True when this request is within the limit (and counts it); false when the
    visitor has already sent `max` in the last `windowMs`. */
export function allowSubmission(request: NextRequest, form: string, max = 5, windowMs = 10 * 60_000): boolean {
  const key = `${form}:${clientIp(request)}`;
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  // Keep the map from growing without bound on a long-lived instance.
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  }
  return true;
}
