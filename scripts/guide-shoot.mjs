import { chromium } from "playwright";

/* Capture the wholesale registration journey, one PNG per screen.

   NOTHING IS SUBMITTED. The email step is photographed with a plausible
   address typed in but the button never pressed — pressing it sends a real
   one-time code through Supabase, and the later steps would create a real
   partner row. Steps 2 and 3 are reached by a temporary ?step= override that
   lives only in the working tree and is reverted afterwards. */

const BASE = "http://localhost:3100";
const LOCALE = process.env.SHOT_LOCALE || "en";
const OUT = process.env.SHOT_OUT || ".";
const EMAIL = "orders@yourcompany.com";

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 860 },
  deviceScaleFactor: 2,          // retina, so the PDF does not print mush
  reducedMotion: "reduce",       // sections animate in on scroll
});

await ctx.addCookies([{
  name: "tct-cookie-consent",
  value: encodeURIComponent(JSON.stringify({ necessary: true, analytics: false, marketing: false, ts: new Date().toISOString() })),
  url: BASE,
}]);

/* THE DEV OVERLAY IS NOT PART OF THE SHOP. next dev paints its own badge over
   the bottom-left corner — the "N" disc, and a red "1 Issue" pill — and a
   customer guide showing a framework error indicator would be worse than no
   guide. Hidden in the page, not cropped out, so it cannot creep back in at a
   different size. */
await ctx.addInitScript(() => {
  const css = document.createElement("style");
  css.textContent = "nextjs-portal,[data-nextjs-toast],#__next-build-watcher{display:none!important}";
  document.documentElement.appendChild(css);
});

const page = await ctx.newPage();

async function shot(name, url, opts = {}) {
  await page.goto(`${BASE}${url}`, { waitUntil: "networkidle" });
  if (opts.scrollTo) {
    await page.locator(opts.scrollTo).first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(700);
  }
  if (opts.scrollBy) {
    await page.evaluate((y) => window.scrollBy(0, y), opts.scrollBy);
    await page.waitForTimeout(500);
  }
  if (opts.fill) for (const [sel, val] of Object.entries(opts.fill)) {
    await page.fill(sel, val).catch(() => {});
  }
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log("shot", name);
}

await shot("01-nav", `/${LOCALE}`);
await shot("02-wholesale", `/${LOCALE}/wholesale`, { scrollTo: `a[href="/${LOCALE}/wholesale/register"]` });
await shot("03-email", `/${LOCALE}/wholesale/register`, { fill: { 'input[type="email"]': EMAIL } });
await shot("04-details", `/${LOCALE}/wholesale/register?step=details&email=${encodeURIComponent(EMAIL)}`);
// The form runs past the fold; the half with the password and the submit
// button is the half people get stuck on, so it gets its own frame.
await shot("05-details-lower", `/${LOCALE}/wholesale/register?step=details&email=${encodeURIComponent(EMAIL)}`, { scrollBy: 620 });
await shot("06-done", `/${LOCALE}/wholesale/register?step=done`);

await browser.close();
