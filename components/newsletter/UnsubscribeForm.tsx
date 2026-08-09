"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { unsubscribeFromNewsletter } from "@/app/actions/newsletter";

/* ---------------------------------------------------------------------------
   Unsubscribe, the public form — no token, so no way to prove who is asking.

   IT GIVES THE SAME ANSWER EITHER WAY, whether or not the address was ever on
   a list. Anything else would make this a membership oracle: paste an address,
   read the response, learn whether that person shops here. The cost is that
   anyone can unsubscribe anyone, which is annoying rather than harmful and is
   the standard trade for a public unsubscribe form.

   The links in our mail do NOT come here. They carry a per-subscriber token
   and land on /newsletter/preferences, where the address is known and can
   therefore be shown.
--------------------------------------------------------------------------- */

export default function UnsubscribeForm() {
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
    await unsubscribeFromNewsletter(email.trim());
    setBusy(false);
    // Always the success state — see above.
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
