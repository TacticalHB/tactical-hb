"use client";

import { useTranslations, useLocale } from "next-intl";
import { useState } from "react";

export default function WholesaleForm() {
  const t = useTranslations("wholesale");
  const uk = useLocale() === "uk";
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [businessType, setBusinessType] = useState("");
  const [bizError, setBizError] = useState(false);
  const [hoverBiz, setHoverBiz] = useState<string | null>(null);

  // Single-select, so labels double as stable values. Order and wording are
  // deliberate — no "Hotel / Restaurant".
  const businessOptions = [
    { value: "shop", label: t("biz_shop") },
    { value: "distribution", label: t("biz_distribution") },
    { value: "lounge", label: t("biz_lounge") },
  ];

  const label = "block text-xs tracking-[0.2em] uppercase mb-2";
  const labelStyle = { color: "var(--text-faint)" };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // The buttons carry no native required semantics, so guard here.
    if (!businessType) {
      setBizError(true);
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex items-center justify-center h-64 border"
        style={{ borderColor: "var(--gold)", background: "var(--bg-soft)" }}>
        <p className="text-sm tracking-wider" style={{ color: "var(--gold)" }}>{t("form_success")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {[
        { name: "name", label: t("form_name"), type: "text" },
        { name: "company", label: t("form_company"), type: "text" },
        { name: "email", label: t("form_email"), type: "email" },
      ].map((field) => (
        <div key={field.name}>
          <label className={label} style={labelStyle}>{field.label}</label>
          <input type={field.type} name={field.name} required className="field" />
        </div>
      ))}

      {/* Telephone — sits with the contact details. WhatsApp-friendly: type=tel.
          Ukrainian visitors get the country code pre-filled; English-language
          visitors may be anywhere, so they only get the "+". */}
      <div>
        <label className={label} style={labelStyle}>{t("form_phone")}</label>
        <input
          type="tel"
          name="phone"
          required
          defaultValue={uk ? "+380" : "+"}
          inputMode="tel"
          autoComplete="tel"
          placeholder={uk ? "+380 00 000 0000" : "+00 000 000 000"}
          className="field"
        />
      </div>

      {/* Country then City, kept adjacent. */}
      <div>
        <label className={label} style={labelStyle}>{t("form_country")}</label>
        <input type="text" name="country" required className="field" />
      </div>
      <div>
        <label className={label} style={labelStyle}>{t("form_city")}</label>
        <input type="text" name="city" required className="field" />
      </div>

      {/* Business type — a bordered panel of full-width rows, following the
          list-selector pattern used elsewhere on the site. Single-select; the
          chosen row fills with ink and shows a brass check. */}
      <div>
        <label className={label} style={labelStyle}>{t("form_business_type")}</label>
        <div
          className="rounded-[4px] overflow-hidden"
          style={{ border: "1px solid var(--border-strong)" }}
          role="radiogroup"
          aria-label={t("form_business_type")}
        >
          {businessOptions.map((o, i) => {
            const active = businessType === o.value;
            const hovered = hoverBiz === o.value;
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  setBusinessType(o.value);
                  setBizError(false);
                }}
                onMouseEnter={() => setHoverBiz(o.value)}
                onMouseLeave={() => setHoverBiz(null)}
                className="w-full flex items-center justify-between px-4 py-3.5 text-sm text-left transition-colors"
                style={{
                  background: active
                    ? "var(--ink)"
                    : hovered
                    ? "var(--bg-soft)"
                    : "var(--field-bg)",
                  color: active ? "#f4f3f0" : "var(--text)",
                  borderTop: i > 0 ? "1px solid var(--border)" : "none",
                  fontWeight: active ? 500 : 400,
                }}
              >
                <span>{o.label}</span>
                {active && (
                  <svg width="15" height="15" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ color: "var(--accent)" }}>
                    <path d="M2.5 7.5l3 3 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
        {bizError && (
          <p className="mt-2 text-xs" style={{ color: "#b42318" }}>{t("form_business_required")}</p>
        )}
      </div>

      <div>
        <label className={label} style={labelStyle}>{t("form_message")}</label>
        <textarea name="message" rows={5} required className="field resize-none" />
      </div>

      <button type="submit" disabled={loading} className="btn-gold font-display text-lg tracking-widest py-4 disabled:opacity-60">
        {loading ? "..." : t("form_submit")}
      </button>
    </form>
  );
}
