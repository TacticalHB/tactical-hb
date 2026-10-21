import type { OrderTone, ProgressStep, StepState } from "@/lib/orders-display";

/* ---------------------------------------------------------------------------
   Paid → Packed → Shipped → Delivered, on every order card (21 Oct 2026).

   Green fills in as each step happens; the step the order is waiting on is
   orange; a step only a human can unblock is red. The rules live in
   lib/orders-display (orderProgress) — this only draws them.

   Console colours, not the brand orange: the admin keeps the packaging orange
   for brand moments, and status colours mean health (see globals.css).
--------------------------------------------------------------------------- */

const DOT: Record<StepState, { bg: string; border: string; fg: string }> = {
  done: { bg: "var(--console-ok)", border: "var(--console-ok)", fg: "#ffffff" },
  current: { bg: "var(--console-warn-soft)", border: "var(--console-warn)", fg: "var(--console-warn)" },
  problem: { bg: "var(--console-alert)", border: "var(--console-alert)", fg: "#ffffff" },
  todo: { bg: "var(--console-panel)", border: "var(--console-border)", fg: "var(--console-faint)" },
};

const LABEL: Record<StepState, string> = {
  done: "var(--console-ok)",
  current: "var(--console-warn)",
  problem: "var(--console-alert)",
  todo: "var(--console-faint)",
};

/** The card's tint, by the one tone the whole order takes. */
export const TONE_STYLE: Record<OrderTone, { head: string; border: string }> = {
  done: { head: "var(--console-ok-soft)", border: "rgba(43, 122, 79, 0.28)" },
  /* Light orange (Mario: "the orders still in progress are light orange").
     Warmer than --console-warn-soft, which reads beige across a whole header. */
  progress: { head: "rgba(232, 140, 40, 0.13)", border: "rgba(232, 140, 40, 0.38)" },
  problem: { head: "var(--console-alert-soft)", border: "rgba(178, 59, 55, 0.32)" },
  cancelled: { head: "var(--console-panel-2)", border: "var(--console-border)" },
};

function when(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(locale === "uk" ? "uk-UA" : "en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Kyiv",
  });
}

function Mark({ state }: { state: StepState }) {
  if (state === "done") {
    return (
      <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
        <path d="M2.5 6.2 5 8.6 9.6 3.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (state === "problem") return <span className="text-[11px] font-semibold leading-none">!</span>;
  if (state === "current") return <span className="block w-1.5 h-1.5 rounded-full" style={{ background: "var(--console-warn)" }} />;
  return null;
}

export default function OrderProgress({ steps, locale }: { steps: ProgressStep[]; locale: string }) {
  return (
    <ol className="grid grid-cols-4" aria-label={locale === "uk" ? "Хід замовлення" : "Order progress"}>
      {steps.map((s, i) => {
        const dot = DOT[s.state];
        const next = steps[i + 1];
        return (
          <li key={s.key} className="relative flex flex-col items-center text-center min-w-0">
            {/* The segment to the next step: green once that step is done. */}
            {next && (
              <span
                aria-hidden="true"
                className="absolute top-[9px] left-1/2 w-full h-[2px]"
                style={{ background: next.state === "done" ? "var(--console-ok)" : "var(--console-border)" }}
              />
            )}
            <span
              className="relative z-[1] flex items-center justify-center w-5 h-5 rounded-full"
              style={{ background: dot.bg, border: `1.5px solid ${dot.border}`, color: dot.fg }}
            >
              <Mark state={s.state} />
            </span>
            <span className="mt-1.5 px-0.5 text-[10.5px] sm:text-[12px] font-medium max-w-full [overflow-wrap:anywhere]" style={{ color: LABEL[s.state] }}>
              {s.label}
              <span className="sr-only">
                {" — "}
                {s.state === "done" ? "done" : s.state === "current" ? "in progress" : s.state === "problem" ? "needs attention" : "not yet"}
              </span>
            </span>
            {s.at && (
              <span className="text-[11px] tabular-nums" style={{ color: "var(--console-muted)" }}>
                {when(s.at, locale)}
              </span>
            )}
            {s.note && (
              <span className="text-[11px] leading-snug px-1" style={{ color: s.state === "problem" ? "var(--console-alert)" : "var(--console-muted)" }}>
                {s.note}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
