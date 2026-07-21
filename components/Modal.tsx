"use client";

import { useEffect, useRef } from "react";
import { lockScroll, releaseScroll } from "@/lib/scroll-lock";

/* ---------------------------------------------------------------------------
   Centred information modal — used by the cart's Secured Payment / Delivery /
   Returns panels.

   Unmounts when closed (unlike SlideOver, which stays mounted to animate out)
   because these carry long prose that shouldn't sit in the accessibility tree
   or be tab-reachable while hidden.
--------------------------------------------------------------------------- */

export default function Modal({
  open,
  onClose,
  title,
  children,
  closeLabel,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  closeLabel: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    lockScroll();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    // Move focus into the dialog so Escape and tabbing behave.
    panelRef.current?.focus();
    return () => {
      releaseScroll();
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center p-4 sm:p-6"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        // Clicks inside must not reach the backdrop's close handler.
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[660px] max-h-[85vh] overflow-y-auto outline-none"
        style={{ background: "#ffffff", boxShadow: "0 30px 80px -20px rgba(0,0,0,0.35)" }}
      >
        <button
          onClick={onClose}
          aria-label={closeLabel}
          className="absolute top-5 right-5 p-1 transition-opacity hover:opacity-60"
          style={{ color: "var(--text)" }}
        >
          <svg width="20" height="20" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M5 5l12 12M17 5L5 17" />
          </svg>
        </button>

        <div className="px-8 sm:px-12 py-10 sm:py-12">
          <h2 className="text-[22px] font-medium mb-8 pr-10" style={{ color: "var(--text)" }}>
            {title}
          </h2>
          <div className="text-[14.5px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
