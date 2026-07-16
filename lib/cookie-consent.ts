"use client";

/* ---------------------------------------------------------------------------
   Cookie consent — stored in a first-party cookie (not localStorage) so the
   choice is readable server-side later (e.g. to decide whether to inject
   analytics tags during SSR).

   Categories:
     • necessary  — always on: auth session, cart, the consent cookie itself.
     • analytics  — usage measurement. Off until explicitly accepted.
     • marketing  — ads / personalisation. Off until explicitly accepted.
--------------------------------------------------------------------------- */

export type ConsentCategories = {
  necessary: true; // locked on — the site cannot function without these
  analytics: boolean;
  marketing: boolean;
};

export type Consent = ConsentCategories & { ts: string };

export const CONSENT_COOKIE = "tct-cookie-consent";
/** Dispatch this to reopen the settings modal (footer / account settings). */
export const CONSENT_OPEN_EVENT = "tct-open-cookie-settings";
/** Fired after a choice is saved, so listeners can react (e.g. load analytics). */
export const CONSENT_CHANGED_EVENT = "tct-cookie-consent-changed";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 180; // 180 days, then we ask again

export function readConsent(): Consent | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${CONSENT_COOKIE}=`))
    ?.split("=")
    .slice(1)
    .join("=");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    return { ...parsed, necessary: true } as Consent;
  } catch {
    return null;
  }
}

export function writeConsent(c: Omit<ConsentCategories, "necessary">) {
  if (typeof document === "undefined") return;
  const value: Consent = { necessary: true, analytics: c.analytics, marketing: c.marketing, ts: new Date().toISOString() };
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(value))}; path=/; max-age=${MAX_AGE_SECONDS}; SameSite=Lax`;
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT, { detail: value }));
}

/** Gate future analytics/marketing scripts on this. */
export function hasConsent(category: "analytics" | "marketing"): boolean {
  return readConsent()?.[category] === true;
}

/** Reopen the granular settings modal from anywhere. */
export function openCookieSettings() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CONSENT_OPEN_EVENT));
}
