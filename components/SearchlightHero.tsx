"use client";

import { useEffect, useRef, useState } from "react";
import { t } from "@/lib/i18n-text";

/* ---------------------------------------------------------------------------
   The searchlight film, in the homepage's wide black stage.

   Asset: /videos/searchlight-hero.mp4 — 1920x1080, 12s, silent (no audio track
   at all, so there is nothing to unmute and no reason to offer the control).

   A beam sweeps across black and finds each product in turn — heat device,
   bowl, wind cover, then the Incoming slot as a redacted panel — and resolves
   on the wordmark. It opens on pure black and ends on pure black, which is why
   the loop needs no crossfade: the seam is black meeting black.

   IT LOOPS NATIVELY, which is the one place this differs from the field monitor
   next to it. That one holds its closing frame for a beat because its ending is
   a lockup worth reading; this one dissolves back to black on its own, so the
   native loop attribute already produces the intended rhythm and a scripted
   restart would only add a stutter.

   COVER, NOT CONTAIN — and the blurred backdrop that used to sit behind is
   gone with it. The previous occupant of this stage was a 576x1024 PORTRAIT
   clip letterboxed into a 16:9 frame, and the wide black gaps either side were
   filled by painting a second copy of the same video behind it, scaled and
   blurred. This source is natively 16:9 in a 16:9 stage, so it fills edge to
   edge with nothing cropped and nothing to disguise, and the page decodes one
   video instead of two.

   PLAYBACK IS TIED TO VISIBILITY, NOT TO THE AUTOPLAY ATTRIBUTE. The stage
   begins below the fold, under a min-h-screen hero, and Safari suspends video
   that starts off-screen without resuming it on scroll — which lands the
   visitor on a parked film with a play button drawn over it. Starting when the
   stage is actually reached avoids that, and asks the browser's permission at
   the moment it is most willing to grant it. Scrolling away pauses it rather
   than letting it spin unseen.
--------------------------------------------------------------------------- */

export default function SearchlightHero({ locale }: { locale: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  /* THE FALLBACK IS A REAL <img>, NOT THE POSTER ATTRIBUTE. A poster assigned
     from script after loading has begun is honoured by Chromium and ignored by
     Safari, so a refusal there would fall through to an empty black rectangle.
     An <img> renders in every browser and answers to no media policy.

     It holds the film's END CARD, so it must never be the opening image — the
     film opens on black, and black is what the stage is already painted. It
     appears only when the film will not or must not run. */
  const [showStill, setShowStill] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const fallBackToStill = () => setShowStill(true);

    /* Reduced motion never plays. Here the end card is the INTENDED image
       rather than a failure state — the alternative, the film's own first
       frame, is pure black and would leave the stage looking switched off. */
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      video.pause();
      fallBackToStill();
      return;
    }

    let inView = false;
    let stall = 0;

    const start = () => {
      /* Arm the watchdog before anything that can throw, so no failure path
         can skip the fallback. */
      window.clearTimeout(stall);
      stall = window.setTimeout(() => {
        /* Tell REFUSED apart from still-loading. Data buffered and the clock
           still at zero means playback was declined. No data yet just means we
           are early, and the canplay handler below will start it — showing the
           end card there would give the ending away on a slow connection. */
        if (video.paused && video.currentTime === 0 && video.readyState >= 2) {
          fallBackToStill();
        }
      }, 1800);

      video.play().catch(fallBackToStill);
    };

    /* If the observer fired before a byte had arrived, that play() had nothing
       to work with. Start the moment there is something to play, or a cold load
       silently spends its only attempt. */
    const onCanPlay = () => {
      if (inView && video.paused) video.play().catch(fallBackToStill);
    };

    /* Anything actually playing means the still has no business being there. */
    const onPlaying = () => setShowStill(false);

    /* SAFARI WANTS A GESTURE. Muted autoplay is normally allowed, but Low Power
       Mode withdraws that and refuses every scripted play() until the page has
       been interacted with. Retry once on the first real interaction anywhere;
       if playback is already running this does nothing. */
    const onFirstGesture = () => {
      if (inView && video.paused) video.play().catch(() => {});
    };
    const GESTURES = ["pointerdown", "touchstart", "keydown"] as const;
    GESTURES.forEach((g) =>
      document.addEventListener(g, onFirstGesture, { once: true, passive: true })
    );

    /* Last resort for a film that never becomes playable at all — a dead black
       panel must not outlive this. */
    const backstop = window.setTimeout(() => {
      if (video.paused && video.currentTime === 0) fallBackToStill();
    }, 8000);

    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        if (inView) start();
        else {
          video.pause();
          window.clearTimeout(stall);
          window.clearTimeout(backstop);
        }
      },
      /* Low, so it fires as the stage is reached rather than once it dominates
         the viewport — on a short screen a 16:9 panel this wide never will. */
      { threshold: 0.1 }
    );

    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("playing", onPlaying);
    observer.observe(video);

    return () => {
      observer.disconnect();
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("playing", onPlaying);
      GESTURES.forEach((g) => document.removeEventListener(g, onFirstGesture));
      window.clearTimeout(stall);
      window.clearTimeout(backstop);
    };
  }, []);

  return (
    /* The stage itself, unchanged from what it replaced: capped at 6xl with air
       around it so the one dark block on the page reads as a deliberate object
       rather than a full-bleed slab, 20px corners, and a black bed so the
       letterbox-free film has nothing to reveal at its edges. */
    <div
      className="max-w-6xl mx-auto relative overflow-hidden rounded-[20px] aspect-video"
      style={{ background: "#000000" }}
    >
      {/* NO poster attribute, deliberately. It would be the end card, which as
          an opening image gives the ending away, and Safari ignores one set
          from script in any case. The <img> below is the fallback instead. */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover block"
        style={{ objectPosition: "center" }}
        src="/videos/searchlight-hero.mp4"
        loop
        muted
        playsInline
        preload="metadata"
        aria-label={t(locale, { uk: "Промо-ролик Tactical HB", en: "Tactical HB promo film", ja: "Tactical HB のプロモーション映像" })}
      />

      {/* The still. Same fit and position as the film, so a swap to live
          playback shifts nothing.
          eslint-disable-next-line @next/next/no-img-element: next/image would
          add a loader and layout machinery for one fixed local still already
          sized to this box. */}
      {showStill && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/images/searchlight-hero-poster.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover block"
          style={{ objectPosition: "center" }}
        />
      )}
    </div>
  );
}
