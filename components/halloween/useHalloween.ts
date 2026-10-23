"use client";

import { useSyncExternalStore } from "react";
import { halloweenActive } from "@/lib/halloween";

/* ---------------------------------------------------------------------------
   Is the Halloween sale on, right now, in this browser? (31 Oct 2026 only.)

   A tiny external store over the clock, re-checked every 20 seconds, so a
   page left open across midnight flips on (or off) by itself. The server
   snapshot is the server's own clock at render time — product pages are
   rendered per request, so the first paint already shows the right price.
   Delete with lib/halloween after 1 November.
--------------------------------------------------------------------------- */

function subscribe(onChange: () => void) {
  const id = setInterval(onChange, 20_000);
  return () => clearInterval(id);
}

export function useHalloween(): boolean {
  return useSyncExternalStore(subscribe, () => halloweenActive(), () => halloweenActive());
}

/** A clock that ticks every second while the sale is on — for the countdown only. */
function subscribeSecond(onChange: () => void) {
  const id = setInterval(onChange, 1000);
  return () => clearInterval(id);
}
let cachedSecond = 0;
function nowSecond(): number {
  const s = Math.floor(Date.now() / 1000) * 1000;
  if (s !== cachedSecond) cachedSecond = s;
  return cachedSecond;
}
export function useSecondClock(): number | null {
  return useSyncExternalStore(subscribeSecond, nowSecond, () => null);
}
