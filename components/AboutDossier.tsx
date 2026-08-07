"use client";

import { useCallback, useRef, useState } from "react";
import MrHbDossier, { dossierCopy } from "./MrHbDossier";

/* ---------------------------------------------------------------------------
   The dossier's second door, on About.

   ONE MODAL, TWO ENTRANCES. This renders a trigger and hands off to the very
   same MrHbDossier the homepage monitor uses — same envelope, same sequence,
   same per-locale letter, same close behaviour. Nothing about the file is
   reimplemented here, so the two entrances cannot drift into two experiences.

   It sits inside the dark panel that was already in the story section, in the
   corner opposite "Ukraine / Premium Craft". That panel is --ink and already
   carries the TCT mark, so the file strip lands on a surface built for it
   rather than needing a new section of its own.
--------------------------------------------------------------------------- */

export default function AboutDossier({ uk }: { uk: boolean }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => {
    setOpen(false);
    btnRef.current?.focus();
  }, []);
  const copy = dossierCopy(uk);

  return (
    <>
      <div className="absolute bottom-8 right-8 text-right">
        <div
          className="font-mono text-[9px] tracking-[0.18em] uppercase mb-2"
          style={{ color: "#6a7078" }}
        >
          {copy.strip}
        </div>
        <button
          ref={btnRef}
          type="button"
          onClick={() => setOpen(true)}
          className="dossier-open-link inline-flex items-center gap-2.5 font-mono text-[10px] font-semibold uppercase whitespace-nowrap"
          style={{ letterSpacing: copy.tracking }}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <span className="dossier-tab-rule" aria-hidden="true" />
          {copy.openFile}
        </button>
      </div>

      <MrHbDossier uk={uk} open={open} onClose={close} />
    </>
  );
}
