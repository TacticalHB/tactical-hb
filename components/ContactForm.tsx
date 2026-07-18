"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

export default function ContactForm() {
  const t = useTranslations("contact");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setLoading(true);
    setFailed(false);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(data.get("name") ?? ""),
          email: String(data.get("email") ?? ""),
          message: String(data.get("message") ?? ""),
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
