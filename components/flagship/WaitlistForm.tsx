"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { joinFlagshipWaitlist } from "@/app/actions/flagship";

/* ---------------------------------------------------------------------------
   Request early access.

   ONE FIELD, AND THE FORM'S OWN PROMISE IS THE CONSENT. The heading says the
   file opens to this list first and the body says it is one email; submitting
   that is an unambiguous request to be written to. There is no tickbox, for
   the same reason the launch-notify form it replaces had none — but the
   consent line beneath now links to a privacy policy that exists, which it
   could not do a week ago.

   THE REFERENCE COMES BACK FROM THE SERVER, not from anything this component
   knows. It is a count of the list at the moment of signing up, formatted as
   a file number — see app/actions/flagship.ts for why it is not a queue
   position.

   FAILURE IS SHOWN, unlike on the old notify form, which reported success
   whatever happened. On that form it was defensible: it wrote to a list and a
   silent failure cost a newsletter. Here the person believes they have
   secured early access to a launch, and letting them believe it wrongly is
   the one outcome this page cannot afford.
--------------------------------------------------------------------------- */

export default function WaitlistForm({ locale }: { locale: string }) {
  const t = useTranslations("flagship");
  const [reference, setReference] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "");
    setBusy(true);
    setError(false);
    const result = await joinFlagshipWaitlist({ email, locale });
    setBusy(false);
    if (result.ok) setReference(result.reference);
    else setError(true);
  }

  if (reference) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-4">
          <span
            aria-hidden="true"
            style={{ width: 9, height: 9, background: "#F48140", display: "block" }}
          />
          <span className="text-[11px] tracking-[0.24em] uppercase font-semibold">
            {t("wait_granted")}
          </span>
        </div>
        <p className="text-[14px] leading-relaxed mb-6" style={{ color: "rgba(255,255,255,0.5)" }}>
          {t("wait_granted_body")}
        </p>
        {/* The reference, set like a stamped record rather than a receipt. */}
        <div
          className="inline-block px-5 py-3 text-[15px] tracking-[0.18em]"
          style={{
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            color: "#F48140",
            border: "1px solid rgba(244,129,64,0.35)",
          }}
        >
          {reference}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="flex items-center gap-3 mb-4">
        <span
          aria-hidden="true"
          style={{ width: 9, height: 9, background: "#F48140", display: "block" }}
        />
        <span className="text-[11px] tracking-[0.24em] uppercase font-semibold">
          {t("wait_heading")}
        </span>
      </div>

      <p className="text-[14px] leading-relaxed mb-7 max-w-md" style={{ color: "rgba(255,255,255,0.5)" }}>
        {t("wait_body")}
      </p>

      <div className="flex flex-col sm:flex-row gap-3 max-w-lg">
        <label htmlFor="flagship-email" className="sr-only">
          {t("wait_placeholder")}
        </label>
        <input
          id="flagship-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder={t("wait_placeholder")}
          className="flex-1 h-12 px-4 text-[15px] rounded-full"
          style={{
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.25)",
            color: "#f4f3f0",
          }}
        />
        <button
          type="submit"
          disabled={busy}
          className="h-12 px-9 rounded-full text-[12px] font-semibold tracking-[0.2em] uppercase whitespace-nowrap transition-opacity hover:opacity-85 disabled:opacity-50"
          style={{ background: "#F48140", color: "#1a1005" }}
        >
          {busy ? "…" : t("wait_button")}
        </button>
      </div>

      {error && (
        <p role="alert" className="text-[13px] mt-4" style={{ color: "#F48140" }}>
          {t("wait_error")}
        </p>
      )}

      <p className="text-[12px] leading-relaxed mt-6 max-w-md" style={{ color: "rgba(255,255,255,0.32)" }}>
        {t("wait_consent")}{" "}
        <Link
          href={`/${locale}/privacy`}
          className="underline underline-offset-4"
          style={{ color: "rgba(255,255,255,0.55)" }}
        >
          {t("wait_privacy")}
        </Link>
        .
      </p>
    </form>
  );
}
