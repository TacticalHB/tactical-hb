"use client";

import { useEffect, useState } from "react";
import { t } from "@/lib/i18n-text";
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
  const [ready, setReady] = useState(false);       // avoids SSR/hydration flash
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [toggles, setToggles] = useState<Toggles>({ analytics: false, marketing: false });

  // Decide whether to prompt, and wire up the "reopen settings" event.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect --
       the stored consent is in a cookie/localStorage and is unavailable to the
       server. Deciding during render would either show the banner to somebody
       who already answered, for one frame, or hide it from somebody who has
       not — which is why `ready` gates the whole thing until this has run. */
    const existing: Consent | null = readConsent();
    if (existing) setToggles({ analytics: existing.analytics, marketing: existing.marketing });
    setShowBanner(!existing);
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */

    const open = () => {
      const c = readConsent();
      if (c) setToggles({ analytics: c.analytics, marketing: c.marketing });
      setShowModal(true);
    };
    window.addEventListener(CONSENT_OPEN_EVENT, open);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, open);
  }, []);

  const L = {
    title: t(locale, { uk: "Ми використовуємо файли cookie", en: "We use cookies", ja: "Cookie を使用しています", ar: "نستخدم ملفات تعريف الارتباط" }),
    /* SHORT ON PURPOSE. This used to name the examples — sign-in, bag — and
       ran to four lines on a phone, which is most of why the sheet owned a
       third of the screen. Every one of those details is one tap away in
       Customize, which lists each category with its own description, and in
       the privacy policy this paragraph links to. A consent prompt has to be
       readable at a glance to be read at all. */
    body: t(locale, { uk: "Необхідні cookie тримають сайт робочим. Аналітика та маркетинг — за вашим вибором.", en: "Necessary cookies keep the site working. Analytics and marketing are optional.", ja: "必須 Cookie はサイトの動作に必要です。分析とマーケティングは任意です。", ar: "ملفات تعريف الارتباط الضرورية تُبقي الموقع يعمل. أما التحليلات والتسويق فاختيارية." }),
    acceptAll: t(locale, { uk: "Прийняти все", en: "Accept all", ja: "すべて許可", ar: "قبول الكل" }),
    rejectAll: t(locale, { uk: "Відхилити все", en: "Reject all", ja: "すべて拒否", ar: "رفض الكل" }),
    customize: t(locale, { uk: "Налаштувати", en: "Customize", ja: "設定する", ar: "تخصيص" }),
    settings: t(locale, { uk: "Налаштування cookie", en: "Cookie settings", ja: "Cookie 設定", ar: "إعدادات ملفات تعريف الارتباط" }),
    necessary: t(locale, { uk: "Необхідні", en: "Necessary", ja: "必須", ar: "ضرورية" }),
    necessaryDesc: t(locale, { uk: "Потрібні для роботи сайту: сесія входу, кошик, безпека. Вимкнути неможливо.", en: "Required for the site to work: sign-in session, bag, security. Cannot be turned off.", ja: "サイトの動作に必要です：ログインセッション、バッグ、セキュリティ。無効にできません。", ar: "ضرورية لعمل الموقع: جلسة الدخول، الحقيبة، الأمان. لا يمكن تعطيلها." }),
    always: t(locale, { uk: "Завжди увімкнено", en: "Always on", ja: "常に有効", ar: "تعمل دائمًا" }),
    analytics: t(locale, { uk: "Аналітика", en: "Analytics", ja: "分析", ar: "التحليلات" }),
    analyticsDesc: t(locale, { uk: "Допомагає зрозуміти, як використовується сайт, щоб покращувати його.", en: "Helps us understand how the site is used so we can improve it.", ja: "サイトの利用状況を把握し、改善に役立てます。", ar: "تساعدنا على فهم كيفية استخدام الموقع لتحسينه." }),
    marketing: t(locale, { uk: "Маркетинг та вподобання", en: "Marketing & preferences", ja: "マーケティングと設定", ar: "التسويق والتفضيلات" }),
    marketingDesc: t(locale, { uk: "Персоналізовані пропозиції та запам'ятовування ваших вподобань.", en: "Personalised offers and remembering your preferences.", ja: "お客様に合わせたご案内と、設定の記憶に使用します。", ar: "عروض مخصّصة وتذكّر تفضيلاتك." }),
    save: t(locale, { uk: "Зберегти вибір", en: "Save choices", ja: "設定を保存", ar: "حفظ الاختيارات" }),
    saved: t(locale, { uk: "Налаштування cookie збережено", en: "Cookie preferences saved", ja: "Cookie の設定を保存しました", ar: "تم حفظ تفضيلات ملفات تعريف الارتباط" }),
    close: t(locale, { uk: "Закрити", en: "Close", ja: "閉じる", ar: "إغلاق" }),
    privacy: t(locale, { uk: "Політика конфіденційності", en: "Privacy Policy", ja: "プライバシーポリシー", ar: "سياسة الخصوصية" }),
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
          /* TIGHTER PADDING AND A LOWER CEILING ON A PHONE. Measured at
             375×667 the old sheet was 241px — 36% of the screen, with the
             action buttons wrapping onto a second row. The cap drops from 70%
             to 45% of the viewport so it can never take more than it needs,
             and stays scrollable for the rare landscape case. */
          className="fixed bottom-0 left-0 right-0 z-[90] px-4 py-3.5 sm:p-5 max-h-[45dvh] sm:max-h-[70dvh] overflow-y-auto overscroll-contain"
          style={{
            background: "#fff",
            borderTop: "1px solid var(--border)",
            boxShadow: "0 -8px 30px rgba(0,0,0,0.10)",
            /* THE HOME INDICATOR SAT ON THE BUTTON ROW. On a notched iPhone the
               bottom ~34px belongs to the system, and a banner pinned to
               bottom:0 puts "Reject all" underneath it — the reader can see the
               control and cannot press it. The inset is added to the padding
               that is already there rather than replacing it.

               max-height too: at 375 in Ukrainian this is a title, two lines of
               body, a link and three buttons. On a landscape phone (~390px
               tall) that filled the screen with no way to scroll to Accept. */
            paddingBottom: "calc(1rem + env(safe-area-inset-bottom))",
          }}
        >
          <div className="page-container flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold" style={{ color: "#111" }}>{L.title}</div>
              <p className="text-[13px] mt-0.5 leading-snug" style={{ color: "var(--text-muted)" }}>
                {L.body}{" "}
                {/* The banner implied a privacy policy long before one existed.
                    Now it links to it — a consent request that cannot be read
                    about is not really informed consent. */}
                <a
                  href={`/${locale}/privacy`}
                  className="underline underline-offset-2"
                  style={{ color: "#111" }}
                >
                  {L.privacy}
                </a>
              </p>
            </div>
            {/* THE TWO ANSWERS SHARE ONE ROW AND SPLIT IT EVENLY. They used
                to be three pills in a wrap container, which on a phone put
                Accept and Reject on one line and Customize alone on a second —
                a whole extra row for the option almost nobody takes, and the
                Ukrainian labels made the wrap unpredictable across locales.
                flex-1 makes the two decisions equal-width at any label length;
                on sm+ they return to their natural size beside Customize. */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 shrink-0">
              <div className="flex gap-2">
                <button onClick={() => persist({ analytics: true, marketing: true })}
                  className="flex-1 sm:flex-none h-11 px-5 rounded-full text-xs font-medium whitespace-nowrap"
                  style={{ background: "#111", color: "#fff" }}>
                  {L.acceptAll}
                </button>
                <button onClick={() => persist({ analytics: false, marketing: false })}
                  className="flex-1 sm:flex-none h-11 px-5 rounded-full text-xs font-medium border whitespace-nowrap"
                  style={{ borderColor: "var(--border-strong)", color: "#111" }}>
                  {L.rejectAll}
                </button>
              </div>
              <button onClick={() => setShowModal(true)}
                className="h-11 px-2 sm:px-5 rounded-full text-xs font-medium underline underline-offset-2 whitespace-nowrap"
                style={{ color: "#111" }}>
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
            className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-6 max-h-[90dvh] overflow-y-auto overscroll-contain"
            style={{
              background: "#fff",
              /* dvh not vh: on iOS Safari 90vh is measured against the tallest
                 the viewport ever gets, so with the address bar showing, a
                 "90vh" sheet is taller than the screen and its Save button sits
                 below the fold. And the sheet is bottom-anchored on mobile, so
                 it needs the same home-indicator inset the banner does. */
              paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))",
            }}
          >
            <div className="flex items-start justify-between gap-4 mb-5">
              <h2 className="text-xl font-semibold" style={{ color: "#111" }}>{L.settings}</h2>
              {/* -m-2.5 keeps the ✕ visually in the corner while giving it a
                  44px box; it was a 26px target in the hardest place to hit. */}
              <button onClick={() => setShowModal(false)} aria-label={L.close}
                className="flex items-center justify-center w-11 h-11 -m-2.5 shrink-0"
                style={{ color: "var(--text-muted)" }}>
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
