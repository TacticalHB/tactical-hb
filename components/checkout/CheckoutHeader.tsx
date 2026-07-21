"use client";

import Link from "next/link";

/* ---------------------------------------------------------------------------
   Minimal checkout chrome — logo, secure mark, step progress. No nav, no
   footer: once someone is paying, every other link is a way to lose them.
--------------------------------------------------------------------------- */

export type Step = "identification" | "delivery" | "payment";

export default function CheckoutHeader({
  locale,
  current,
  onStepBack,
}: {
  locale: string;
  current: Step;
  /** Lets a completed step be revisited; undefined renders it as plain text. */
  onStepBack?: (step: Step) => void;
}) {
  const uk = locale === "uk";
  const steps: { id: Step; label: string }[] = [
    { id: "identification", label: uk ? "Ідентифікація" : "Identification" },
    { id: "delivery", label: uk ? "Доставка" : "Delivery" },
    { id: "payment", label: uk ? "Оплата" : "Payment" },
  ];
  const currentIdx = steps.findIndex((s) => s.id === current);

  return (
    <header style={{ borderBottom: "1px solid var(--border)", background: "var(--bg)" }}>
      <div className="page-container">
        <div className="flex items-center justify-between h-[72px]">
          <Link href={`/${locale}`} className="font-display text-xl tracking-widest" style={{ color: "var(--text)" }}>
            TACTICAL <span style={{ color: "var(--accent)" }}>HB</span>
          </Link>
          <div className="flex items-center gap-2 text-[12px]" style={{ color: "var(--text-muted)" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <rect x="3" y="7" width="10" height="7" rx="1.5" />
              <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
            </svg>
            {uk ? "Захищене оформлення" : "Secure checkout"}
          </div>
        </div>

        <nav
          aria-label={uk ? "Кроки оформлення" : "Checkout steps"}
          className="flex items-center gap-2.5 sm:gap-4 pb-5 overflow-x-auto -mx-1 px-1"
        >
          {steps.map((s, i) => {
            const done = i < currentIdx;
            const active = i === currentIdx;
            return (
              <div key={s.id} className="flex items-center gap-2.5 sm:gap-4 shrink-0">
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-medium"
                    style={{
                      background: active || done ? "var(--ink)" : "transparent",
                      color: active || done ? "#f4f3f0" : "var(--text-faint)",
                      border: active || done ? "none" : "1px solid var(--border-strong)",
                    }}
                    aria-current={active ? "step" : undefined}
                  >
                    {done ? (
                      <svg width="11" height="11" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                        <path d="M2.5 7.5l3 3 6-6" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </span>
                  {done && onStepBack ? (
                    <button
                      onClick={() => onStepBack(s.id)}
                      className="text-[13px] underline underline-offset-4 transition-opacity hover:opacity-70"
                      style={{ color: "var(--text)" }}
                    >
                      {s.label}
                    </button>
                  ) : (
                    <span
                      className="text-[13px]"
                      style={{ color: active ? "var(--text)" : "var(--text-faint)", fontWeight: active ? 500 : 400 }}
                    >
                      {s.label}
                    </span>
                  )}
                </div>
                {i < steps.length - 1 && (
                  <span className="w-5 sm:w-8 h-px shrink-0" style={{ background: "var(--border-strong)" }} />
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
