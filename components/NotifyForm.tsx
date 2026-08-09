"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { subscribeToNewsletter } from "@/app/actions/newsletter";

/**
 * Launch notification form — light treatment: an underlined field and a dark
 * pill, so it sits in the hero without shouting.
 *
 * IT WRITES TO THE SAME LIST AS THE NEWSLETTER, tagged source 'notify'. There
 * is no separate launch table: one address, one language and one consent
 * record is all any of the flows read, and a second list would only be a
 * second place to forget to honour an unsubscribe.
 *
 * THE FORM'S OWN PROMISE IS THE CONSENT. There is no tickbox here, and there
 * does not need to be one: the field is labelled "be the first to know" and
 * submitting it is an unambiguous request to be emailed. That request starts
 * the welcome series, which is field notes and first looks — the thing the
 * person just asked for — and every one of those carries a real unsubscribe.
 * If that reading is ever challenged, the fix is a consent line in this form,
 * not a silent list.
 */
export default function NotifyForm() {
  const t = useTranslations("flagship");
  const locale = useLocale();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "");
    setLoading(true);
    await subscribeToNewsletter({ email, locale, source: "notify" });
    setLoading(false);
    // Success either way. The field is type="email" and required, so the
    // browser has already refused the obvious mistakes, and there is nothing
    // useful a visitor could do with "that address is already on the list".
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
