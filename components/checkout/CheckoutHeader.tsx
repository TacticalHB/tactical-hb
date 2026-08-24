"use client";

import Link from "next/link";
import { t } from "@/lib/i18n-text";

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
  const steps: { id: Step; label: string }[] = [
    { id: "identification", label: t(locale, { uk: "Ідентифікація", en: "Identification", ja: "お客様情報" }) },
    { id: "delivery", label: t(locale, { uk: "Доставка", en: "Delivery", ja: "配送" }) },
    { id: "payment", label: t(locale, { uk: "Оплата", en: "Payment", ja: "お支払い" }) },
  ];
  const currentIdx = steps.findIndex((s) => s.id === current);

  return (
    <header style={{ borderBottom: "1px solid var(--border)", background: "var(--bg)" }}>
      <div className="page-container">
        <div className="flex items-center justify-between h-[72px]">
          <Link href={`/${locale}`} className="font-display text-xl tracking-widest flex items-center gap-[0.3em] h-11 shrink-0" style={{ color: "var(--text)" }}>
            TACTICAL <span style={{ color: "var(--accent)" }}>HB</span>
          </Link>
          <div className="flex items-center gap-2 text-[12px]" style={{ color: "var(--text-muted)" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <rect x="3" y="7" width="10" height="7" rx="1.5" />
              <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
            </svg>
            {t(locale, { uk: "Захищене оформлення", en: "Secure checkout", ja: "安全なお会計" })}
          </div>
        </div>

        {/* THE THIRD STEP WAS OFF THE SCREEN AT 375. All three labels plus their
            connectors measured 387px in English and 396 in Ukrainian, and the
            strip was `overflow-x-auto`, so "Payment" was simply scrolled out of
            sight with nothing to suggest it existed — on the one screen where a
            customer most wants to know how much further there is to go.

            The fix is to show the label only for the step you are ON, and leave
            the others as their numbered circles. Nothing is hidden that was
            readable before: a completed step is still a circle you can press to
            go back, and its name is still in the accessible name. It just stops
            trying to print three Ukrainian words on a 375px screen. Full labels
            return at sm. */}
        <nav
          aria-label={t(locale, { uk: "Кроки оформлення", en: "Checkout steps", ja: "お会計の手順" })}
          className="flex items-center gap-2.5 sm:gap-4 pb-5 -mx-1 px-1"
        >
          {steps.map((s, i) => {
            const done = i < currentIdx;
            const active = i === currentIdx;
            {
              /* The circle and the label are one element now.
                 GOING BACK IS STILL AVAILABLE ON A PHONE, which is the whole
                 reason this is structured this way: hiding the label alone
                 would have taken the <button> with it and left a completed step
                 as a dot you cannot press. The circle carries the click, so at
                 375 the target is the 44px box around it and the step's name
                 lives in aria-label where a screen reader still reads it. */
            }
            const clickable = done && onStepBack;
              const Tag = clickable ? "button" : "div";
              return (
                <div key={s.id} className="flex items-center gap-2.5 sm:gap-4 shrink-0">
                  <Tag
                    {...(clickable
                      ? {
                          type: "button" as const,
                          onClick: () => onStepBack(s.id),
                          "aria-label": `${t(locale, { uk: "Повернутися до кроку", en: "Back to", ja: "前の手順へ：" })} ${s.label}`,
                        }
                      : {})}
                    className={`flex items-center gap-2.5 h-11 ${clickable ? "transition-opacity hover:opacity-70" : ""}`}
                  >
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-medium shrink-0"
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
                    {/* Only the step you are on names itself at 375. */}
                    <span
                      className={`${active ? "inline" : "hidden sm:inline"} text-[13px] whitespace-nowrap ${
                        clickable ? "underline underline-offset-4" : ""
                      }`}
                      style={{ color: active || done ? "var(--text)" : "var(--text-faint)", fontWeight: active ? 500 : 400 }}
                    >
                      {s.label}
                    </span>
                  </Tag>
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
