"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

/* ---------------------------------------------------------------------------
   Newsletter sign-up.

   NOT WIRED UP YET — submission shows the success state and discards the
   details. There is no list to add anyone to, so this collects a consent it
   cannot currently honour; wiring it to Resend or a subscribers table is a
   separate, small change. Kept in one place so that swap is a single function.

   Country names come from Intl.DisplayNames rather than a hand-kept bilingual
   list, so /uk shows "Німеччина" and /en shows "Germany" from the same data.
--------------------------------------------------------------------------- */

/** Markets the store ships to — Europe, the Middle East, and North America. */
const COUNTRY_CODES = [
  "UA", "PL", "DE", "FR", "GB", "IT", "ES", "NL", "BE", "AT", "CH", "CZ", "SK",
  "HU", "RO", "BG", "GR", "PT", "SE", "NO", "DK", "FI", "IE", "LT", "LV", "EE",
  "MD", "GE", "TR", "CY", "AE", "SA", "QA", "KW", "IL", "US", "CA",
];

function useCountries(locale: string) {
  return useMemo(() => {
    let name = (code: string) => code;
    try {
      const dn = new Intl.DisplayNames([locale], { type: "region" });
      name = (code: string) => dn.of(code) ?? code;
    } catch {
      // Very old runtimes: fall back to the raw ISO code rather than break.
    }
    return COUNTRY_CODES.map((code) => ({ code, label: name(code) })).sort((a, b) =>
      a.label.localeCompare(b.label, locale)
    );
  }, [locale]);
}

function Chevron() {
  return (
    <svg
      width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"
      className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2"
      style={{ color: "var(--text-muted)" }} aria-hidden="true"
    >
      <path d="M4 7l6 6 6-6" />
    </svg>
  );
}

export default function NewsletterForm({ locale }: { locale: string }) {
  const t = useTranslations("newsletter");
  const countries = useCountries(locale);
  const uk = locale === "uk";

  const [title, setTitle] = useState("");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [country, setCountry] = useState(uk ? "UA" : "");
  const [email, setEmail] = useState("");
  const [confirm, setConfirm] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const label = "block text-[11px] tracking-[0.2em] uppercase mb-2";
  const labelSt = { color: "var(--text-faint)" };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title || !first.trim() || !last.trim() || !country || !email.trim() || !confirm.trim()) {
      return setError(t("err_required"));
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError(t("err_email"));
    // Compare case-insensitively — "Sarah@x.com" and "sarah@x.com" are the same
    // mailbox, and failing that comparison would just look broken.
    if (email.trim().toLowerCase() !== confirm.trim().toLowerCase()) {
      return setError(t("err_match"));
    }
    if (!consent) return setError(t("err_consent"));

    setBusy(true);
    // TODO: POST to a newsletter endpoint. Nothing is stored today.
    await new Promise((r) => setTimeout(r, 600));
    setBusy(false);
    setDone(true);
  }

  if (done) {
    return (
      <div className="py-6">
        <div className="flex items-start gap-4 mb-6">
          <svg width="26" height="26" viewBox="0 0 14 14" fill="none" aria-hidden="true"
            className="shrink-0 mt-0.5" style={{ color: "var(--accent)" }}>
            <path d="M2.5 7.5l3 3 6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div>
            <h2 className="font-display text-3xl mb-3" style={{ color: "var(--text)" }}>{t("success_title")}</h2>
            <p className="text-[15px] leading-relaxed max-w-md" style={{ color: "var(--text-muted)" }}>
              {t("success_body")}
            </p>
          </div>
        </div>
        <Link
          href={`/${locale}`}
          className="inline-flex h-12 px-10 items-center justify-center rounded-full text-[15px] font-medium transition-opacity hover:opacity-85"
          style={{ background: "var(--accent)", color: "#111114" }}
        >
          {t("success_back")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="p-5 mb-8" style={{ background: "var(--bg-soft)" }}>
        <p className="text-[14px] leading-relaxed" style={{ color: "var(--text-muted)" }}>{t("intro")}</p>
      </div>

      <p className="text-[12px] text-right mb-5" style={{ color: "var(--text-muted)" }}>{t("mandatory")}</p>

      {error && (
        <div role="alert" className="mb-6 text-sm px-4 py-3" style={{ background: "#fdecec", color: "#b42318" }}>
          {error}
        </div>
      )}

      <div className="flex flex-col gap-5">
        <div>
          <label htmlFor="nl-title" className={label} style={labelSt}>{t("form_title")}*</label>
          <div className="relative">
            <select
              id="nl-title"
              className="field appearance-none pr-10"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            >
              <option value="" disabled />
              <option value="mr">{t("title_mr")}</option>
              <option value="ms">{t("title_ms")}</option>
              <option value="none">{t("title_none")}</option>
            </select>
            <Chevron />
          </div>
        </div>

        <div>
          <label htmlFor="nl-first" className={label} style={labelSt}>{t("form_first")}*</label>
          <input id="nl-first" className="field" autoComplete="given-name" value={first}
            onChange={(e) => setFirst(e.target.value)} required />
        </div>

        <div>
          <label htmlFor="nl-last" className={label} style={labelSt}>{t("form_last")}*</label>
          <input id="nl-last" className="field" autoComplete="family-name" value={last}
            onChange={(e) => setLast(e.target.value)} required />
        </div>

        <div>
          <label htmlFor="nl-country" className={label} style={labelSt}>{t("form_country")}*</label>
          <div className="relative">
            <select
              id="nl-country"
              className="field appearance-none pr-10"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              required
            >
              <option value="" disabled />
              {countries.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
            <Chevron />
          </div>
        </div>

        <div>
          <label htmlFor="nl-email" className={label} style={labelSt}>{t("form_email")}*</label>
          <input id="nl-email" className="field" type="email" autoComplete="email" value={email}
            onChange={(e) => setEmail(e.target.value)} required />
        </div>

        <div>
          <label htmlFor="nl-confirm" className={label} style={labelSt}>{t("form_email_confirm")}*</label>
          {/* Pasting defeats the point of a confirmation field. */}
          <input id="nl-confirm" className="field" type="email" autoComplete="off" value={confirm}
            onPaste={(e) => e.preventDefault()}
            onChange={(e) => setConfirm(e.target.value)} required />
        </div>

        <label className="flex items-start gap-3 cursor-pointer mt-1">
          <input
            type="checkbox"
            className="mt-0.5 w-4 h-4 shrink-0"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span className="text-[13.5px] leading-relaxed" style={{ color: "var(--text)" }}>
            {t("consent")}*
          </span>
        </label>
      </div>

      <div className="flex justify-end mt-8">
        <button
          type="submit"
          disabled={busy}
          className="h-12 px-14 rounded-full text-[15px] font-medium transition-opacity hover:opacity-85 disabled:opacity-50"
          style={{ background: "var(--accent)", color: "#111114" }}
        >
          {busy ? "…" : t("save")}
        </button>
      </div>

      <p className="text-[12px] leading-relaxed mt-8" style={{ color: "var(--text-faint)" }}>{t("legal")}</p>
    </form>
  );
}
