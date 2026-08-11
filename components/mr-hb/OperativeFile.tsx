"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

/* ---------------------------------------------------------------------------
   Mr HB — the operative file.

   SIX STATES, ONE CONTROL EACH. Envelope → letter → bay → bench → case closed
   → case open. Nothing on screen competes: every beat offers exactly one thing
   to press, and only the last one is filled orange. That restraint is the
   design — a second bright button anywhere would turn a document into a
   landing page.

   THE ENVELOPE AND THE LETTER ARE DRAWN, NOT PHOTOGRAPHED. Both are flat
   shapes, a wax seal and some type, so they are CSS: no asset to download, no
   text baked into a picture that a Ukrainian reader could not read. Only the
   four chapters are photographs, and those carry no words at all.

   MOTION IS A CROSSFADE AND NOTHING ELSE, with one exception: opening the
   case. Everywhere else the stills are stacked and their opacity swapped on
   --motion-base, so advancing reads as one frame replacing another rather than
   a slide or a wipe.

   THE CASE GETS WEIGHT BECAUSE IT IS THE PAYOFF. Closed → open runs a longer
   crossfade with a small scale settle under it — 1.0 out to 1.02 and back —
   so the lid reads as having mass rather than the picture simply changing.
   620ms end to end, inside the brief's 450–700 and well under its 900 cap.
   No bounce, no overshoot past the settle, no colour wash: the accent stays on
   the seal, the CTA and the step dots where it already lives.

   Under prefers-reduced-motion the opening phase is never entered at all —
   the beat flips straight to open and the token-driven crossfade is already
   ~0ms — so there is nothing to sit through and no media query here to forget.

   NO SCROLL HIJACKING, no swipe gestures, no keyboard traps. It is buttons and
   links, so it works with a keyboard and a screen reader by construction.
--------------------------------------------------------------------------- */

type Beat = 0 | 1 | 2 | 3 | 4 | 5;

/* The case-open motion, in two moves.
   "lift"   the panel swells slightly while the open frame fades up
   "settle" it comes back to rest as the rail copy arrives
   Idle is every other moment, when the shared --motion-base governs. */
type Phase = "idle" | "lift" | "settle";
const LIFT_MS = 240;
const SETTLE_MS = 380;
const OPEN_TOTAL_MS = LIFT_MS + SETTLE_MS; // 620 — the brief's cap is 900

/** The four photographed chapters, in order, mapped to their beat. */
const CHAPTERS: Record<number, { src: string; altKey: string }> = {
  2: { src: "/mr-hb/chapters/bay.webp", altKey: "b1_alt" },
  3: { src: "/mr-hb/chapters/bench.webp", altKey: "b2_alt" },
  4: { src: "/mr-hb/chapters/case-closed.webp", altKey: "b3_alt" },
  5: { src: "/mr-hb/chapters/case-open.webp", altKey: "b4_alt" },
};

const INK = "#0a0b0d";
const RAIL = "#101215";
const ACCENT = "#F48140";

export default function OperativeFile({ locale }: { locale: string }) {
  const t = useTranslations("mrhb");
  const [beat, setBeat] = useState<Beat>(0);
  const [phase, setPhase] = useState<Phase>("idle");
  /* Timer handles, so a component unmounting mid-open leaves nothing behind. */
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  /**
   * Open the case.
   *
   * THE DOUBLE-CLICK GUARD IS THE FIRST LINE, not an afterthought: a second
   * press while the first is running would queue another pair of timers and
   * leave the panel mid-scale. One press, one animation.
   *
   * REDUCED MOTION NEVER ENTERS THE PHASES. It flips the beat and returns, so
   * the crossfade runs at the ~0ms the tokens already impose and the copy
   * appears with it. Nothing is animated and nothing is waited for.
   */
  const openCase = () => {
    if (beat !== 4 || phase !== "idle") return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduce) {
      setBeat(5);
      return;
    }

    // The frame starts changing on the same tick as the press — the swell is
    // under the crossfade, not before it, so the click has no dead time.
    setPhase("lift");
    setBeat(5);
    timers.current.push(
      window.setTimeout(() => setPhase("settle"), LIFT_MS),
      window.setTimeout(() => setPhase("idle"), OPEN_TOTAL_MS)
    );
  };

  const opening = phase !== "idle";
  const other = locale === "uk" ? "en" : "uk";
  const isChapter = beat >= 2;
  /* 01, 02, 03 — the case is one file with two faces, so the closed and open
     beats share step three rather than inventing a fourth. */
  const step = beat <= 2 ? 1 : beat === 3 ? 2 : 3;

  const beatCopy = {
    2: { label: "b1_label", head: "b1_head", support: "b1_support", cta: "b1_cta" },
    3: { label: "b2_label", head: "b2_head", support: "b2_support", cta: "b2_cta" },
    4: { label: "b3_label", head: "b3_head", support: "b3_support", cta: "b3_cta" },
    5: { label: "b4_label", head: "b4_head", support: "b4_support", cta: "b4_cta" },
  }[beat as 2 | 3 | 4 | 5];

  const serif = "var(--font-file-serif), Georgia, serif";
  const mono = "ui-monospace, SFMono-Regular, Menlo, monospace";

  /* One outline pill, used by every advancing control. */
  const outlineBtn: React.CSSProperties = {
    border: "1px solid rgba(255,255,255,0.25)",
    color: "#f4f3f0",
    background: "transparent",
    transition: "border-color var(--motion-base) var(--ease-out), background var(--motion-base) var(--ease-out)",
  };

  return (
    <div className="flex flex-col" style={{ minHeight: "100dvh", background: INK, color: "#f4f3f0" }}>
      {/* ---- Header: mark home, file name, locale, and the way out ---- */}
      <header
        className="shrink-0 flex items-center justify-between gap-4 px-5 sm:px-8"
        style={{ height: 60, borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <Link href={`/${locale}`} className="flex items-center gap-3 transition-opacity hover:opacity-70">
          {/* tct-logo.svg is white artwork, which is exactly right on this ground. */}
          <img src="/tct-logo.svg" alt="" aria-hidden="true" className="w-6 h-6" />
          <span className="text-[13px] font-semibold tracking-[0.18em] uppercase">Tactical HB</span>
        </Link>

        <div className="flex items-center gap-4 sm:gap-7">
          <span
            className="hidden md:inline text-[11px] tracking-[0.22em] uppercase"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            {t("header")}
          </span>
          <span className="hidden sm:flex items-center gap-1.5 text-[11px] tracking-[0.14em] uppercase">
            <span style={{ color: locale === "en" ? "#f4f3f0" : "rgba(255,255,255,0.35)" }}>EN</span>
            <span style={{ color: "rgba(255,255,255,0.2)" }}>/</span>
            <Link href={`/${other}/mr-hb`} style={{ color: locale === "uk" ? "#f4f3f0" : "rgba(255,255,255,0.35)" }}
              className="transition-opacity hover:opacity-70">UK</Link>
          </span>
          {/* Skip is a real exit, not a state change — it leaves for the shop. */}
          <Link
            href={`/${locale}/products`}
            className="text-[11px] tracking-[0.18em] uppercase transition-opacity hover:opacity-70"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            {t("skip")}
          </Link>
        </div>
      </header>

      {/* ================= 0 · THE ENVELOPE ================= */}
      {beat === 0 && (
        <main className="flex-1 flex flex-col items-center justify-center px-5 py-12">
          <div
            className="relative w-full"
            style={{ maxWidth: 620, aspectRatio: "1.55 / 1", background: "linear-gradient(160deg,#20232a,#15171c)", borderRadius: 4, boxShadow: "0 40px 90px -30px rgba(0,0,0,0.8)" }}
          >
            {/* THE FLAP IS A CLIPPED TRIANGLE, not crossed gradients. Two
                diagonal gradients across one box draw an X — both diagonals,
                corner to corner — where the envelope needs a V: the flap folds
                down to a point, and the seal sits on that point. clip-path
                gives the shape itself, so the edge is the shape's edge and
                lands exactly where the fold is. */}
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0"
              style={{
                height: "58%",
                background: "linear-gradient(170deg,#252931,#1a1d23)",
                clipPath: "polygon(0 0, 100% 0, 50% 100%)",
              }}
            />
            {/* A hairline along the fold, so the flap reads against a body of
                nearly the same value. */}
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 pointer-events-none"
              style={{
                height: "58%",
                background:
                  "linear-gradient(to bottom right, transparent calc(50% - 0.5px), rgba(255,255,255,0.07) 50%, transparent calc(50% + 0.5px))",
                clipPath: "polygon(0 0, 50% 100%, 0 100%)",
              }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 pointer-events-none"
              style={{
                height: "58%",
                background:
                  "linear-gradient(to bottom left, transparent calc(50% - 0.5px), rgba(255,255,255,0.07) 50%, transparent calc(50% + 0.5px))",
                clipPath: "polygon(100% 0, 100% 100%, 50% 100%)",
              }}
            />
            {/* Wax seal */}
            <div
              aria-hidden="true"
              className="absolute left-1/2 grid place-items-center rounded-full"
              style={{
                top: "50%", transform: "translate(-50%,-50%)", width: 74, height: 74,
                background: `radial-gradient(circle at 35% 30%, #ffa268, ${ACCENT} 55%, #c85f26)`,
                boxShadow: "0 6px 18px rgba(0,0,0,0.55)",
                fontFamily: mono, fontSize: 15, fontWeight: 700, color: "#3a1e0c", letterSpacing: "0.04em",
              }}
            >
              TCT
            </div>

            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-6 p-7 sm:p-9">
              <div>
                <div className="text-[26px] sm:text-[30px] font-semibold tracking-[0.22em]">{t("env_name")}</div>
                <div className="text-[11px] tracking-[0.2em] uppercase mt-1" style={{ color: "rgba(255,255,255,0.35)", fontFamily: mono }}>
                  {t("env_ref")}
                </div>
              </div>
              <div className="text-right shrink-0" style={{ fontFamily: mono }}>
                <div className="text-[10px] sm:text-[11px] tracking-[0.18em] uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {t("env_clearance")}
                </div>
                <div className="text-[10px] sm:text-[11px] tracking-[0.14em] mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>
                  {t("coords")}
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setBeat(1)}
            className="mt-11 flex items-center gap-4 text-[12px] tracking-[0.28em] uppercase transition-opacity hover:opacity-75"
          >
            <span aria-hidden="true" style={{ display: "block", width: 34, height: 1, background: ACCENT }} />
            {t("env_open")}
            <span aria-hidden="true" style={{ display: "block", width: 34, height: 1, background: ACCENT }} />
          </button>
        </main>
      )}

      {/* ================= 1 · THE LETTER ================= */}
      {beat === 1 && (
        <main className="flex-1 flex flex-col items-center justify-center px-5 py-12">
          <div
            className="w-full px-7 py-8 sm:px-10 sm:py-10"
            style={{ maxWidth: 620, background: "#f2ece1", color: "#1a1915", borderRadius: 3, boxShadow: "0 40px 90px -30px rgba(0,0,0,0.8)" }}
          >
            <div className="flex items-center justify-between text-[11px] tracking-[0.2em] uppercase" style={{ fontFamily: mono, color: "#6b6862" }}>
              <span>{t("letter_from")}</span>
              <span>{t("letter_ref")}</span>
            </div>
            <div className="h-px my-4" style={{ background: ACCENT }} />

            <h1 className="text-[24px] sm:text-[28px] font-bold tracking-[0.02em] mb-3">{t("letter_subject")}</h1>

            <div className="flex items-center gap-2.5 mb-6 text-[12px] tracking-[0.14em] uppercase" style={{ fontFamily: mono }}>
              <span aria-hidden="true" style={{ width: 9, height: 9, background: ACCENT, display: "block" }} />
              <span style={{ color: "#6b6862" }}>{t("letter_status_label")}</span>
              <span style={{ color: "#1a1915", fontWeight: 600 }}>{t("letter_status")}</span>
            </div>

            <p className="text-[16px] leading-relaxed" style={{ fontFamily: serif }}>{t("letter_body")}</p>
          </div>

          <button
            type="button"
            onClick={() => setBeat(2)}
            style={outlineBtn}
            className="mt-10 h-12 px-9 rounded-full text-[12px] font-semibold tracking-[0.2em] uppercase hover:bg-white/5"
          >
            {t("letter_cta")}
          </button>
        </main>
      )}

      {/* ================= 2–5 · THE CHAPTERS ================= */}
      {isChapter && beatCopy && (
        <main className="flex-1 flex flex-col lg:flex-row min-h-0">
          {/* The still. All four are stacked and crossfaded so advancing swaps
              a frame rather than reloading one — and so the next chapter is
              already decoded when it is asked for. */}
          {/* overflow-hidden matters: the swell scales the frame past its own
              edges, and without clipping it would bleed over the rail seam. */}
          <div
            className="relative w-full lg:w-[59%] shrink-0 overflow-hidden"
            style={{ background: "#000", aspectRatio: "3 / 2" }}
          >
            {Object.entries(CHAPTERS).map(([b, ch]) => {
              const active = Number(b) === beat;
              /* Only the open frame swells, and only while it is arriving. */
              const swelling = opening && Number(b) === 5;
              return (
                <Image
                  key={ch.src}
                  src={ch.src}
                  alt={active ? t(ch.altKey) : ""}
                  fill
                  priority={Number(b) === 2}
                  /* EAGER, ALL FOUR, AND THIS IS THE PRELOAD THE BRIEF ASKS FOR.
                     Next lazy-loads by default, and measuring showed that the
                     three stacked behind the visible one never loaded at all —
                     not even the frame the user was looking at on the
                     case-closed beat. Pressing Open the case would then
                     crossfade to an empty box, which is the exact flash this
                     motion exists to avoid.

                     The whole set is 244 KB of WebP on a page whose entire
                     content is these four frames, and every visitor who walks
                     the file sees all four. Fetching them up front costs one
                     small burst on a page with no other images and buys a
                     guaranteed-clean transition at every beat, not just this
                     one. */
                  loading="eager"
                  sizes="(max-width: 1024px) 100vw, 59vw"
                  className="object-cover"
                  style={{
                    opacity: active ? 1 : 0,
                    /* transform and opacity only — nothing here touches layout. */
                    transform: swelling && phase === "lift" ? "scale(1.02)" : "scale(1)",
                    transformOrigin: "center",
                    willChange: opening ? "transform, opacity" : undefined,
                    transition: opening
                      ? `opacity ${LIFT_MS + 180}ms var(--ease-out), transform ${
                          phase === "lift" ? LIFT_MS : SETTLE_MS
                        }ms var(--ease-out)`
                      : "opacity var(--motion-base) var(--ease-out)",
                    pointerEvents: "none",
                  }}
                />
              );
            })}
          </div>

          {/* The rail. */}
          <div
            className="flex-1 flex flex-col justify-center px-6 sm:px-10 lg:px-14 py-10 lg:py-8"
            style={{ background: RAIL }}
          >
            {/* THE COPY ARRIVES AFTER THE LID, not with it. During the lift it
                is held at zero so the eye stays on the case; it fades up as the
                frame settles, which is also what keeps the final CTA from
                appearing before the case is actually open. */}
            <div
              className="max-w-xl"
              style={{
                opacity: phase === "lift" ? 0 : 1,
                transform: phase === "lift" ? "translateY(6px)" : "none",
                transition: opening
                  ? `opacity ${SETTLE_MS - 80}ms var(--ease-out) 60ms, transform ${SETTLE_MS - 80}ms var(--ease-out) 60ms`
                  : undefined,
              }}
            >
              <div className="flex items-center gap-3 mb-6">
                <span aria-hidden="true" style={{ width: 9, height: 9, background: ACCENT, display: "block" }} />
                <span className="text-[11px] sm:text-[12px] tracking-[0.24em] uppercase font-semibold">
                  {t(beatCopy.label)}
                </span>
              </div>

              <h1
                /* Sized off the mockup, not by eye: its headline measures
                   ~38px of line-height at 1440, so ~33px of type. At 42 the
                   copy wrapped to three lines where the design takes two. */
                className="text-[27px] sm:text-[30px] lg:text-[33px] leading-[1.16] mb-6"
                style={{ fontFamily: serif, fontWeight: 400 }}
              >
                {t(beatCopy.head)}
              </h1>

              <p className="text-[14px] sm:text-[15px] leading-relaxed mb-9" style={{ color: "rgba(255,255,255,0.5)" }}>
                {t(beatCopy.support)}
              </p>

              {/* THE ONLY FILLED BUTTON ON THE WHOLE PAGE is the last one. */}
              {beat < 5 ? (
                <button
                  type="button"
                  /* Beat 4 is the case; opening it is the one advance with a
                     motion of its own, and its own guard against a second press. */
                  onClick={beat === 4 ? openCase : () => setBeat((beat + 1) as Beat)}
                  disabled={phase !== "idle"}
                  style={outlineBtn}
                  className="w-full sm:w-auto h-12 px-9 rounded-full text-[12px] font-semibold tracking-[0.2em] uppercase hover:bg-white/5"
                >
                  {t(beatCopy.cta)}
                </button>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-8">
                  <Link
                    href={`/${locale}/products`}
                    className="inline-flex h-12 px-9 rounded-full items-center justify-center text-[12px] font-semibold tracking-[0.2em] uppercase whitespace-nowrap transition-opacity hover:opacity-85"
                    style={{ background: ACCENT, color: "#1a1005" }}
                  >
                    {t(beatCopy.cta)}
                  </Link>
                  <Link
                    href={`/${locale}/setup`}
                    className="text-[13px] underline underline-offset-4 transition-opacity hover:opacity-70"
                    style={{ color: "rgba(255,255,255,0.55)" }}
                  >
                    {t("b4_secondary")}
                  </Link>
                </div>
              )}
            </div>

            {/* Step index + the coordinates, pinned to the foot of the rail. */}
            <div className="flex items-center justify-between gap-6 mt-12 lg:mt-auto lg:pt-14">
              <ol className="flex items-center gap-3" aria-label={`${t("step")} ${step} ${t("of")} 3`}>
                {[1, 2, 3].map((n) => (
                  <li key={n} className="flex items-center gap-3">
                    {n > 1 && <span aria-hidden="true" style={{ width: 26, height: 1, background: "rgba(255,255,255,0.15)" }} />}
                    <span className="flex items-center gap-2">
                      {n === step && <span aria-hidden="true" style={{ width: 7, height: 7, background: ACCENT, display: "block" }} />}
                      <span
                        className="text-[12px] tabular-nums"
                        style={{ fontFamily: mono, color: n === step ? "#f4f3f0" : "rgba(255,255,255,0.3)", fontWeight: n === step ? 700 : 400 }}
                        aria-current={n === step ? "step" : undefined}
                      >
                        {String(n).padStart(2, "0")}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
              <span className="text-[11px] tracking-[0.14em] hidden sm:block" style={{ fontFamily: mono, color: "rgba(255,255,255,0.22)" }}>
                {t("coords")}
              </span>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
