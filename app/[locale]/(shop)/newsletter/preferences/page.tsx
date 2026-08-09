import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import PreferencesPanel from "@/components/newsletter/PreferencesPanel";
import { subscriberByToken } from "@/lib/email/flows";

/* ---------------------------------------------------------------------------
   Where the unsubscribe and "manage preferences" links in every marketing mail
   land.

   THE TOKEN IS LOOKED UP HERE, ON THE SERVER, and only the fields the panel
   needs are handed down. Nothing about the subscriber reaches the client
   bundle beyond their own address and their own language.

   NOTHING IS CHANGED BY LOADING THIS PAGE. `?action=unsubscribe` only tells
   the panel which control to draw attention to; the removal happens on a
   button press. Link scanners fetch every URL in an email before the recipient
   opens it, and a page that unsubscribed on GET would remove people who never
   clicked.

   NOINDEX. These URLs carry a token and are meant for one person; a crawler
   following one out of a leaked mail should not put it in an index.
--------------------------------------------------------------------------- */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function PreferencesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string; action?: string }>;
}) {
  const { locale } = await params;
  const { token = "", action } = await searchParams;
  const t = await getTranslations("newsletter");

  const subscriber = await subscriberByToken(token);

  return (
    <div style={{ background: "var(--bg)" }}>
      <div className="page-container pt-32 pb-24">
        <div className="max-w-[620px]">
          <h1 className="font-display text-3xl md:text-4xl mb-5" style={{ color: "var(--text)" }}>
            {t("prefs_title")}
          </h1>
          <div className="h-px mb-8" style={{ background: "var(--border)" }} />

          {subscriber ? (
            <PreferencesPanel
              token={subscriber.token}
              email={subscriber.email}
              locale={locale}
              subscriberLocale={subscriber.locale === "uk" ? "uk" : "en"}
              unsubscribed={!subscriber.marketing_opt_in || !!subscriber.unsubscribed_at}
              highlightUnsubscribe={action === "unsubscribe"}
            />
          ) : (
            /* An unrecognised token says nothing about why — expired, mistyped,
               or never real. Same answer for all three, so this page cannot be
               used to test tokens. */
            <div>
              <p className="text-[15px] leading-relaxed mb-2" style={{ color: "var(--text)" }}>
                {t("prefs_invalid_title")}
              </p>
              <p className="text-[14px] leading-relaxed mb-8" style={{ color: "var(--text-muted)" }}>
                {t("prefs_invalid_body")}
              </p>
              <Link
                href={`/${locale}/newsletter`}
                className="inline-flex h-12 px-10 items-center justify-center rounded-full text-[15px] font-medium transition-opacity hover:opacity-85"
                style={{ background: "var(--accent)", color: "#111114" }}
              >
                {t("prefs_invalid_cta")}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
