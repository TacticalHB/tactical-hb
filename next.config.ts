import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

/* SECURITY HEADERS, on every response (pre-launch audit, BUG-16).

   - frame-ancestors 'self' + X-Frame-Options: no other site may show these
     pages inside a frame (clickjacking). Same-origin framing — the admin's
     email previews — still works.
   - nosniff: a file is only ever treated as the type it was served as.
   - Referrer-Policy: other sites see our origin, never a full path (order or
     account URLs) when someone follows a link out.
   - Permissions-Policy: camera, microphone, location and ad-topics are off;
     nothing on the site uses them. Payment is NOT listed: Monobank's page is
     where wallets run, and blocking it here buys nothing.

   NOT A FULL CONTENT-SECURITY-POLICY, deliberately. The CSP below carries only
   frame-ancestors, which restricts nothing the page itself loads. A script /
   connect allow-list touches Monobank, analytics, the 3D viewer and Vercel's
   own scripts at once, and one missed entry silently breaks payment — that
   belongs after launch, with time to test it, not two days before. */
const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];

const nextConfig: NextConfig = {
  /* No "x-powered-by: Next.js" — it tells a scanner which exploits to try. */
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  /* The partner-only product sheets live outside public/ (they carry trade
     prices) and are read at request time, so they must be traced into the
     function that serves them. */
  outputFileTracingIncludes: {
    "/api/wholesale/sheet/[lang]": ["./private/wholesale/**/*"],
  },
};

export default withNextIntl(nextConfig);
