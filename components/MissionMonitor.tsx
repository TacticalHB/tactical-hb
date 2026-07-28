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

   AND IT NEVER SHOWS BLACK. Every path that cannot play — reduced motion, a
   refused autoplay, a battery saver that suppresses playback silently — ends
   on the closing frame instead. See showFinalFrame below for why that matters
   more than it sounds.
--------------------------------------------------------------------------- */

export default function MissionMonitor({ uk }: { uk: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let watchdog = 0;

    /* THE FALLBACK, and the most important thing in this file: land on the
       closing frame. The animation's first frame is black, so "autoplay was
       refused" and "the screen is off" look identical to a visitor — the
       section just shows a dead rectangle. Seeking to the end instead means a
       refusal degrades to the composed Mr.HB lockup, which is where the
       animation was going to finish anyway. Worst case we lose the movement,
       never the picture.

       Nudged just inside the duration because seeking exactly to the end is
       not obliged to paint anything. */
    const showFinalFrame = () => {
      const settle = () => {
        video.currentTime = Math.max(0, video.duration - 0.05);
      };
      if (video.readyState >= 1) settle();
      else video.addEventListener("loadedmetadata", settle, { once: true });
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      showFinalFrame();
      return;
    }

    // Play when the monitor is genuinely in view, once, then never again.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.disconnect();

          video
            .play()
            .then(() => {
              /* A resolved play() is not proof of playback. Safari in Low
                 Power Mode — and other battery savers — accept the call and
                 then stop the video anyway, with no rejection to catch. So
                 check that time actually moved, and fall back if it did not. */
              watchdog = window.setTimeout(() => {
                if (video.paused && video.currentTime === 0) showFinalFrame();
              }, 700);
            })
            .catch(showFinalFrame);
        }
      },
      /* Matched to Reveal's own thresholds, which are known to fire correctly
         on this site. The previous 0.4 asked for 40% of a very tall element,
         which is a harder condition than it looks on a short viewport. */
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    observer.observe(video);

    return () => {
      observer.disconnect();
      window.clearTimeout(watchdog);
    };
  }, []);

  return (
    <div
      className="relative w-full max-w-[400px] mx-auto rounded-[18px] p-3.5"
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
