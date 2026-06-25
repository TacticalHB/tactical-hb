"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

export default function NotifyForm() {
  const t = useTranslations("flagship");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    setLoading(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <p className="text-sm tracking-wide py-4" style={{ color: "var(--gold-bright)" }}>
        {t("notify_success")}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
      <input
        type="email"
        name="email"
        required
        placeholder={t("notify_placeholder")}
        className="field-dark flex-1"
        aria-label={t("notify_placeholder")}
      />
      <button
        type="submit"
        disabled={loading}
        className="btn-gold font-display text-base tracking-widest px-6 py-3 whitespace-nowrap disabled:opacity-60"
      >
        {loading ? "..." : t("notify_button")}
      </button>
    </form>
  );
}
