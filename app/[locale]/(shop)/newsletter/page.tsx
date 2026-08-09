import Link from "next/link";
import { getTranslations } from "next-intl/server";
import NewsletterForm from "@/components/newsletter/NewsletterForm";
import UnsubscribeForm from "@/components/newsletter/UnsubscribeForm";
import { createClient } from "@/lib/supabase/server";
import { subscriberByEmail } from "@/lib/email/flows";

/* ---------------------------------------------------------------------------
   The sign-up page, which used to be a trap for anyone already signed in.

   THE LOOP IT CLOSES. The footer's "Subscribe" led here, here looked like an
   account registration — title, name, surname, country, email, and the email
   again with paste disabled — and the most prominent control on the page was
   "I already have an account", which went to /login with no redirect and
   landed the customer on their account page. From there the only way back was
   the footer, and round it went. Someone signed in could not subscribe.

   Three things break it: a signed-in customer is asked only for consent, the
   "already have an account" button is not shown to someone who plainly does,
   and when it IS shown it carries a redirect back to this page.
--------------------------------------------------------------------------- */

export const dynamic = "force-dynamic";

export default async function NewsletterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("newsletter");

  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const accountEmail = user?.email ?? null;

  // Already on the list? Then this page has nothing to ask for, and the honest
  // thing is to say so and point at the controls that do something.
  const existing = accountEmail ? await subscriberByEmail(accountEmail) : null;

  return (
    <div style={{ background: "var(--bg)" }}>
      <div className="page-container pt-32 pb-24">
        <div className="grid lg:grid-cols-[1fr_400px] gap-12 xl:gap-20 items-start">
          {/* Sign-up + unsubscribe */}
          <div className="max-w-[720px] w-full">
            <h1 className="font-display text-3xl md:text-4xl mb-5" style={{ color: "var(--text)" }}>
              {t("title")}
            </h1>
            <div className="h-px mb-8" style={{ background: "var(--border)" }} />

            {existing ? (
              <div className="p-6" style={{ background: "var(--bg-soft)" }}>
                <div className="text-[11px] tracking-[0.2em] uppercase mb-2" style={{ color: "var(--text-faint)" }}>
                  {t("signed_in_as")}
                </div>
                <p className="text-[15px] mb-1" style={{ color: "var(--text)" }}>{existing.email}</p>
                <p className="text-[14px] leading-relaxed mb-5" style={{ color: "var(--text-muted)" }}>
                  {t("already_subscribed")}
                </p>
                <Link
                  href={`/${locale}/newsletter/preferences?token=${existing.token}`}
                  className="inline-flex h-11 px-7 items-center justify-center rounded-full text-[14px] font-medium transition-opacity hover:opacity-85"
                  style={{ background: "var(--accent)", color: "#111114" }}
                >
                  {t("manage_prefs")}
                </Link>
              </div>
            ) : (
              <NewsletterForm locale={locale} accountEmail={accountEmail} />
            )}

            {/* The public, token-less unsubscribe. Pointless for someone signed
                in — their preferences page does it properly, with their address
                already known — so it is only shown to visitors. */}
            {!accountEmail && (
              <div className="mt-20">
                <UnsubscribeForm />
              </div>
            )}
          </div>

          {/* Secondary rail */}
          <aside className="w-full lg:sticky lg:top-28">
            {/* Not shown to someone who obviously has one. This button was the
                exit from the loop described at the top of this file, and the
                redirect is what makes signing in come back here instead of
                dropping the customer on their account page. */}
            {!accountEmail && (
              <Link
                href={`/${locale}/login?redirect=${encodeURIComponent(`/${locale}/newsletter`)}`}
                className="h-12 w-full rounded-full flex items-center justify-center text-[15px] font-medium transition-colors hover:border-black"
                style={{ border: "1px solid var(--border-strong)", color: "var(--text)", background: "var(--field-bg)" }}
              >
                {t("have_account")}
              </Link>
            )}

            {/* Brand panel — the same dark plate used on the About page, so the
                rail carries weight without inventing a new image asset. */}
            <div
              className={`${accountEmail ? "" : "mt-6"} aspect-[4/3] relative overflow-hidden flex items-center justify-center`}
              style={{ background: "var(--ink)" }}
            >
              <span className="font-display text-[7rem] leading-none select-none" style={{ color: "rgba(255,255,255,0.05)" }}>
                TCT
              </span>
              <div className="absolute bottom-7 left-7">
                <div className="text-[11px] tracking-[0.3em] uppercase mb-1.5" style={{ color: "var(--accent)" }}>
                  Ukraine
                </div>
                <div className="font-display text-2xl" style={{ color: "#f4f3f0" }}>Premium Craft</div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
