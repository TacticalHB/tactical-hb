import { NextRequest, NextResponse } from "next/server";
import { renderEmail, renderEmailText } from "@/lib/email/template";
import {
  CART,
  CART_LINKS,
  WELCOME,
  WELCOME_LINKS,
  url,
  type CartStep,
  type Locale,
  type WelcomeStep,
} from "@/lib/email/content";
import { productRowsFor } from "@/lib/email/flows";

/* ---------------------------------------------------------------------------
   Look at an email without sending one. Development only.

   404 IN PRODUCTION, checked on every request rather than at module load, so
   there is no build-time flag to get wrong. It renders copy that is already
   public-facing and sends nothing, but a route whose whole job is to emit
   marketing HTML has no business existing on the live site.

   IT IS NOT THE SEND PATH AND DOES NOT PRETEND TO BE. The real sender resolves
   the subscriber, checks consent, checks for a paid order and reads the stored
   bag; this fills in a plausible bag so the layout can be judged. To test the
   real thing end to end, subscribe with your own address on the running site
   and let the queue deliver it — that exercises consent, the token, the
   unsubscribe header and Resend itself, none of which this route touches.

     /api/dev/email-preview?step=W1&locale=uk
     /api/dev/email-preview?step=C1&locale=en&format=text
--------------------------------------------------------------------------- */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A stand-in bag: one bowl and one wind cover with its timer. */
const SAMPLE_CART = [
  { slug: "bowl-livanka", qty: 1 },
  { slug: "windcover-detonator", qty: 2, options: { timer: true } },
];

const FAKE_TOKEN = "00000000-0000-0000-0000-000000000000";

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not found", { status: 404 });
  }

  const q = new URL(request.url).searchParams;
  const step = (q.get("step") || "W1").toUpperCase();
  const locale: Locale = q.get("locale") === "uk" ? "uk" : "en";
  const asText = q.get("format") === "text";

  const isWelcome = step.startsWith("W");
  const copy = isWelcome
    ? WELCOME[step as WelcomeStep]?.[locale]
    : CART[step as CartStep]?.[locale];

  if (!copy) {
    return new NextResponse(
      `Unknown step "${step}". Try W1–W4 or C1–C3.`,
      { status: 400 }
    );
  }

  const links = isWelcome
    ? WELCOME_LINKS[step as WelcomeStep]
    : CART_LINKS[step as CartStep];

  // Same shape the sender builds, from the same catalogue and pricer.
  const sample = isWelcome
    ? step === "W3"
      ? [{ slug: "hmd-tct-classic", qty: 1 }]
      : []
    : SAMPLE_CART;

  const site = (process.env.SITE_URL || "https://tactical-hb.com").replace(/\/$/, "");
  // The sender's own row builder — same prices, same finish labels, same images.
  const rows = productRowsFor(sample, locale);

  const input = {
    locale,
    preheader: copy.preheader.replace(
      /\{\{\s*product_name\s*\}\}/g,
      rows[0]?.name ?? "Your bag"
    ),
    headline: copy.headline,
    paragraphs: copy.paragraphs,
    bullets: copy.bullets,
    productRows: rows,
    primaryCta: { label: copy.primaryLabel, url: url(locale, links.primary) },
    secondaryCta: copy.secondaryLabel
      ? { label: copy.secondaryLabel, url: url(locale, links.secondary) }
      : undefined,
    unsubscribeUrl: `${site}/${locale}/newsletter/preferences?token=${FAKE_TOKEN}&action=unsubscribe`,
    preferencesUrl: `${site}/${locale}/newsletter/preferences?token=${FAKE_TOKEN}`,
  };

  if (asText) {
    return new NextResponse(`Subject: ${copy.subject}\n\n${renderEmailText(input)}`, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return new NextResponse(renderEmail(input), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
