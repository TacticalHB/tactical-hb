"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

export default function ContactForm() {
  const t = useTranslations("contact");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex items-center justify-center h-48 border"
        style={{ borderColor: "var(--gold)", background: "var(--bg-2)" }}>
        <p className="text-sm tracking-wider" style={{ color: "var(--gold)" }}>{t("form_success")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {[
        { name: "name", label: t("form_name"), type: "text" },
        { name: "email", label: t("form_email"), type: "email" },
      ].map((field) => (
        <div key={field.name}>
          <label className="block text-xs tracking-[0.2em] uppercase mb-2" style={{ color: "var(--text-faint)" }}>
            {field.label}
          </label>
          <input type={field.type} name={field.name} required className="field" />
        </div>
      ))}
      <div>
        <label className="block text-xs tracking-[0.2em] uppercase mb-2" style={{ color: "var(--text-faint)" }}>
          {t("form_message")}
        </label>
        <textarea name="message" rows={6} required className="field resize-none" />
      </div>
      <button type="submit" disabled={loading} className="btn-gold font-display text-lg tracking-widest py-4 disabled:opacity-60">
        {loading ? "..." : t("form_submit")}
      </button>
    </form>
  );
}
