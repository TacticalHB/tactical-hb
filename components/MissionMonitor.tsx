"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { t } from "@/lib/i18n-text";
import MrHbDossier, { dossierCopy } from "./MrHbDossier";

/* ---------------------------------------------------------------------------
   Mr.HB on a field monitor — the right-hand half of the mission section.

   The animation is presented as a DEVICE, not a video pasted onto the page: a
   dark bezel with screws, a power light, and a caption rail, so the one moving
   thing in a still, light section reads as a screen someone switched on. The
   bezel takes --fog, the same gradient the header and footer are cut from, and
   the shadow is the one .hero-screen uses — the monitor is a new object on the
   page but not a new visual language.

   IT RUNS ON A CYCLE: play through, hold the closing frame for a beat, start
   again. The hold is the point — the animation resolves into the composed
   Mr.HB lockup, and snapping straight back to black threw that away before
   anyone could read it.

   PLAYBACK IS TIED TO VISIBILITY, NOT TO PAGE LOAD, and this is the fix for
   the monitor arriving with a play button on it. The autoplay attribute fires
   the moment the page loads, which is four screens before this section is
   reached; Safari suspends video that is off-screen and does NOT resume it on
   scroll, so the visitor scrolled down to a parked video and had to press
   play. Starting playback when the monitor actually comes into view avoids
   that entirely, and has the side benefit of asking permission at the one
   moment the browser is most willing to grant it — while the element is on
   screen. Scrolling away pauses it again rather than letting it spin unseen.

   Reduced motion is the one case that must not move: nothing is played and the
   video is parked on its closing frame, so the same composition lands with no
   movement rather than the section going empty.

   IT STARTS FROM THE BEGINNING. The animation opens on black, so black is the
   correct opening image and the clip is never pre-empted by a still. There is
   a poster — cut from the animation's own closing frame — but it is a FAILURE
   state, attached only once playback is known to have failed, because a
   browser that refuses video still paints a poster. Setting it up front, which
   is where it began, showed the ending before the beginning.

   SCALE, NOT A CROP. Mr.HB is composed small — measured across the animation
   he never fills more than 61.6% of the frame's width or 39.6% of its height,
   and everything around him is flat black. Scaling the element therefore
   enlarges HIM: there is no border, background or framing detail for anyone to
   see cropped, and at 1.4 no content reaches an edge. Re-rendering the mp4 at
   a larger size would produce the same pixels for a great deal more work.
--------------------------------------------------------------------------- */

export default function MissionMonitor({ locale }: { locale: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  /* The dossier hangs off this device. State lives here rather than inside the
     modal so the tab can hand focus back to itself on close — a modal that
     closes and drops focus at the top of the document loses a keyboard user
     their place on the page. */
  const [dossierOpen, setDossierOpen] = useState(false);
  const tabRef = useRef<HTMLButtonElement>(null);
  const closeDossier = useCallback(() => {
    setDossierOpen(false);
    tabRef.current?.focus();
  }, []);
  const dossier = dossierCopy(locale);

  /* THE FALLBACK IS A REAL <img>, NOT THE POSTER ATTRIBUTE, and that is the
     whole fix for the black screen. A poster assigned from script AFTER the
     element has begun loading is honoured by Chromium and ignored by Safari,
     so every refusal here fell through to nothing and the monitor stayed dead.
     An <img> renders unconditionally in every browser and answers to no media
     policy whatsoever.

     It shows the animation's CLOSING frame, so it must never be the opening
     image — it appears only once playback is known to have failed, and hides
     again the moment anything actually plays. */
  const [showStill, setShowStill] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    /* How long the finished animation sits on its closing frame before running
       again. Long enough to read the lockup, short enough that a visitor who
       looks up still catches movement. */
    const HOLD_MS = 2500;

    const fallBackToPoster = () => setShowStill(true);

    /* Park on the closing frame. Nudged just inside the duration because
       seeking exactly to the end is not obliged to paint anything. */
    const showFinalFrame = () => {
      const settle = () => {
        video.currentTime = Math.max(0, video.duration - 0.05);
      };
      if (video.readyState >= 1) settle();
      else video.addEventListener("loadedmetadata", settle, { once: true });
    };

    /* Reduced motion never plays, so here the closing frame is the intended
       image rather than a fallback — show the still immediately. */
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      fallBackToPoster();
      video.pause();
      showFinalFrame();
      return;
    }

    let restart = 0;
    let stall = 0;
    let inView = false;

    const start = () => {
      /* ARM THE SAFETY NET FIRST. This used to sit at the bottom, after a
         currentTime assignment that can throw, and the throw took the whole
         function with it — no play, no fallback, a black screen for good.
         Nothing below may be able to skip this. */
      window.clearTimeout(stall);
      stall = window.setTimeout(() => {
        /* Distinguish REFUSED from still-loading. With data buffered and the
           clock still at zero, playback was declined and the poster is right.
           With no data yet we are merely early — canPlay below will start it,
           and showing the closing frame here would give the ending away on a
           slow connection, which is the bug this whole file keeps relearning. */
        if (video.paused && video.currentTime === 0 && video.readyState >= 2) {
          fallBackToPoster();
        }
      }, 1800);

      /* Only rewind when there is something to rewind. A video that has never
         played is already at zero, and assigning currentTime before metadata
         exists throws InvalidStateError in Safari — which is precisely how the
         first visit ended up blank while a cached second visit worked. */
      if (video.readyState >= 1 && video.currentTime > 0) {
        try {
          video.currentTime = 0;
        } catch {
          /* Not seekable yet; it will start from the top regardless. */
        }
      }

      video.play().catch(fallBackToPoster);
    };

    /* If the observer fired before a single byte had arrived, the play() above
       had nothing to work with. Start it the moment there is something to
       play — without this, a cold load silently loses its one attempt. */
    const onCanPlay = () => {
      if (inView && video.paused && !video.ended) {
        video.play().catch(fallBackToPoster);
      }
    };

    /* Once anything actually plays, the still has no business being there. */
    const onPlaying = () => setShowStill(false);

    /* SAFARI WANTS A GESTURE. Muted autoplay is normally permitted, but Low
       Power Mode withdraws that and refuses every scripted play() until the
       page has been interacted with — which is exactly why a click through to
       Products and back "fixed" it: the click granted activation the fresh
       load never had. So retry on the first real interaction anywhere on the
       page. Passive and once-only; if playback is already running these do
       nothing at all. */
    const onFirstGesture = () => {
      if (inView && video.paused && !video.ended) {
        video.play().catch(() => {});
      }
    };
    const GESTURES = ["pointerdown", "touchstart", "keydown"] as const;
    GESTURES.forEach((g) =>
      document.addEventListener(g, onFirstGesture, { once: true, passive: true })
    );

    /* Last resort for a video that never becomes playable at all — a dead
       screen must not outlive this. */
    const backstop = window.setTimeout(() => {
      if (video.paused && video.currentTime === 0) fallBackToPoster();
    }, 8000);

    /* The hold. There is deliberately no loop attribute: a native loop restarts
       instantly, which is exactly what we are trying not to do. */
    const onEnded = () => {
      window.clearTimeout(restart);
      restart = window.setTimeout(() => {
        if (inView) start();
      }, HOLD_MS);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        if (inView) {
          /* From the top for the first run and for a clip that finished while
             nobody was looking; a mid-clip pause just resumes where it was.
             Routing the first play through start() is what arms the stall
             watchdog — a bare play() here would skip the poster fallback. */
          if (video.ended || video.currentTime === 0) start();
          else if (video.paused) video.play().catch(fallBackToPoster);
        } else {
          video.pause();
          window.clearTimeout(restart);
          window.clearTimeout(stall);
          window.clearTimeout(backstop);
        }
      },
      /* Low, so it fires as soon as the section is reached rather than once it
         dominates the viewport — the monitor is ~750px tall and a demanding
         threshold is hard to satisfy on a short screen. */
      { threshold: 0.1 }
    );

    video.addEventListener("ended", onEnded);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("playing", onPlaying);
    observer.observe(video);

    return () => {
      observer.disconnect();
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("playing", onPlaying);
      GESTURES.forEach((g) => document.removeEventListener(g, onFirstGesture));
      window.clearTimeout(restart);
      window.clearTimeout(stall);
      window.clearTimeout(backstop);
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
          <span style={{ color: "#8a9097" }}>{` // ${t(locale, { uk: "ЕФІР", en: "LIVE FEED", ja: "ライブ映像" })}`}</span>
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
          it edge to edge — the scale below is the only thing that crops, and it
          crops black rather than Mr.HB. */}
      <div
        className="relative w-full aspect-[9/16] rounded-[6px] overflow-hidden"
        style={{ background: "#000", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }}
      >
        {/* Punch in on the subject. The artwork is composed with a lot of air:
            sampled across the whole animation, the non-black content never
            exceeds 61.6% of the frame's width or 39.6% of its height, so at 1:1
            Mr.HB sits small in a mostly empty rectangle.

            1.59 is where the widest frame's content touches the left edge —
            width is the binding constraint, not height, which has room to about
            2.5. 1.4 takes most of the available gain and still leaves ~6% of
            the frame as margin, which the vignette then softens. Do not chase
            the last 0.19: the measurement comes from a downscaled probe, so the
            true limit is a little tighter than the number suggests.

            Costs no sharpness. Showing 71% of a 1080-wide source across a
            372px screen is still a ~2x downscale, so it stays oversampled even
            on a retina display. */}
        {/* NO poster attribute, deliberately, and it must not come back: it is
            the CLOSING frame, so as a starting image it gives the ending away,
            and Safari ignores a poster assigned from script anyway. The failure
            still is the <img> below instead. */}
        <video
          ref={videoRef}
          className="w-full h-full object-cover block"
          style={{ transform: "scale(1.4)", transformOrigin: "center" }}
          src="/videos/mr-hb-animation.mp4"
          muted
          playsInline
          preload="auto"
          aria-label={t(locale, { uk: "Анімація Mr.HB", en: "Mr.HB animation", ja: "Mr.HB のアニメーション" })}
        />

        {/* The failure still. Same framing as the video — identical object-fit
            and scale — so if it ever swaps to live playback nothing shifts.
            Rendered only when playback has actually failed, and torn down again
            the instant anything plays.
            eslint-disable-next-line @next/next/no-img-element: next/image would
            add a loader and layout machinery for one fixed local still that is
            already sized to this box. */}
        {showStill && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/images/mr-hb-poster.jpg"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover block"
            style={{ transform: "scale(1.4)", transformOrigin: "center" }}
          />
        )}

        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 55%, rgba(0, 0, 0, 0.45))",
          }}
        />
      </div>

      {/* Caption rail. The coordinates are Kharkiv, and they are the same
          figures the Mr HB page prints — one location, stated once, in both
          places. They were briefly 38.8977 N · 77.0365 W, which is the White
          House: fine as set dressing until you notice that a Ukrainian brand's
          instrument panel was quietly reading out Washington DC. Where the
          workshop actually is makes the better story anyway.

          Not localised: a decimal coordinate reads the same in both languages,
          which is also why mrhb.coords in messages/{en,uk}.json holds the
          identical string. Change one, change all three. */}
      <div className="flex items-center justify-between px-1.5 pt-3">
        <span
          className="font-display text-[13px] tracking-[0.24em] uppercase"
          style={{ color: "#c9ccd0" }}
        >
          Mr.HB
        </span>
        <span
          className="font-mono text-[9px] tracking-[0.14em]"
          style={{ color: "#5c6167" }}
        >
          49.9935 N · 36.2304 E
        </span>
      </div>

      {/* The file tab. Hangs off the bottom edge of the bezel, pulled to the
          right — a folder tab sticking out of the device rather than a button
          laid over it. Deliberately below the screen: at mid-height on the
          right edge it would sit level with Mr HB's face, and on a 375px
          screen a side tab has no gutter left to overhang into. */}
      <div className="absolute left-0 right-0 -bottom-[42px] flex justify-end pr-5 pointer-events-none">
        <button
          ref={tabRef}
          type="button"
          onClick={() => setDossierOpen(true)}
          className="dossier-tab pointer-events-auto font-mono text-[10px] font-semibold uppercase whitespace-nowrap"
          style={{ letterSpacing: dossier.tracking }}
          aria-haspopup="dialog"
          aria-expanded={dossierOpen}
        >
          <span className="dossier-tab-rule" aria-hidden="true" />
          {dossier.openFile}
        </button>
      </div>

      <MrHbDossier locale={locale} open={dossierOpen} onClose={closeDossier} />
    </div>
  );
}
