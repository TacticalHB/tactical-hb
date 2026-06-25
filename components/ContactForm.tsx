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
      <div
        className="flex items-center justify-center h-48 border"
        style={{ borderColor: "var(--gold)", background: "var(--bg-subtle)" }}
      >
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
          <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: "var(--text-muted)" }}>
            {field.label}
          </label>
          <input
            type={field.type}
            name={field.name}
            required
            className="w-full px-4 py-3 text-sm outline-none border transition-colors"
            style={{
              background: "var(--bg-subtle)",
              color: "var(--text)",
              borderColor: "var(--border-light)",
            }}
            onFocus={e => (e.currentTarget.style.borderColor = "var(--gold)")}
            onBlur={e => (e.currentTarget.style.borderColor = "var(--border-light)")}
          />
        </div>
      ))}
      <div>
        <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: "var(--text-muted)" }}>
          {t("form_message")}
        </label>
        <textarea
          name="message"
          rows={6}
          required
          className="w-full px-4 py-3 text-sm outline-none border transition-colors resize-none"
          style={{
            background: "var(--bg-subtle)",
            color: "var(--text)",
            borderColor: "var(--border-light)",
          }}
          onFocus={e => (e.currentTarget.style.borderColor = "var(--gold)")}
          onBlur={e => (e.currentTarget.style.borderColor = "var(--border-light)")}
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="font-display text-base tracking-widest py-4 transition-colors"
        style={{ background: "var(--bg-dark)", color: "#fff" }}
        onMouseEnter={e => (e.currentTarget.style.background = "var(--gold)")}
        onMouseLeave={e => (e.currentTarget.style.background = "var(--bg-dark)")}
      >
        {loading ? "..." : t("form_submit")}
      </button>
    </form>
  );
}
