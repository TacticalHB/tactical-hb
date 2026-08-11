"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { subscribeToNewsletter } from "@/app/actions/newsletter";

/* ---------------------------------------------------------------------------
   Newsletter sign-up.

   THE CONSENT CHECKBOX IS THE MARKETING OPT-IN, and nothing is stored without
   it: the submit is refused before the action is called, so an address only
   ever reaches the subscribers table attached to an explicit yes. Ticking it
   also starts the four-part welcome series (W1 now, then +2, +5 and +9 days).

   IT ASKS FOR AN EMAIL ADDRESS AND NOTHING ELSE. It used to ask for a title,
   a first name, a surname, a country, the address, and then the address a
   second time with paste disabled — six fields and a confirmation to join a
   mailing list. Every one of those except the address was thrown away on
   submit: the subscribers table holds an address, a language and a consent
   record, because that is all any flow reads.

   So the form was costing conversions to collect nothing. Worse, under
   data-protection rules it was asking for personal data with no purpose to
   justify it, which is precisely what those rules exist to prevent. The
   confirm-email field went with them — it guards against a typo by doubling
   the work for everyone, and the welcome email already proves the address
   within seconds by either arriving or not.

   If a personalised send is ever built, the name comes back WITH the column
   that stores it and the purpose that needs it, not before.

   The full profile form still exists at /newsletter/preferences, which is
   where someone who wants to tell us more can.
--------------------------------------------------------------------------- */

export default function NewsletterForm({
  locale,
  accountEmail,
}: {
  locale: string;
  /**
   * The signed-in customer's address, when there is one.
   *
   * IT COLLAPSES THE FORM TO ONE DECISION. Someone who is already signed in
   * has given us their name and their address once; asking for both again —
   * and for the address twice, with paste disabled — to tick a consent box is
   * a form that punishes the customer for being a customer. With this set the
   * page shows who they are and the single thing it actually needs.
   */
  accountEmail?: string | null;
}) {
  const t = useTranslations("newsletter");
  const signedIn = !!accountEmail;

  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const label = "block text-[11px] tracking-[0.2em] uppercase mb-2";
  const labelSt = { color: "var(--text-faint)" };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // A signed-in customer has one thing to get wrong, and it is the consent.
    // Their address comes from the session, so it is not theirs to mistype.
    if (!signedIn) {
      if (!email.trim()) return setError(t("err_required"));
      if (!/^\S+@\S+\.\S+$/.test(email)) return setError(t("err_email"));
    }
    if (!consent) return setError(t("err_consent"));

    setBusy(true);
    const result = await subscribeToNewsletter({
      email: (accountEmail || email).trim(),
      locale,
      source: "newsletter_page",
    });
    setBusy(false);

    if (!result.ok) {
      // The only two outcomes worth distinguishing: an address we cannot use,
      // and everything else. Neither says whether the address was already on
      // the list — that answer belongs to nobody but the mailbox's owner.
      return setError(result.error === "invalid_email" ? t("err_email") : t("err_failed"));
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="py-6">
        <div>
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
            /* nowrap: the confirmation column is narrower than it was, and
               "Повернутися до магазину" wrapped to two lines inside a fixed
               48px pill, which reads as a squashed button rather than a wide one. */
            className="inline-flex h-12 px-10 items-center justify-center rounded-full text-[15px] font-medium whitespace-nowrap transition-opacity hover:opacity-85"
            style={{ background: "var(--accent)", color: "#111114" }}
          >
            {t("success_back")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="p-5 mb-8" style={{ background: "var(--bg-soft)" }}>
        <p className="text-[14px] leading-relaxed" style={{ color: "var(--text-muted)" }}>{t("intro")}</p>
      </div>

      {/* "Required fields*" was a legend for a form with six of them. With an
          address and a consent tick it is noise above two controls. */}

      {error && (
        <div role="alert" className="mb-6 text-sm px-4 py-3" style={{ background: "#fdecec", color: "#b42318" }}>
          {error}
        </div>
      )}

      {/* SIGNED IN: the address is known, so the page asks for the one thing it
          does not have. The long form below is for visitors we have never met. */}
      {signedIn && (
        <div className="mb-2">
          <div className="p-5" style={{ background: "var(--bg-soft)" }}>
            <div className="text-[11px] tracking-[0.2em] uppercase mb-1.5" style={{ color: "var(--text-faint)" }}>
              {t("signed_in_as")}
            </div>
            <div className="text-[15px]" style={{ color: "var(--text)" }}>{accountEmail}</div>
          </div>
        </div>
      )}

      {/* NOT RENDERED FOR A SIGNED-IN CUSTOMER, rather than hidden with a
          class. The field is `required`, and Chrome refuses to submit a form
          containing a required control it cannot focus — a display:none field
          would block the button with an error only the console sees. */}
      <div className="flex flex-col gap-5">
        {!signedIn && (
          <div>
            <label htmlFor="nl-email" className={label} style={labelSt}>{t("form_email")}</label>
            <input id="nl-email" className="field" type="email" autoComplete="email" value={email}
              onChange={(e) => setEmail(e.target.value)} required />
          </div>
        )}

        <label className="flex items-start gap-3 cursor-pointer mt-1">
          <input
            type="checkbox"
            className="mt-0.5 w-4 h-4 shrink-0"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span className="text-[13.5px] leading-relaxed" style={{ color: "var(--text)" }}>
            {/* THE CONSENT NAMES THE PRIVACY POLICY, so it now links to it.
                This checkbox has always said "I have read and understood the
                Privacy Policy" while no such page existed — asking someone to
                confirm they have read a document that cannot be opened. */}
            {t("consent")}{" "}
            <Link
              href={`/${locale}/privacy`}
              className="underline underline-offset-4"
              style={{ color: "var(--text)" }}
            >
              {t("privacy_link")}
            </Link>
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
