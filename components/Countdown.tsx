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

export default function Countdown({ locale }: { locale: string }) {
  const [time, setTime] = useState<TimeLeft | null>(null);

  useEffect(() => {
    setTime(getTimeLeft());
    const id = setInterval(() => setTime(getTimeLeft()), 1000);
    return () => clearInterval(id);
  }, []);

  const labels =
    locale === "uk"
      ? { days: "Дні", hours: "Год", minutes: "Хв", seconds: "Сек" }
      : { days: "Days", hours: "Hrs", minutes: "Min", seconds: "Sec" };

  const units = [
    { value: time?.days, label: labels.days },
    { value: time?.hours, label: labels.hours },
    { value: time?.minutes, label: labels.minutes },
    { value: time?.seconds, label: labels.seconds },
  ];

  return (
    <div className="flex gap-4 sm:gap-8">
      {units.map((unit, i) => (
        <div key={unit.label} className="flex items-start gap-4 sm:gap-8">
          <div className="text-center min-w-[3.5rem]">
            <div
              className="font-display text-4xl sm:text-6xl leading-none tabular-nums"
              style={{ color: "var(--gold)" }}
            >
              {time === null ? "--" : String(unit.value).padStart(2, "0")}
            </div>
            <div
              className="text-[0.65rem] tracking-[0.3em] uppercase mt-2"
              style={{ color: "var(--text-faint)" }}
            >
              {unit.label}
            </div>
          </div>
          {i < units.length - 1 && (
            <span
              className="font-display text-4xl sm:text-6xl leading-none"
              style={{ color: "var(--border-strong)" }}
            >
              :
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
