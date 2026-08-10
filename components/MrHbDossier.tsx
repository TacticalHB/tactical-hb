"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/* ---------------------------------------------------------------------------
   The Mr HB dossier — a sealed envelope that opens into his file.

   THREE BEATS, NOT FOUR. Closed → seal broken → the letter, flat. The pack also
   ships a frame of the letter half out of the envelope, and it is deliberately
   unused: the text is clipped by the pocket in that frame, so it can only ever
   be a glimpse of something unreadable. Since the seal-break already sells the
   act of opening, the clipped frame buys nothing and is left on the shelf.

   THE READING SURFACE IS ALWAYS letter-flat, per locale. /en never shows the
   Ukrainian letter and /uk never shows the English one — the file is a piece of
   brand writing, and a visitor reading the wrong language is worse than no
   letter at all.

   THE LETTER IS AN IMAGE, so its words are repeated as visually-hidden text.
   Not a fallback nobody sees: it is the only way a screen reader gets the copy
   at all, and the only way the file is searchable.

   Square envelope art rather than the 16:9 cut. The envelope fills 80% of the
   square frame against 56% of the wide one, so on a phone it arrives as an
   envelope rather than a stamp adrift in a letterbox.
--------------------------------------------------------------------------- */

type Stage = "closed" | "breaking" | "letter";

/* ---------------------------------------------------------------------------
   The dossier's words, in one place.

   Both entry points — the tab on the homepage monitor and the strip on About —
   read from here, so the control cannot say one thing in one place and
   something else in the other. The Ukrainian label is sentence case because
   every surface that shows it applies `uppercase`; writing it in caps here
   would double up with the CSS and defeat any future lower-case use.
--------------------------------------------------------------------------- */
export function dossierCopy(uk: boolean) {
  return {
    /* "ВІДКРИТИ СПРАВУ" is a good deal longer than "OPEN FILE", so the tab
       tightens its tracking on Ukrainian rather than growing or wrapping. */
    openFile: uk ? "Відкрити справу" : "Open file",
    tracking: uk ? "0.12em" : "0.22em",
    close: uk ? "Закрити" : "Close",
    /* The way from the modal to the full page. The dossier shows the letter
       and stops; the operative file is the rest of it. */
    fullFile: uk ? "Відкрити повну справу" : "Open the full file",
    title: uk ? "Справа: Mr HB" : "File: Mr HB",
    strip: uk ? "TCT-01 · MR HB · ВНУТРІШНЄ" : "TCT-01 · MR HB · INTERNAL",
  };
}

/** Held between the seal cracking and the letter arriving. */
const BREAK_MS = 520;

export default function MrHbDossier({
  uk,
  open,
  onClose,
}: {
  uk: boolean;
  open: boolean;
  onClose: () => void;
}) {
  const [stage, setStage] = useState<Stage>("closed");
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const reduced = useRef(false);

  useEffect(() => setMounted(true), []);

  /* Reset to a sealed envelope every time it opens — reopening a file that is
     already lying open is not the moment we are trying to sell. Reduced motion
     skips straight to the letter, because the whole sequence IS the motion. */
  useEffect(() => {
    if (!open) return;
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setStage(reduced.current ? "letter" : "closed");
  }, [open]);

  const reveal = useCallback(() => {
    if (stage !== "closed") return;
    if (reduced.current) {
      setStage("letter");
      return;
    }
    setStage("breaking");
    window.setTimeout(() => setStage("letter"), BREAK_MS);
  }, [stage]);

  /* Escape closes; Tab is kept inside the panel. A modal that lets focus walk
     out into the page behind it is a modal only for people using a mouse. */
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = panel.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);

    /* Lock the page behind the modal. The scrollbar's width is replaced as
       padding so the page underneath does not jump sideways as it locks. */
    const { body } = document;
    const prevOverflow = body.style.overflow;
    const prevPad = body.style.paddingRight;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (gap > 0) body.style.paddingRight = `${gap}px`;

    const focusTimer = window.setTimeout(() => closeRef.current?.focus(), 30);

    return () => {
      document.removeEventListener("keydown", onKey);
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPad;
      window.clearTimeout(focusTimer);
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const C = dossierCopy(uk);
  const L = {
    title: C.title,
    openFile: C.openFile,
    close: C.close,
    fullFile: C.fullFile,
    envelopeAlt: uk
      ? "Запечатаний конверт із печаткою TCT"
      : "A sealed envelope bearing the TCT seal",
    letterAlt: uk
      ? "Лист: справа на Mr HB"
      : "Letter: the file on Mr HB",
  };

  /* The letter's words, for screen readers and for search. The image carries
     the same copy, set the way the brand sets it. */
  const body = uk
    ? [
        "Суб'єкт працює на перетині польової дисципліни та виробничої точності. Поки інші ганяються за трендами, він задає стандарт: кожна поверхня, допуск і оздоблення мають заслужити місце під маркою TCT.",
        "Mr HB — тихий авторитет Tactical HB: погляд, що бачить у кальянному спорядженні екіпірування, а не декор. Для тих, хто відчуває вагу, роботу з жаром і те, як річ лягає в руку після сотої сесії.",
        "Він тримає власну планку: менше рішень — і кожне жорсткіше. Точність замість шуму. Суть замість показовості. Те, що проходить під його стандартом, має служити сесіям, а не сезонам: вимогливо, навмисно й завершено лише тоді, коли в користуванні все стає на свої місця.",
        "Справа лишається відкритою. Стандарти не слабшають.",
        "— HB",
      ]
    : [
        "Subject operates at the intersection of field discipline and manufacturing precision. Where others chase trends, he sets the standard: every surface, tolerance, and finish must earn its place under the TCT mark.",
        "Mr HB is the quiet authority behind Tactical HB — the eye that sees hookah equipment as kit, not decoration. Built for those who feel the weight, the heat, and how a piece sits in the hand after the hundredth session.",
        "He holds his own bar: fewer decisions, each one harder. Precision over noise. Substance over show. What passes under his standard is meant to serve sessions, not seasons — exacting, deliberate, and finished only when everything falls into place in use.",
        "File remains open. Standards do not relax.",
        "— HB",
      ];

  const showingLetter = stage === "letter";

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={L.title}
    >
      {/* Backdrop. Near-black and plain — the envelope supplies the atmosphere,
          and a blur here would only fight the artwork's own vignette. */}
      <button
        type="button"
        aria-label={L.close}
        onClick={onClose}
        className="absolute inset-0 cursor-default"
        style={{ background: "rgba(6,6,8,0.93)" }}
        tabIndex={-1}
      />

      <div
        ref={panelRef}
        className="relative w-full max-w-[560px] max-h-full overflow-y-auto overscroll-contain"
      >
        {/* Close. Sits above the art in the corner of the stage. */}
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={L.close}
          className="dossier-close absolute right-0 top-0 z-10 grid place-items-center w-11 h-11 rounded-full"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M3 3 L13 13 M13 3 L3 13"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {!showingLetter ? (
          /* The envelope. The whole thing is the button — a sealed envelope in
             front of you is its own affordance — with the caption naming the
             action for anyone who wants the words. */
          <button
            type="button"
            onClick={reveal}
            className="dossier-envelope block w-full"
            aria-label={L.openFile}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                stage === "breaking"
                  ? "/mr-hb/dossier/dossier-seal-break.webp"
                  : "/mr-hb/dossier/dossier-closed.webp"
              }
              alt={L.envelopeAlt}
              width={1400}
              height={1400}
              className="block w-full h-auto select-none"
              draggable={false}
            />
            <span className="dossier-cue mt-1 flex items-center justify-center gap-3">
              <span className="dossier-rule" aria-hidden="true" />
              <span className="text-[11px] tracking-[0.34em] uppercase">{L.openFile}</span>
              <span className="dossier-rule" aria-hidden="true" />
            </span>
          </button>
        ) : (
          <figure className="m-0 dossier-letter">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={uk ? "/mr-hb/dossier/letter-flat-uk.webp" : "/mr-hb/dossier/letter-flat-en.webp"}
              alt={L.letterAlt}
              width={1400}
              height={1695}
              className="block w-full h-auto rounded-[6px] select-none"
              draggable={false}
            />
            {/* The same words, for anyone the image cannot reach. */}
            <figcaption className="sr-only">
              {body.map((p) => (
                <p key={p.slice(0, 24)}>{p}</p>
              ))}
            </figcaption>

            {/* ONE STEP FURTHER, offered only once the letter has been read —
                the modal keeps doing exactly what it did, and the full file is
                a door at the end of it rather than a competing button. Both
                the homepage monitor and the About panel open this same modal,
                so this single link serves both entry points. */}
            <a
              href={`/${uk ? "uk" : "en"}/mr-hb`}
              className="mt-5 inline-flex items-center gap-3 font-mono text-[10px] font-semibold uppercase tracking-[0.28em] transition-opacity hover:opacity-70"
              style={{ color: "var(--accent)" }}
            >
              <span aria-hidden="true" style={{ display: "block", width: 22, height: 1, background: "var(--accent)" }} />
              {L.fullFile}
            </a>
          </figure>
        )}
      </div>
    </div>,
    document.body
  );
}
