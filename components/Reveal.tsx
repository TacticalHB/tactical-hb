"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/useBrowserState";

export default function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [intersected, setIntersected] = useState(false);
  const reduced = usePrefersReducedMotion();

  /* Reduced motion means everything is simply visible, so it is DERIVED rather
     than pushed into state by the effect below. The old version set the flag
     from inside the effect, which painted the content hidden for one frame
     before revealing it — a flash of nothing, shown only to the people who
     asked for less movement. */
  const visible = reduced || intersected;

  useEffect(() => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIntersected(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
    // `reduced` decides whether an observer is wanted at all, so a change to
    // it has to tear the old one down.
  }, [reduced]);

  return (
    <div
      ref={ref}
      className={`reveal ${visible ? "reveal-visible" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
