"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

/**
 * Launch notification form — light treatment: an underlined field and a dark
 * pill, so it sits in the hero without shouting.
 *
 * ⚠️ TODO — THIS FORM DOES NOT STORE ANYTHING.
 * handleSubmit fakes a 700ms delay and shows the success copy ("You'll be the
 * first to know"), then discards the address. The site is publicly reachable,
 * so real visitors can and will submit real emails into nothing, and there is
 * no launch list being built for August 2026.
 *
 * To make it real: create a `launch_signups` table (email, locale, created_at)
 * with RLS + explicit grants — remember raw-SQL tables inherit no grants, see
 * supabase/migrations/0002 and 0007 — and POST to a server action from here.
 */
export default function NotifyForm() {
  const t = useTranslations("flagship");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700)); // TODO: replace with a real write
    setLoading(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <p className="text-sm py-3" style={{ color: "var(--text)" }}>
        {t("notify_success")}
      </p>
    );
  }

  // Stacks below sm: side-by-side leaves the field ~100px wide on a phone,
  // too narrow to read your own address as you type it.
  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col sm:flex-row sm:items-end gap-3 w-full max-w-sm"
    >
      <input
        type="email"
        name="email"
        required
        placeholder={t("notify_placeholder")}
        className="notify-field flex-1 min-w-0"
        aria-label={t("notify_placeholder")}
      />
      <button
        type="submit"
        disabled={loading}
        className="notify-submit shrink-0 w-full sm:w-auto rounded-full px-6 py-3 text-xs tracking-[0.12em] uppercase whitespace-nowrap disabled:opacity-50"
      >
        {loading ? "…" : t("notify_button")}
      </button>
    </form>
  );
}
