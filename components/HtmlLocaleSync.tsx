"use client";

import { useEffect, useLayoutEffect } from "react";
import { localeDir } from "@/i18n/routing";

/* ---------------------------------------------------------------------------
   Keeps <html lang> and <html dir> honest across a client-side navigation.

   THE PROBLEM THIS EXISTS FOR. `lang` and `dir` belong on <html>, and <html> is
   rendered by the ROOT layout — which sits above [locale] and is therefore
   shared by every route on the site. Next.js preserves a shared layout across
   a soft navigation instead of re-rendering it, so those two attributes are
   whatever the FIRST server render set them to and never change again.

   Going from /ar to /en left the page at dir="rtl": English prose right
   aligned, the nav mirrored, and full stops migrating to the front of the
   line. Only a full reload put it right, which is not what a link does.

   It is quieter but just as wrong in the other direction: /ja to /en left
   lang="ja", so a screen reader read English in a Japanese voice. That one
   affects all four storefronts, not only the right-to-left one.

   WHY NOT MOVE <html> INTO [locale]. Because a root layout must render <html>
   and <body> — Next requires it — and there are routes outside [locale]
   (/unlock, the / redirect) that would then have no document shell at all.
   Syncing the two attributes is the smaller, safer change.

   BEFORE PAINT, NOT AFTER. useLayoutEffect runs between React's commit and the
   browser's paint, so the corrected direction is what actually gets drawn. A
   plain useEffect would let one frame of mirrored English through — brief, but
   on the exact transition this component exists to fix. The isomorphic dance
   below is only to keep useLayoutEffect off the server, where it warns and
   does nothing useful.
--------------------------------------------------------------------------- */

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export default function HtmlLocaleSync({ locale }: { locale: string }) {
  useIsomorphicLayoutEffect(() => {
    const el = document.documentElement;
    const dir = localeDir(locale);
    // Guarded so the very common case — a navigation within one locale —
    // touches no attributes and invalidates no style.
    if (el.lang !== locale) el.lang = locale;
    if (el.dir !== dir) el.dir = dir;
  }, [locale]);

  return null;
}
