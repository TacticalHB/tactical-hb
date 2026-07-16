"use client";

import { openCookieSettings } from "@/lib/cookie-consent";

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
  const uk = locale === "uk";
  return (
    <button type="button" onClick={openCookieSettings} className={className} style={style}>
      {uk ? "Налаштування cookie" : "Cookie settings"}
    </button>
  );
}
