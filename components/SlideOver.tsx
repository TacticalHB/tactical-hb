"use client";

import { useEffect } from "react";

/* Body scroll lock, reference-counted across every slide-over on the page.
   Per-instance save/restore is wrong when two panels overlap: the second one
   captures "hidden" as the previous value and restores it on close, leaving
   the page permanently unscrollable. Only the last panel to close releases. */
let lockCount = 0;

function lockScroll() {
  if (lockCount === 0) document.body.style.overflow = "hidden";
  lockCount += 1;
}

function releaseScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) document.body.style.overflow = "";
}

/* ---------------------------------------------------------------------------
   The right-hand slide-over used by the mini cart and the "Added to Shopping
   Bag" panel. One shell so both share scroll-locking, Escape-to-close and the
   same easing — and so two panels can never both hold the body scroll lock.

   Stays mounted and translated off-screen (rather than unmounting) so the exit
   animation can play.
--------------------------------------------------------------------------- */

export default function SlideOver({
  open,
  onClose,
  label,
  children,
  width = 440,
  z = 120,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: React.ReactNode;
  width?: number;
  z?: number;
}) {
  useEffect(() => {
    if (!open) return;
    lockScroll();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      releaseScroll();
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 transition-opacity duration-300"
        style={{
          background: "rgba(0,0,0,0.4)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          zIndex: z,
        }}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal={open}
        aria-label={label}
        aria-hidden={!open}
        className="fixed top-0 right-0 h-full w-full flex flex-col transition-transform duration-[420ms]"
        style={{
          maxWidth: width,
          zIndex: z + 1,
          background: "#ffffff",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
          boxShadow: "-24px 0 70px -24px rgba(0,0,0,0.35)",
          // Fully hidden panels must not be reachable by keyboard.
          visibility: open ? "visible" : "hidden",
          transitionProperty: "transform, visibility",
        }}
      >
        {children}
      </aside>
    </>
  );
}

/** Shared close (×) button for slide-over headers. */
export function CloseButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="p-1 transition-opacity hover:opacity-60"
      style={{ color: "var(--text)" }}
    >
      <svg width="20" height="20" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M5 5l12 12M17 5L5 17" />
      </svg>
    </button>
  );
}
