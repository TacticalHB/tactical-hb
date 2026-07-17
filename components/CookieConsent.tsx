"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CONSENT_OPEN_EVENT,
  readConsent,
  writeConsent,
  type Consent,
} from "@/lib/cookie-consent";

/* ---------------------------------------------------------------------------
   Cookie consent banner + granular settings.

   Flow:
     • First visit (no consent cookie) -> bottom banner.
     • "Accept all" / "Reject all"     -> saved immediately, banner closes.
     • "Customize"                     -> modal with per-category toggles.
     • Later                           -> openCookieSettings() reopens the modal
                                          (footer link + account settings).
--------------------------------------------------------------------------- */

type Toggles = { analytics: boolean; marketing: boolean };

export default function CookieConsent({ locale }: { locale: string }) {
  const uk = locale === "uk";
  const [ready, setReady] = useState(false);       // avoids SSR/hydration flash
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [toggles, setToggles] = useState<Toggles>({ analytics: false, marketing: false });

  // Decide whether to prompt, and wire up the "reopen settings" event.
  useEffect(() => {
    const existing: Consent | null = readConsent();
    if (existing) setToggles({ analytics: existing.analytics, marketing: existing.marketing });
    setShowBanner(!existing);
    setReady(true);

    const open = () => {
      const c = readConsent();
      if (c) setToggles({ analytics: c.analytics, marketing: c.marketing });
      setShowModal(true);
    };
    window.addEventListener(CONSENT_OPEN_EVENT, open);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, open);
  }, []);

  const L = {
    title: uk ? "Ми використовуємо файли cookie" : "We use cookies",
    body: uk
      ? "Необхідні cookie тримають сайт робочим (вхід, кошик). За вашою згодою ми також використовуємо аналітику та маркетинг."
      : "Necessary cookies keep the site working (sign-in, bag). With your consent we also use analytics and marketing cookies.",
    acceptAll: uk ? "Прийняти все" : "Accept all",
    rejectAll: uk ? "Відхилити все" : "Reject all",
    customize: uk ? "Налаштувати" : "Customize",
    settings: uk ? "Налаштування cookie" : "Cookie settings",
    necessary: uk ? "Необхідні" : "Necessary",
    necessaryDesc: uk
      ? "Потрібні для роботи сайту: сесія входу, кошик, безпека. Вимкнути неможливо."
      : "Required for the site to work: sign-in session, bag, security. Cannot be turned off.",
    always: uk ? "Завжди увімкнено" : "Always on",
    analytics: uk ? "Аналітика" : "Analytics",
    analyticsDesc: uk
      ? "Допомагає зрозуміти, як використовується сайт, щоб покращувати його."
      : "Helps us understand how the site is used so we can improve it.",
    marketing: uk ? "Маркетинг та вподобання" : "Marketing & preferences",
    marketingDesc: uk
      ? "Персоналізовані пропозиції та запам'ятовування ваших вподобань."
      : "Personalised offers and remembering your preferences.",
    save: uk ? "Зберегти вибір" : "Save choices",
    saved: uk ? "Налаштування cookie збережено" : "Cookie preferences saved",
    close: uk ? "Закрити" : "Close",
  };

  const persist = (next: Toggles) => {
    writeConsent(next);
    setToggles(next);
    setShowBanner(false);
    setShowModal(false);
    toast.success(L.saved);
  };

  if (!ready) return null;

  return (
    <>
      {/* ---------- Bottom banner (first visit only) ---------- */}
      {showBanner && !showModal && (
        <div
          role="dialog"
          aria-label={L.title}
          className="fixed bottom-0 left-0 right-0 z-[90] p-4 sm:p-5"
          style={{ background: "#fff", borderTop: "1px solid var(--border)", boxShadow: "0 -8px 30px rgba(0,0,0,0.10)" }}
        >
          <div className="page-container flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <div className="text-sm font-semibold" style={{ color: "#111" }}>{L.title}</div>
              <p className="text-[13px] mt-1 leading-snug" style={{ color: "var(--text-muted)" }}>{L.body}</p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <button onClick={() => persist({ analytics: true, marketing: true })}
                className="h-10 px-5 rounded-full text-xs font-medium" style={{ background: "#111", color: "#fff" }}>
                {L.acceptAll}
              </button>
              <button onClick={() => persist({ analytics: false, marketing: false })}
                className="h-10 px-5 rounded-full text-xs font-medium border" style={{ borderColor: "var(--border-strong)", color: "#111" }}>
                {L.rejectAll}
              </button>
              <button onClick={() => setShowModal(true)}
                className="h-10 px-5 rounded-full text-xs font-medium underline underline-offset-2" style={{ color: "#111" }}>
                {L.customize}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Granular settings modal ---------- */}
      {showModal && (
        <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center p-0 sm:p-6"
          style={{ background: "rgba(0,0,0,0.45)" }} onClick={() => setShowModal(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={L.settings}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
            style={{ background: "#fff" }}
          >
            <div className="flex items-start justify-between gap-4 mb-5">
              <h2 className="text-xl font-semibold" style={{ color: "#111" }}>{L.settings}</h2>
              <button onClick={() => setShowModal(false)} aria-label={L.close} className="p-1" style={{ color: "var(--text-muted)" }}>
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            </div>

            {/* Necessary — locked */}
            <div className="py-4 border-t" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between gap-4">
                <div className="text-sm font-medium" style={{ color: "#111" }}>{L.necessary}</div>
                <span className="text-[11px] uppercase tracking-wide px-2.5 py-1 rounded-full shrink-0"
                  style={{ background: "var(--bg-soft)", color: "var(--text-muted)" }}>{L.always}</span>
              </div>
              <p className="text-[13px] mt-1" style={{ color: "var(--text-muted)" }}>{L.necessaryDesc}</p>
            </div>

            {/* Analytics */}
            <Row
              label={L.analytics}
              desc={L.analyticsDesc}
              checked={toggles.analytics}
              onChange={(v) => setToggles((t) => ({ ...t, analytics: v }))}
            />
            {/* Marketing */}
            <Row
              label={L.marketing}
              desc={L.marketingDesc}
              checked={toggles.marketing}
              onChange={(v) => setToggles((t) => ({ ...t, marketing: v }))}
            />

            <button onClick={() => persist(toggles)}
              className="mt-6 w-full h-12 rounded-full text-sm font-medium" style={{ background: "#111", color: "#fff" }}>
              {L.save}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Row({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="py-4 border-t" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm font-medium" style={{ color: "#111" }}>{label}</div>
        {/* Accessible switch */}
        <button
          role="switch"
          aria-checked={checked}
          aria-label={label}
          onClick={() => onChange(!checked)}
          className="relative w-11 h-6 rounded-full transition-colors shrink-0"
          style={{ background: checked ? "#111" : "var(--border-strong)" }}
        >
          <span
            className="absolute top-0.5 w-5 h-5 rounded-full transition-transform"
            style={{ background: "#fff", left: 2, transform: `translateX(${checked ? 20 : 0}px)` }}
          />
        </button>
      </div>
      <p className="text-[13px] mt-1" style={{ color: "var(--text-muted)" }}>{desc}</p>
    </div>
  );
}
