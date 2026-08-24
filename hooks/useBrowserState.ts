"use client";

import { useSyncExternalStore } from "react";

/* ---------------------------------------------------------------------------
   Reading the browser without an effect.

   These answer two questions that come up all over the site — "is the visitor
   asking for less motion?" and "are we past the server render yet?" — and both
   used to be answered the same way: start with a safe default, then setState
   in a mount effect.

   That works, and it costs a wasted render every time: the component paints
   once with the wrong answer and again with the right one. On the motion
   question it is worse than wasteful, because the first paint is the one that
   starts the animation somebody asked not to see.

   useSyncExternalStore is what React provides for exactly this. It takes a
   server snapshot and a client snapshot, so the first client render already
   has the real value and there is nothing to correct afterwards. It also
   subscribes, which the effect version never did — a visitor who turns
   reduced motion ON while the page is open used to keep the animations until
   they reloaded.

   THE SNAPSHOT MUST BE IDENTITY-STABLE. React calls it on every render and
   compares by Object.is; a getSnapshot that builds a new object each time is
   an infinite loop. Both of these return primitives, which is the easy case —
   anything richer needs caching (see Countdown).
--------------------------------------------------------------------------- */

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia(REDUCED_MOTION);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function readReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(REDUCED_MOTION).matches;
}

/**
 * Whether the visitor has asked the system for reduced motion.
 *
 * False during the server render, which is the right default: the markup is
 * the same either way, and animations are opted INTO on the client.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReducedMotion, readReducedMotion, () => false);
}

/* Never fires. `mounted` cannot change after the first client render, so there
   is nothing to subscribe to — the two snapshots below carry the whole answer. */
const noopSubscribe = () => () => {};

/**
 * False on the server and during hydration, true afterwards.
 *
 * For markup that genuinely cannot exist until there is a document — a portal
 * target, a measured element. Not a licence to skip SSR: anything that CAN be
 * rendered on the server should be.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
}
