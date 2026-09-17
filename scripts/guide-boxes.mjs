import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

/* Where each thing to press actually sits on each screen.

   MEASURED, NOT EYEBALLED. The callout rings in the guide are drawn from these
   boxes, so if a button moves the guide is regenerated rather than
   re-annotated by hand. Coordinates are CSS pixels; the screenshots are 2x, so
   the drawing step doubles them. */

const BASE = "http://localhost:3100";
const LOCALE = process.env.SHOT_LOCALE || "en";
const EMAIL = "orders@yourcompany.com";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, reducedMotion: "reduce" });
await ctx.addCookies([{
  name: "tct-cookie-consent",
  value: encodeURIComponent(JSON.stringify({ necessary: true, analytics: false, marketing: false, ts: new Date().toISOString() })),
  url: BASE,
}]);
const page = await ctx.newPage();
const out = {};

async function boxes(shot, url, targets, opts = {}) {
  await page.goto(`${BASE}${url}`, { waitUntil: "networkidle" });
  if (opts.scrollTo) {
    await page.locator(opts.scrollTo).first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(700);
  }
  if (opts.scrollBy) {
    await page.evaluate((y) => window.scrollBy(0, y), opts.scrollBy);
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(400);
  out[shot] = [];
  for (const [label, sel] of targets) {
    const b = await page.locator(sel).first().boundingBox().catch(() => null);
    out[shot].push({ label, box: b });
    if (!b) console.warn("  MISSING", shot, label, sel);
  }
  console.log(shot, out[shot].map((t) => `${t.label}:${t.box ? "ok" : "MISSING"}`).join(" "));
}

await boxes("01-nav", `/${LOCALE}`, [["wholesale", `header a[href="/${LOCALE}/wholesale"]`]]);
await boxes("02-wholesale", `/${LOCALE}/wholesale`, [["register", `a[href="/${LOCALE}/wholesale/register"]`]], { scrollTo: `a[href="/${LOCALE}/wholesale/register"]` });

/* BY ID, NOT BY TYPE. The first attempt used `input[type=email]` and
   `form button`, and both matched the header's search control — the callout
   ring would have pointed at the magnifier. Every field in this form carries a
   stable id, so the guide points at the field it names. */
await boxes("03-email", `/${LOCALE}/wholesale/register`, [
  ["email", "#wh-email"],
  ["send", "form:has(#wh-email) button[type=submit]"],
]);
await boxes("04-details", `/${LOCALE}/wholesale/register?step=details&email=${encodeURIComponent(EMAIL)}`, [
  ["code", "#wh-code"],
  ["company", "#wh-company"],
]);
await boxes("05-details-lower", `/${LOCALE}/wholesale/register?step=details&email=${encodeURIComponent(EMAIL)}`, [
  ["type", "form select"],
  ["password", "#wh-pw"],
  ["submit", "form:has(#wh-pw) button[type=submit]"],
], { scrollBy: 620 });
await boxes("06-done", `/${LOCALE}/wholesale/register?step=done`, []);

writeFileSync(`boxes-${LOCALE}.json`, JSON.stringify(out, null, 1));
await browser.close();
