"use client";

import { openCookieSettings } from "@/lib/cookie-consent";
import { t } from "@/lib/i18n-text";

/** Small client button so server components (e.g. the Footer) can offer a way
    to reopen the cookie settings modal at any time. */
export default function CookieSettingsButton({
  locale,
  className,
  style,
}: {
  locale: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    /* The 44px row is set here rather than at the call site, because this is
       the only route back into the consent settings once the banner is gone —
       it appears in the footer of every page and in account settings, and it
       was a 16px-tall line of text in both. Any className passed in still wins
       on everything else. */
    <button
      type="button"
      onClick={openCookieSettings}
      className={`inline-flex items-center justify-center min-h-11 ${className ?? ""}`}
      style={style}
    >
      {t(locale, { uk: "Налаштування cookie", en: "Cookie settings", ja: "Cookie 設定" })}
    </button>
  );
}
