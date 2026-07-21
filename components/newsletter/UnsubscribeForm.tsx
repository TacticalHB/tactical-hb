"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

/* ---------------------------------------------------------------------------
   Unsubscribe.

   NOT WIRED UP YET — like the sign-up form, this confirms and discards. It
   deliberately gives the same answer whether or not the address is on a list,
   so the form can never be used to test which emails are subscribed.
--------------------------------------------------------------------------- */

export default function UnsubscribeForm({ locale }: { locale: string }) {
  const t = useTranslations("newsletter");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError(t("err_email"));
    setBusy(true);
    // TODO: POST to a newsletter endpoint. Nothing is removed today.
    await new Promise((r) => setTimeout(r, 500));
    setBusy(false);
    setDone(true);
  }

  return (
    <div>
      <h2 className="font-display text-2xl md:text-3xl mb-5" style={{ color: "var(--text)" }}>
        {t("unsub_title")}
      </h2>
      <div className="h-px mb-6" style={{ background: "var(--border)" }} />

      {done ? (
        <div className="p-5 flex items-start gap-3" style={{ background: "var(--bg-soft)" }}>
          <svg width="18" height="18" viewBox="0 0 14 14" fill="none" aria-hidden="true"
            className="shrink-0 mt-0.5" style={{ color: "var(--accent)" }}>
            <path d="M2.5 7.5l3 3 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-[14px] leading-relaxed" style={{ color: "var(--text)" }}>{t("unsub_success")}</p>
        </div>
      ) : (
        <form onSubmit={onSubmit}>
          <div className="p-5 mb-6" style={{ background: "var(--bg-soft)" }}>
            <p className="text-[14px] leading-relaxed" style={{ color: "var(--text-muted)" }}>{t("unsub_intro")}</p>
          </div>

          <p className="text-[12px] text-right mb-5" style={{ color: "var(--text-muted)" }}>{t("mandatory")}</p>

          {error && (
            <div role="alert" className="mb-5 text-sm px-4 py-3" style={{ background: "#fdecec", color: "#b42318" }}>
              {error}
            </div>
          )}

          <label htmlFor="nl-unsub" className="block text-[11px] tracking-[0.2em] uppercase mb-2" style={{ color: "var(--text-faint)" }}>
            {t("form_email")}*
          </label>
          <input
            id="nl-unsub"
            className="field"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <div className="flex justify-end mt-7">
            <button
              type="submit"
              disabled={busy}
              className="h-12 px-14 rounded-full text-[15px] font-medium transition-opacity hover:opacity-85 disabled:opacity-50"
              style={{ background: "var(--accent)", color: "#111114" }}
            >
              {busy ? "…" : t("save")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
