/* ---------------------------------------------------------------------------
   Body scroll lock, reference-counted across EVERY overlay on the page —
   slide-overs and modals alike.

   This lives in one module on purpose. Per-component save/restore is wrong
   when two overlays overlap: the second one captures "hidden" as the previous
   value and restores it on close, leaving the page permanently unscrollable.
   Anything that covers the page must use these two functions rather than
   touching document.body.style.overflow itself.
--------------------------------------------------------------------------- */

let lockCount = 0;

export function lockScroll(): void {
  if (lockCount === 0) document.body.style.overflow = "hidden";
  lockCount += 1;
}

export function releaseScroll(): void {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) document.body.style.overflow = "";
}
