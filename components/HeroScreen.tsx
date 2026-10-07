"use client";

import { useEffect, useRef, useState } from "react";

/* ---------------------------------------------------------------------------
   The hero's portrait screen: the TCT mark and the Project KI 06 film, taking
   turns (Mario, 7 Oct 2026).

   ONE MARK CYCLE, THEN THE FILM, THEN THE MARK AGAIN. The mark's pull-back is
   an 8s CSS loop (.tct-mark in globals.css); the screen lets it run once, cross-
   fades to the film, and when the film ends fades back and REMOUNTS the mark,
   so its animation starts from the top instead of joining a loop mid-way.

   THE CARD IS 9:16 BECAUSE THE FILM IS. At the old 3:4 the film lost the base
   of the hookah and, on its closing card, the TACTICAL HB wordmark. The mark is
   drawn, so it fits any shape.

   NEVER A BLANK SCREEN. The film is muted and inline, which every browser lets
   autoplay — except Safari in Low Power Mode, which refuses even that. If
   play() is refused the screen simply stays on the mark and keeps looping it.
   Reduced motion gets the still mark and never the film.

   THE FILM LOADS LATE. preload="none" until the mark is halfway through its
   first cycle, so the first paint of the home page is not waiting on 3 MB.
--------------------------------------------------------------------------- */

const MARK_MS = 8000; // one full .tct-mark cycle
const FADE_MS = 700;

export default function HeroScreen() {
  const [phase, setPhase] = useState<"mark" | "film">("mark");
  const [markKey, setMarkKey] = useState(0);
  const [filmOk, setFilmOk] = useState(true);
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (phase !== "mark" || !filmOk) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const v = video.current;
    const warm = window.setTimeout(() => {
      if (v && v.preload !== "auto") {
        v.preload = "auto";
        v.load();
      }
    }, MARK_MS / 2);
    const go = window.setTimeout(() => {
      if (!v) return;
      v.currentTime = 0;
      /* Fade in straight away: until the first frame decodes the poster —
         which IS the first frame — stands in, so nothing of the opening is
         played unseen behind the mark. */
      setPhase("film");
      v.play().catch(() => {
        // Low Power Mode or similar: back to the mark, and stay there.
        setFilmOk(false);
        setPhase("mark");
      });
    }, MARK_MS);
    return () => {
      window.clearTimeout(warm);
      window.clearTimeout(go);
    };
  }, [phase, markKey, filmOk]);

  const backToMark = () => {
    setPhase("mark");
    // Remount after the fade-out so the pull-back starts from its first frame.
    window.setTimeout(() => setMarkKey((k) => k + 1), FADE_MS);
  };

  return (
    <div
      className="hero-screen relative w-full max-w-[300px] md:max-w-[360px] mx-auto aspect-[9/16] rounded-[20px] overflow-hidden"
      style={{ background: "#000000" }}
    >
      <div
        className="absolute inset-0 grid place-items-center transition-opacity ease-out"
        style={{ opacity: phase === "mark" ? 1 : 0, transitionDuration: `${FADE_MS}ms` }}
        aria-hidden="true"
      >
        <div key={markKey} className="tct-mark" />
      </div>
      <video
        ref={video}
        className="absolute inset-0 w-full h-full object-cover transition-opacity ease-out"
        style={{ opacity: phase === "film" ? 1 : 0, transitionDuration: `${FADE_MS}ms` }}
        src="/videos/project-ki-06-film.mp4"
        poster="/videos/project-ki-06-film-poster.jpg"
        muted
        playsInline
        preload="none"
        aria-hidden="true"
        tabIndex={-1}
        onEnded={backToMark}
      />
    </div>
  );
}
