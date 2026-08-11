"use client";

import { useEffect, useState } from "react";

/* 20 September 2026, set on 11 August 2026 (previously the 10th). UTC on
   purpose: the date is a fixed instant worldwide, not midnight in whichever
   zone the reader is in.

   THIS CONSTANT IS THE LAUNCH DATE FOR THE WHOLE SITE. Two other things must
   agree with it and neither is imported from here, so they have to be checked
   by hand:

     · flagship.eyebrow in messages/{en,uk}.json names the launch MONTH and
       sits directly above this timer — move this into October and the page
       contradicts itself in the same eyeful.
     · the 12-month strategy document's revenue phasing and teaser calendar.

   A date that lives in three places drifts. If it moves again, grep for
   "2026-09" and fix every hit in the same commit. */
const LAUNCH = new Date("2026-09-20T00:00:00Z").getTime();

type TimeLeft = { days: number; hours: number; minutes: number; seconds: number };

function getTimeLeft(): TimeLeft {
  const diff = Math.max(0, LAUNCH - Date.now());
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff / 3600000) % 24),
    minutes: Math.floor((diff / 60000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

/**
 * Launch countdown, on either ground.
 *
 * Restraint is the design: numerals on the page's own background, hairline
 * dividers instead of colons, no glow, no boxes. This should look like a stated
 * fact, not a sales timer.
 *
 * Days carry the brand accent; seconds stay muted, because seconds are what
 * manufactures urgency and urgency reads as cheap. The accent went on the
 * seconds briefly and came straight back off — on the page it read as a colour
 * that would not sit still, which is the argument for putting it where it now
 * is: days change once a day and are the number the section is actually about.
 *
 * Renders "––" until mounted: the server has no clock the client will agree
 * with, so this sidesteps a hydration mismatch. tabular-nums stops the digits
 * jittering the layout every second.
 */
export default function Countdown({
  locale,
  tone = "light",
}: {
  locale: string;
  /**
   * Which ground it is standing on.
   *
   * The colours below are theme tokens tuned for the storefront's off-white —
   * --text is near-black ink and --accent-ink is the deep orange that only
   * clears contrast on a light surface. Dropped onto the flagship file's
   * near-black, that set renders the digits almost invisible and the accent
   * unreadable. "dark" swaps in the bright accent and light greys instead,
   * which is the same pairing the rest of the dark chrome uses.
   *
   * A prop rather than a CSS override, because the component genuinely has
   * two correct appearances now and a class that has to be remembered at
   * every call site is the version that gets forgotten at the next one.
   */
  tone?: "light" | "dark";
}) {
  const [time, setTime] = useState<TimeLeft | null>(null);

  useEffect(() => {
    setTime(getTimeLeft());
    const id = setInterval(() => setTime(getTimeLeft()), 1000);
    return () => clearInterval(id);
  }, []);

  const labels =
    locale === "uk"
      ? { days: "Днів", hours: "Годин", minutes: "Хвилин", seconds: "Секунд" }
      : { days: "Days", hours: "Hours", minutes: "Minutes", seconds: "Seconds" };

  /* Days carry the accent — the figure that actually says something, and one
     that changes once a day rather than flickering. Seconds stay faint,
     because seconds are what manufactures urgency and urgency reads as cheap.

     ON LIGHT, --accent-ink RATHER THAN --accent: the bright orange lands
     around 2.3:1 on the page's off-white and fails even the relaxed bar for
     large text, while the deep tone clears 4.9:1. On dark the argument runs
     the other way and the bright accent is the one that carries. */
  const dark = tone === "dark";
  const c = {
    lead: dark ? "var(--accent)" : "var(--accent-ink)",
    body: dark ? "#f4f3f0" : "var(--text)",
    faint: dark ? "rgba(255,255,255,0.35)" : "var(--text-faint)",
    rule: dark ? "rgba(255,255,255,0.15)" : "var(--border)",
  };

  const units = [
    { value: time?.days, label: labels.days, color: c.lead },
    { value: time?.hours, label: labels.hours, color: c.body },
    { value: time?.minutes, label: labels.minutes, color: c.body },
    { value: time?.seconds, label: labels.seconds, color: c.faint },
  ];

  return (
    <div className="flex items-stretch" role="timer">
      {units.map((unit, i) => (
        <div key={unit.label} className="flex items-stretch">
          {i > 0 && (
            <div
              className="w-px self-stretch mx-4 sm:mx-7"
              style={{ background: c.rule }}
              aria-hidden="true"
            />
          )}
          <div className="text-center min-w-[2.75rem] sm:min-w-[3.5rem]">
            <div
              className="font-display leading-none tabular-nums"
              style={{
                color: unit.color,
                fontSize: "clamp(1.9rem, 4vw, 2.9rem)",
              }}
            >
              {time === null ? "––" : String(unit.value).padStart(2, "0")}
            </div>
            <div
              className="text-[0.58rem] tracking-[0.28em] uppercase mt-2.5"
              style={{ color: c.faint }}
            >
              {unit.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
