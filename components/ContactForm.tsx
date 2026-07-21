"use client";

import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import HoneypotField from "./HoneypotField";

// Enquiry types. `subjectEn` is a stable English label sent to the API so the
// admin inbox reads the same regardless of the visitor's language; `labelKey`
// is what the visitor sees.
const ENQUIRY_TYPES = [
  { value: "product", subjectEn: "Product Enquiry", labelKey: "type_product" },
  { value: "collab", subjectEn: "Collaboration", labelKey: "type_collab" },
  { value: "support", subjectEn: "Support", labelKey: "type_support" },
  { value: "other", subjectEn: "Other", labelKey: "type_other" },
] as const;

export default function ContactForm() {
  const t = useTranslations("contact");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  // Pre-select the most common reason so the field is never empty.
  const [type, setType] = useState<(typeof ENQUIRY_TYPES)[number]["value"]>("product");
  const [hoverType, setHoverType] = useState<string | null>(null);
  // When the form appeared, so the server can tell a person from a script.
  const mountedAt = useRef(Date.now());

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setLoading(true);
    setFailed(false);

    const subjectEn = ENQUIRY_TYPES.find((x) => x.value === type)?.subjectEn ?? "";

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(data.get("name") ?? ""),
          email: String(data.get("email") ?? ""),
          message: String(data.get("message") ?? ""),
          subject: subjectEn,
          // Spam screening — see lib/anti-spam.
          company_website: String(data.get("company_website") ?? ""),
          ts: mountedAt.current,
        }),
      });
      if (!res.ok) throw new Error(`contact endpoint returned ${res.status}`);
      setSubmitted(true);
    } catch (err) {
      // Leave the form mounted and filled — losing a long message on a failed
      // send is worse than the failure itself.
      console.error("[contact] submit failed:", err);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex items-center justify-center h-48 border"
        style={{ borderColor: "var(--gold)", background: "var(--bg-soft)" }}>
        <p className="text-sm tracking-wider" style={{ color: "var(--gold)" }}>{t("form_success")}</p>
      </div>
    );
  }

  const labelClass = "block text-xs tracking-[0.2em] uppercase mb-2";
  const labelStyle = { color: "var(--text-faint)" };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <HoneypotField />

      {/* Enquiry type — refined pills. Selected fills with ink and shows a brass
          check; brass stays reserved for the accent so selection reads clearly. */}
      <div>
        <label className={labelClass} style={labelStyle}>{t("form_type_label")}</label>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("form_type_label")}>
          {ENQUIRY_TYPES.map((o) => {
            const active = type === o.value;
            const hovered = hoverType === o.value;
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setType(o.value)}
                onMouseEnter={() => setHoverType(o.value)}
                onMouseLeave={() => setHoverType(null)}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm rounded-[3px] transition-colors"
                style={{
                  background: active ? "var(--ink)" : "var(--field-bg)",
                  color: active ? "#f4f3f0" : "var(--text)",
                  border: `1px solid ${active ? "var(--ink)" : hovered ? "var(--gold)" : "var(--border-strong)"}`,
                  fontWeight: active ? 500 : 400,
                }}
              >
                {active && (
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ color: "var(--accent)" }}>
                    <path d="M2.5 7.5l3 3 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {t(o.labelKey)}
              </button>
            );
          })}
        </div>
      </div>

      {[
        { name: "name", label: t("form_name"), type: "text" },
        { name: "email", label: t("form_email"), type: "email" },
      ].map((field) => (
        <div key={field.name}>
          <label className={labelClass} style={labelStyle}>{field.label}</label>
          <input type={field.type} name={field.name} required className="field" />
        </div>
      ))}
      <div>
        <label className={labelClass} style={labelStyle}>{t("form_message")}</label>
        <textarea name="message" rows={6} required className="field resize-none" />
      </div>
      {failed && (
        <p role="alert" className="text-sm tracking-wide" style={{ color: "#b42318" }}>
          {t("form_error")}
        </p>
      )}
      <button type="submit" disabled={loading} className="btn-gold font-display text-lg tracking-widest py-4 disabled:opacity-60">
        {loading ? "..." : t("form_submit")}
      </button>
    </form>
  );
}
