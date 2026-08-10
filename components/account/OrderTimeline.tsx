import type { TimelineStep } from "@/lib/account-orders";

/* ---------------------------------------------------------------------------
   Where an order has got to.

   QUIET, NOT A PROGRESS TOY. No bar filling, no percentage, no animation on
   arrival. A row of small marks joined by a hairline: the ones behind are
   solid, the one you are at carries the accent and its label is the only bold
   thing here, and the ones ahead are hollow. That is the whole vocabulary.

   NO MOTION AT ALL, so there is nothing for prefers-reduced-motion to switch
   off. The status of an order is information, and information that animates
   into place is slower to read, not more premium.

   A SERVER COMPONENT. It holds no state and takes no interaction, so it ships
   no JavaScript.
--------------------------------------------------------------------------- */

export default function OrderTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol className="flex items-start" role="list">
      {steps.map((s, i) => {
        const done = s.state === "done";
        const current = s.state === "current";
        const reached = done || current;

        return (
          <li key={s.key} className="flex-1 min-w-0 flex flex-col items-center text-center">
            {/* The mark and its two rule halves share a row, so the line meets
                the mark's centre rather than its edge. The first and last
                halves are invisible, which is what stops the rule running off
                the ends of the list. */}
            <div className="flex items-center w-full" aria-hidden="true">
              <span
                className="h-px flex-1"
                style={{ background: i === 0 ? "transparent" : done || current ? "var(--accent-ink)" : "var(--border)" }}
              />
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 mx-1.5"
                style={{
                  background: current ? "var(--accent)" : done ? "var(--ink)" : "transparent",
                  border: reached ? "none" : "1px solid var(--border-strong)",
                }}
              />
              <span
                className="h-px flex-1"
                style={{ background: i === steps.length - 1 ? "transparent" : done ? "var(--accent-ink)" : "var(--border)" }}
              />
            </div>

            <span
              className="mt-2.5 text-[11px] leading-tight px-1"
              style={{
                color: current ? "var(--text)" : reached ? "var(--text-muted)" : "var(--text-faint)",
                fontWeight: current ? 600 : 400,
              }}
            >
              {s.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
