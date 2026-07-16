"use client";

import { useEffect, useState } from "react";

const LAUNCH = new Date("2026-08-01T00:00:00Z").getTime();

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
 * Launch countdown, light treatment.
 *
 * Restraint is the design: ink numerals on the page's own background, hairline
 * dividers instead of colons, no glow, no boxes, no accent colour. Seconds are
 * deliberately muted — they're the part that manufactures urgency, and urgency
 * reads as cheap. This should look like a stated fact, not a sales timer.
 *
 * Renders "––" until mounted: the server has no clock the client will agree
 * with, so this sidesteps a hydration mismatch. tabular-nums stops the digits
 * jittering the layout every second.
 */
export default function Countdown({ locale }: { locale: string }) {
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

  const units = [
    { value: time?.days, label: labels.days, muted: false },
    { value: time?.hours, label: labels.hours, muted: false },
    { value: time?.minutes, label: labels.minutes, muted: false },
    { value: time?.seconds, label: labels.seconds, muted: true },
  ];

  return (
    <div className="flex items-stretch" role="timer">
      {units.map((unit, i) => (
        <div key={unit.label} className="flex items-stretch">
          {i > 0 && (
            <div
              className="w-px self-stretch mx-4 sm:mx-7"
              style={{ background: "var(--border)" }}
              aria-hidden="true"
            />
          )}
          <div className="text-center min-w-[2.75rem] sm:min-w-[3.5rem]">
            <div
              className="font-display leading-none tabular-nums"
              style={{
                color: unit.muted ? "var(--text-faint)" : "var(--text)",
                fontSize: "clamp(1.9rem, 4vw, 2.9rem)",
              }}
            >
              {time === null ? "––" : String(unit.value).padStart(2, "0")}
            </div>
            <div
              className="text-[0.58rem] tracking-[0.28em] uppercase mt-2.5"
              style={{ color: "var(--text-faint)" }}
            >
              {unit.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
