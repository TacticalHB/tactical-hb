#!/usr/bin/env node
/* ---------------------------------------------------------------------------
   Tell the IndexNow engines what we just deployed.

   WHY THIS EXISTS. On 21 September 2026, twenty-two days after robots.txt
   opened, Search Console reported twenty-one of the twenty-three sitemap URLs
   as "Discovered – currently not indexed" with a null last-crawled date:
   found on 29 August, never once fetched. Nothing was broken — the host was
   green, responses averaged 359ms, internal links were server-rendered — the
   domain simply had no crawl demand. Google offers no lever for that.

   IndexNow is the lever the other engines do offer: a POST saying "these URLs
   changed, come and look", honoured by Bing, Yandex, Seznam and Naver. GOOGLE
   DOES NOT USE IT. This does nothing whatsoever for the Google problem above
   and is not meant to — it is how we stop having that problem everywhere else.

   ONE SOURCE OF TRUTH, AND IT IS THE SITEMAP WE JUST BUILT. The URL list is
   parsed out of .next/server/app/sitemap.xml.body rather than rebuilt here
   from lib/products and a copy of the static path list. A second copy of that
   list is how the launch date ended up in seventeen places: this script cannot
   submit a URL the sitemap does not carry, and cannot miss one it does.

   AND IT TAKES THE ALTERNATES TOO. app/sitemap.ts lists one <loc> per page —
   the Ukrainian one — with /en, /ja and /ar hanging off it as hreflang
   alternates, deliberately, so that the file describes twenty-three pages
   rather than ninety-two. A crawler is expected to follow those. IndexNow is
   not a crawler and follows nothing, so every alternate href is submitted as
   its own URL: 23 pages × 4 storefronts, which is the whole shop.
--------------------------------------------------------------------------- */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const ENDPOINT = "https://api.indexnow.org/IndexNow";
const BUILT_SITEMAP = ".next/server/app/sitemap.xml.body";

/* An IndexNow key is 8–128 characters of hex-ish text, published at the site
   root so the engine can prove whoever is submitting owns the domain. */
const KEY_FILE = /^([A-Za-z0-9-]{8,128})\.txt$/;

const force = process.argv.includes("--force");
const dry = process.argv.includes("--dry");

/**
 * The key, read from the file that publishes it.
 *
 * NOT AN ENV VAR. The key is not a secret — it sits at a public URL by design,
 * which is the entire verification mechanism — and holding it in an env var
 * as well would mean the filename in public/ and the value in Vercel have to
 * agree, with nothing to catch it when they stop agreeing. The filename IS the
 * key, so that is what gets read, and the contents are checked against it: a
 * file whose body has drifted from its name would be rejected by the engine
 * with a 403 nobody would think to look for.
 */
async function readKey() {
  const dir = "public";
  for (const name of await readdir(dir)) {
    const m = name.match(KEY_FILE);
    if (!m) continue;
    const body = (await readFile(join(dir, name), "utf8")).trim();
    if (body !== m[1]) {
      throw new Error(`public/${name} contains "${body}" — it must contain its own filename`);
    }
    return m[1];
  }
  return null;
}

/** Every URL the built sitemap names, canonical and alternate alike. */
function urlsFrom(xml) {
  const urls = new Set();
  for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) urls.add(m[1].trim());
  /* x-default repeats the Ukrainian URL, so the Set is doing real work here
     rather than being defensive. */
  for (const m of xml.matchAll(/<xhtml:link\b[^>]*\bhref="([^"]+)"/g)) urls.add(m[1].trim());
  return [...urls].sort();
}

async function main() {
  /* PRODUCTION ONLY, AND OPT-IN EVERYWHERE ELSE.
     postbuild runs on every build there is: a preview branch, and `npm run
     build` on this laptop, which is run constantly as a typecheck. Testing
     for "not production" would let both of those through, because neither
     sets VERCEL_ENV at all — so the test is for production itself, and
     anything else needs --force. A preview branch announcing its URLs would
     be claiming pages for a host it is not deployed at; a local build would
     be announcing whatever happened to be in the working tree. */
  if (!force && process.env.VERCEL_ENV !== "production") {
    console.log(`indexnow: skipped (VERCEL_ENV=${process.env.VERCEL_ENV ?? "unset"})`);
    return;
  }
  if (process.env.INDEXNOW_DISABLED) {
    console.log("indexnow: skipped (INDEXNOW_DISABLED is set)");
    return;
  }

  const key = await readKey();
  if (!key) {
    console.log("indexnow: skipped (no key file in public/)");
    return;
  }

  let xml;
  try {
    xml = await readFile(BUILT_SITEMAP, "utf8");
  } catch {
    console.log(`indexnow: skipped (${BUILT_SITEMAP} not found — did next build run?)`);
    return;
  }

  const urlList = urlsFrom(xml);
  if (urlList.length === 0) {
    console.log("indexnow: skipped (the built sitemap named no URLs)");
    return;
  }

  const host = new URL(urlList[0]).host;
  const body = {
    host,
    key,
    keyLocation: `https://${host}/${key}.txt`,
    urlList,
  };

  if (dry) {
    console.log(`indexnow: DRY RUN — would POST ${urlList.length} URLs to ${ENDPOINT}`);
    console.log(JSON.stringify({ ...body, urlList: urlList.slice(0, 4) }, null, 2));
    console.log(`  … and ${urlList.length - 4} more`);
    return;
  }

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });

  /* 200 accepted, 202 accepted but the key is still being validated — which is
     the normal answer for the first few submissions after a new key goes up.
     Everything else is worth reading: 403 is a key the engine could not fetch,
     422 is a URL that does not belong to `host`, 429 is too many submissions. */
  const ok = res.status === 200 || res.status === 202;
  const detail = ok ? "" : ` — ${(await res.text()).slice(0, 300)}`;
  console.log(`indexnow: ${res.status} for ${urlList.length} URLs on ${host}${detail}`);
}

/* NEVER FAILS THE BUILD. This is a courtesy call to a third party; a deploy
   that is otherwise fine must not be lost because api.indexnow.org timed out
   or a key was still propagating. Errors are printed and swallowed. */
main().catch((err) => {
  console.log(`indexnow: skipped (${err instanceof Error ? err.message : String(err)})`);
});
