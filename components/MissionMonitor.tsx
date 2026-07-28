"use client";

import { useEffect, useRef } from "react";

/* ---------------------------------------------------------------------------
   Mr.HB on a field monitor — the right-hand half of the mission section.

   The animation is presented as a DEVICE, not a video pasted onto the page: a
   dark bezel with screws, a power light, and a caption rail, so the one moving
   thing in a still, light section reads as a screen someone switched on. The
   bezel takes --fog, the same gradient the header and footer are cut from, and
   the shadow is the one .hero-screen uses — the monitor is a new object on the
   page but not a new visual language.

   PLAYBACK STARTS ON SCROLL, NOT ON LOAD, and this is the whole reason the
   component is a client one. The mission section is four screens down the
   page; a plain autoPlay would run the 4.8s animation out while the visitor
   was still reading the hero, and every person who scrolled here would find a
   still image and never know it moved. So it waits for the monitor to be
   actually on screen, plays once, and then holds — which is the brief.

   It plays ONCE. There is no loop attribute, and none should be added: the
   animation ends on the composed Mr.HB lockup with HB and TCT in the brand
   orange, and that final frame is the thing the section wants to leave on the
   page. A loop would throw it away every five seconds.

   Reduced motion gets the ending without the journey — the video is seeked to
   its last frame and never played, so the same composition lands with no
   movement at all rather than the section going empty.
--------------------------------------------------------------------------- */

export default function MissionMonitor({ uk }: { uk: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      // Land on the final frame without ever animating. Nudged just inside the
      // duration because seeking exactly to the end is not required to paint a
      // frame, and a black screen is a worse failure than a 50ms-early one.
      const settle = () => {
        video.currentTime = Math.max(0, video.duration - 0.05);
      };
      if (video.readyState >= 1) settle();
      else video.addEventListener("loadedmetadata", settle, { once: true });
      return () => video.removeEventListener("loadedmetadata", settle);
    }

    // Play when the monitor is genuinely in view, once, then never again.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.disconnect();
          // A blocked autoplay is not an error worth surfacing — the first
          // frame simply stays put, which is a reasonable still.
          void video.play().catch(() => {});
        }
      },
      // Enough of it showing that the opening frames aren't spent off-screen.
      { threshold: 0.4 }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className="relative w-full max-w-[320px] mx-auto rounded-[18px] p-3.5"
      style={{
        background: "var(--fog)",
        boxShadow:
          "0 32px 70px -28px rgba(17, 17, 20, 0.45), 0 2px 6px rgba(17, 17, 20, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.09)",
      }}
    >
      {/* Bezel screws — four dots, lit from the upper left like everything else
          on the page. Present at a glance, invisible on inspection. */}
      {[
        "top-2 left-2",
        "top-2 right-2",
        "bottom-2 left-2",
        "bottom-2 right-2",
      ].map((pos) => (
        <span
          key={pos}
          aria-hidden="true"
          className={`absolute ${pos} w-[7px] h-[7px] rounded-full`}
          style={{
            background: "radial-gradient(circle at 35% 35%, #6a6f76, #2c2f33)",
            boxShadow: "inset 0 0 2px #000",
          }}
        />
      ))}

      {/* Top rail — channel on the left, power light on the right. */}
      <div className="flex items-center justify-between px-1.5 pb-3">
        <span className="font-mono text-[10px] font-semibold tracking-[0.18em]">
          <span style={{ color: "var(--accent)" }}>TCT-01</span>
          {/* The separator is literal text, not a comment — quoted so neither
              the linter nor the next reader has to guess. */}
          <span style={{ color: "#8a9097" }}>{` // ${uk ? "ЕФІР" : "LIVE FEED"}`}</span>
        </span>
        <span
          className="flex items-center gap-1.5 font-mono text-[9px] font-medium tracking-[0.12em]"
          style={{ color: "var(--accent)" }}
        >
          <span
            aria-hidden="true"
            className="monitor-led w-1.5 h-1.5 rounded-full"
            style={{ background: "var(--accent)", boxShadow: "0 0 6px var(--accent)" }}
          />
          PWR
        </span>
      </div>

      {/* Screen. The frame is 9:16 and so is the source, so object-cover fills
          it edge to edge without cropping a pixel off Mr.HB. */}
      <div
        className="relative w-full aspect-[9/16] rounded-[6px] overflow-hidden"
        style={{ background: "#000", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }}
      >
        <video
          ref={videoRef}
          className="w-full h-full object-cover block"
          src="/videos/mr-hb-animation.mp4"
          muted
          playsInline
          preload="auto"
          aria-label={uk ? "Анімація Mr.HB" : "Mr.HB animation"}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 55%, rgba(0, 0, 0, 0.45))",
          }}
        />
      </div>

      {/* Caption rail. UKRAINE survives from the poster this replaced — it was
          the one true thing on it, and the reference's GPS readout pointed at
          Washington DC, which this brand is not. */}
      <div className="flex items-center justify-between px-1.5 pt-3">
        <span
          className="font-display text-[13px] tracking-[0.24em] uppercase"
          style={{ color: "#c9ccd0" }}
        >
          Mr.HB
        </span>
        <span
          className="font-mono text-[9px] tracking-[0.14em] uppercase"
          style={{ color: "#5c6167" }}
        >
          {uk ? "Україна" : "Ukraine"}
        </span>
      </div>
    </div>
  );
}
