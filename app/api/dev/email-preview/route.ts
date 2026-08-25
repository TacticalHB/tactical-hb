import { NextRequest, NextResponse } from "next/server";
import { renderEmail, renderEmailText } from "@/lib/email/template";
import { isAppLocale } from "@/i18n/routing";
import {
  CART,
  CART_LINKS,
  POST_PURCHASE,
  POST_PURCHASE_LINKS,
  WELCOME,
  WELCOME_LINKS,
  url,
  type CartStep,
  type Locale,
  type WelcomeStep,
} from "@/lib/email/content";
import { productRowsFor } from "@/lib/email/flows";
import {
  renderTransactional,
  TRANSACTIONAL_KINDS,
  type TransactionalKind,
} from "./transactional";

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
     /api/dev/email-preview?step=C1&locale=uk&local=1   ← images resolve
     /api/dev/email-preview?step=order&locale=uk        ← transactional too

   The four transactional letters render here as well — order, shipping,
   wholesale, followup — because all five families now share one palette in
   lib/email-theme.ts, and the only way to keep them from drifting apart again
   is to be able to look at them together.

   `local=1` rewrites the absolute tactical-hb.com URLs to this origin, which
   is the only way to SEE the pictures before a deploy has put them on the CDN.
   Off by default, because the addresses in a real send are the live ones and a
   preview that quietly showed localhost links would be lying about them.
--------------------------------------------------------------------------- */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* A stand-in bag chosen to stress the thumbnail frame: a bowl (tall subject),
   a wind cover (the product whose tile art is 524×968 and used to warp), and
   an HMD in a named finish (a variant photo rather than the catalogue one). */
const SAMPLE_CART = [
  { slug: "bowl-livanka", qty: 1 },
  { slug: "windcover-detonator", qty: 2, options: { timer: true } },
  { slug: "hmd-tct-op", qty: 1, options: { variant: "Purple", lid: true } },
];

const FAKE_TOKEN = "00000000-0000-0000-0000-000000000000";

const SITE_BASE = (process.env.SITE_URL || "https://tactical-hb.com").replace(/\/$/, "");

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not found", { status: 404 });
  }

  const q = new URL(request.url).searchParams;
  const raw = q.get("step") || "W1";
  /* TWO LOCALE VARIABLES, ON PURPOSE.

     The marketing flows (W1, C1 …) exist in English and Ukrainian only, so
     `locale` stays narrowed to those two and everything below is unchanged.

     The transactional letters have all four, and this route used to collapse
     ja and ar to en before they ever reached the builder — which meant the
     Arabic letters could not be looked at at all, and an RTL mistake in one
     had nowhere to show itself. `previewLocale` keeps whatever was asked for
     when it is a real storefront. */
  const locale: Locale = q.get("locale") === "uk" ? "uk" : "en";
  const asked = q.get("locale") ?? "";
  const previewLocale = isAppLocale(asked) ? asked : "en";
  const asText = q.get("format") === "text";

  const localiseOut = (out: string) =>
    q.get("local") ? out.split(SITE_BASE).join(new URL(request.url).origin) : out;

  // The transactional letters build themselves end to end, so they short-
  // circuit everything below.
  if (TRANSACTIONAL_KINDS.includes(raw.toLowerCase() as TransactionalKind)) {
    const built = renderTransactional(raw.toLowerCase() as TransactionalKind, previewLocale);
    const body = asText ? `Subject: ${built.subject}\n\n${built.text}` : built.html;
    return new NextResponse(localiseOut(body), {
      headers: {
        "Content-Type": asText ? "text/plain; charset=utf-8" : "text/html; charset=utf-8",
      },
    });
  }

  const step = raw.toUpperCase();

  const isWelcome = step.startsWith("W");
  const isP1 = step === "P1";
  const copy = isP1
    ? POST_PURCHASE.P1?.[locale]
    : isWelcome
      ? WELCOME[step as WelcomeStep]?.[locale]
      : CART[step as CartStep]?.[locale];

  if (!copy) {
    return new NextResponse(
      `Unknown step "${step}". Try W1–W4, C1–C3, P1, or ${TRANSACTIONAL_KINDS.join(" / ")}.`,
      { status: 400 }
    );
  }

  const links = isP1
    ? POST_PURCHASE_LINKS.P1
    : isWelcome
      ? WELCOME_LINKS[step as WelcomeStep]
      : CART_LINKS[step as CartStep];

  // Same shape the sender builds, from the same catalogue and pricer.
  // P1 shows no product rows: it is about the setup as an idea, not a basket.
  const sample = isP1
    ? []
    : isWelcome
      ? step === "W3"
        ? [{ slug: "hmd-tct-classic", qty: 1 }]
        : []
      : SAMPLE_CART;

  const site = SITE_BASE;
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

  const localise = localiseOut;

  if (asText) {
    return new NextResponse(localise(`Subject: ${copy.subject}\n\n${renderEmailText(input)}`), {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return new NextResponse(localise(renderEmail(input)), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
