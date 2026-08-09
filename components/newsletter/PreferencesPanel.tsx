"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  resubscribeWithToken,
  setNewsletterLocale,
  unsubscribeWithToken,
} from "@/app/actions/newsletter";

/* ---------------------------------------------------------------------------
   The preference centre a marketing email links to.

   TWO CONTROLS, AND THAT IS THE POINT. Which language the mail is written in,
   and whether it is sent at all. A page with more switches than a shop has
   flows is a page that pretends to offer choices it does not honour.

   IT SHOWS THE ADDRESS, which the public unsubscribe form must never do. The
   difference is the token: it is unguessable, it appears only in mail sent to
   that address, and holding one is therefore proof enough of ownership.

   THE UNSUBSCRIBE IS A BUTTON, NEVER A PAGE LOAD. Corporate link scanners and
   Outlook Safe Links fetch every URL in a message before the recipient sees
   it, so a page that unsubscribed on arrival would quietly remove people who
   never clicked. `?action=unsubscribe` only scrolls the intent into view — the
   removal needs the press.
--------------------------------------------------------------------------- */

export default function PreferencesPanel({
  token,
  email,
  locale,
  subscriberLocale,
  unsubscribed,
  highlightUnsubscribe,
}: {
  token: string;
  email: string;
  /** The locale of the page being read. */
  locale: string;
  /** The locale their mail is currently written in. */
  subscriberLocale: "en" | "uk";
  unsubscribed: boolean;
  highlightUnsubscribe: boolean;
}) {
  const t = useTranslations("newsletter");
  const [lang, setLang] = useState<"en" | "uk">(subscriberLocale);
  const [off, setOff] = useState(unsubscribed);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function changeLanguage(next: "en" | "uk") {
    if (next === lang || busy) return;
    setBusy(true);
    setError(null);
    setNote(null);
    const result = await setNewsletterLocale(token, next);
    setBusy(false);
    if (!result.ok) return setError(t("err_failed"));
    setLang(next);
    setNote(t("prefs_lang_saved"));
  }

  async function stop() {
    setBusy(true);
    setError(null);
    setNote(null);
    const result = await unsubscribeWithToken(token);
    setBusy(false);
    if (!result.ok) return setError(t("err_failed"));
    setOff(true);
  }

  async function start() {
    setBusy(true);
    setError(null);
    setNote(null);
    const result = await resubscribeWithToken(token);
    setBusy(false);
    if (!result.ok) return setError(t("err_failed"));
    setOff(false);
    setNote(t("prefs_resub_done"));
  }

  const pill =
    "h-11 px-7 rounded-full text-[14px] font-medium transition-opacity hover:opacity-85 disabled:opacity-50";

  return (
    <div>
      <p className="text-[14px] leading-relaxed mb-1" style={{ color: "var(--text-muted)" }}>
        {t("prefs_intro")}
      </p>
      <p className="text-[15px] mb-8" style={{ color: "var(--text)" }}>
        {email}
      </p>

      {error && (
        <div role="alert" className="mb-6 text-sm px-4 py-3" style={{ background: "#fdecec", color: "#b42318" }}>
          {error}
        </div>
      )}
      {note && (
        <div role="status" className="mb-6 text-sm px-4 py-3" style={{ background: "var(--bg-soft)", color: "var(--text)" }}>
          {note}
        </div>
      )}

      {/* Language ------------------------------------------------------- */}
      <h2 className="text-[11px] tracking-[0.2em] uppercase mb-3" style={{ color: "var(--text-faint)" }}>
        {t("prefs_lang")}
      </h2>
      <div className="flex gap-2.5 mb-12">
        {(["en", "uk"] as const).map((code) => {
          const active = lang === code;
          return (
            <button
              key={code}
              type="button"
              onClick={() => changeLanguage(code)}
              disabled={busy}
              aria-pressed={active}
              className={pill}
              style={
                active
                  ? { background: "var(--accent)", color: "#111114" }
                  : { border: "1px solid var(--border-strong)", color: "var(--text)", background: "var(--field-bg)" }
              }
            >
              {code === "en" ? t("prefs_lang_en") : t("prefs_lang_uk")}
            </button>
          );
        })}
      </div>

      {/* Subscription --------------------------------------------------- */}
      <div
        className="p-6"
        style={{
          background: "var(--bg-soft)",
          /* The link that says "unsubscribe" should land on something that
             looks like the answer to it, not a paragraph to hunt through. */
          border: highlightUnsubscribe && !off ? "1px solid var(--accent)" : "1px solid transparent",
        }}
      >
        <h2 className="text-[11px] tracking-[0.2em] uppercase mb-3" style={{ color: "var(--text-faint)" }}>
          {t("prefs_unsub_title")}
        </h2>

        {off ? (
          <>
            <p className="text-[14px] leading-relaxed mb-5" style={{ color: "var(--text)" }}>
              {t("prefs_unsub_done")}
            </p>
            <button
              type="button"
              onClick={start}
              disabled={busy}
              className={pill}
              style={{ border: "1px solid var(--border-strong)", color: "var(--text)", background: "var(--field-bg)" }}
            >
              {t("prefs_resub_cta")}
            </button>
          </>
        ) : (
          <>
            <p className="text-[14px] leading-relaxed mb-5" style={{ color: "var(--text-muted)" }}>
              {t("prefs_unsub_body")}
            </p>
            <button
              type="button"
              onClick={stop}
              disabled={busy}
              className={pill}
              style={{ background: "#111114", color: "#ffffff" }}
            >
              {busy ? "…" : t("prefs_unsub_cta")}
            </button>
          </>
        )}
      </div>

      <Link
        href={`/${locale}/newsletter`}
        className="inline-block mt-8 text-[13px] underline underline-offset-4"
        style={{ color: "var(--text-muted)" }}
      >
        {t("prefs_back")}
      </Link>
    </div>
  );
}
