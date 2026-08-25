import type { Metadata } from "next";
import { metadataFor } from "@/lib/seo";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { partnerForUser } from "@/lib/wholesale-portal";
import WholesaleForm from "@/components/WholesaleForm";
import Reveal from "@/components/Reveal";
import { SALES_EMAIL } from "@/lib/contact-info";


export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return metadataFor({ locale, path: "/wholesale", key: "wholesale" });
}

export default async function WholesalePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  /* ---- WHO IS ASKING DECIDES WHAT THIS PAGE IS ---------------------------

     Anyone with a partner row goes to the portal, whatever their status. The
     portal already renders every one of those states — approved gets the
     catalogue, pending/rejected/suspended get their own status screen with no
     prices and no quantity boxes — so sending them here would mean a second
     copy of all four, and two copies of an access decision is one too many.

     It also fixes the thing that made this page feel broken to an approved
     partner: the nav says "Wholesale", they click it, and they land on
     "Become a partner" with a Register button. They already are one.

     REDIRECT RATHER THAN CONDITIONAL RENDER, chosen once and applied here and
     in the nav: there is exactly one URL that serves dealer prices, which is
     the URL the access check lives on.

     Somebody signed in WITHOUT a partner row — a retail customer — still gets
     the marketing page, because for them it is the right page: it carries the
     story and the enquiry form they need in order to become one.

     The lookup only runs when there is a session cookie to read, so an
     anonymous visitor pays a cookie parse and nothing else. */
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (user) {
    const partner = await partnerForUser(user.id);
    if (partner) redirect(`/${locale}/wholesale/portal`);
  }

  return <WholesaleContent locale={locale} />;
}

function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 14 14" fill="none" aria-hidden="true"
      className="shrink-0 mt-1" style={{ color: "var(--accent)" }}>
      <path d="M2.5 7.5l3 3 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WholesaleContent({ locale }: { locale: string }) {
  const t = useTranslations("wholesale");

  const collaborators = [t("collab_1"), t("collab_2"), t("collab_3")];
  const reasons = [t("why_1"), t("why_2"), t("why_3"), t("why_4"), t("why_5"), t("why_6")];

  return (
    <div style={{ background: "var(--bg)" }}>
      {/* Hero */}
      <div className="relative overflow-hidden pt-36 pb-20" style={{ background: "var(--bg-soft)", borderBottom: "1px solid var(--border)" }}>
        <div className="absolute inset-0 flex items-center justify-end pr-8 pointer-events-none overflow-hidden">
          <span className="font-display text-[16vw] leading-none select-none" style={{ color: "rgba(23,22,15,0.035)" }}>WHOLESALE</span>
        </div>
        <div className="page-container relative">
          <Reveal>
            <h1 className="font-display text-6xl md:text-8xl" style={{ color: "var(--text)" }}>{t("title")}</h1>
            <p className="mt-6 text-base md:text-lg leading-relaxed max-w-2xl" style={{ color: "var(--text-muted)" }}>{t("intro")}</p>
          </Reveal>
        </div>
      </div>

      {/* We collaborate with */}
      <section className="page-container py-20 md:py-24">
        <Reveal>
          <span className="text-xs tracking-[0.35em] uppercase block mb-10" style={{ color: "var(--accent-ink)" }}>{t("collab_title")}</span>
        </Reveal>
        <div className="grid sm:grid-cols-3 gap-8 mb-20">
          {collaborators.map((c, i) => (
            <Reveal key={c} delay={i * 90}>
              <div className="border-t-2 pt-6 h-full" style={{ borderColor: "var(--accent-ink)" }}>
                <div className="font-display text-4xl mb-4" style={{ color: "var(--accent-ink)", opacity: 0.3 }}>0{i + 1}</div>
                <p className="text-sm md:text-base leading-relaxed" style={{ color: "var(--text)" }}>{c}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={120}>
          <p className="text-base md:text-lg leading-relaxed max-w-3xl" style={{ color: "var(--text-muted)" }}>{t("body")}</p>
        </Reveal>
      </section>

      {/* Why partner with us */}
      <section className="py-20 md:py-24" style={{ background: "var(--bg-soft)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div className="page-container">
          <Reveal>
            <h2 className="font-display text-4xl md:text-5xl mb-12" style={{ color: "var(--text)" }}>{t("why_title")}</h2>
          </Reveal>
          <div className="grid sm:grid-cols-2 gap-x-12 gap-y-6 max-w-4xl">
            {reasons.map((r, i) => (
              <Reveal key={r} delay={i * 70}>
                <div className="flex gap-3.5 items-start">
                  <Check />
                  <p className="text-sm md:text-base leading-relaxed" style={{ color: "var(--text)" }}>{r}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Partner accounts — the way IN for people already approved, and the
          way to apply for everyone else. Placed above the enquiry form on
          purpose: a returning partner should not have to scroll past a
          "tell us about your business" form to find the sign-in. */}
      <section className="page-container py-16 md:py-20">
        <Reveal>
          <div
            className="p-8 md:p-12 rounded-[6px]"
            style={{ background: "var(--bg-soft)", border: "1px solid var(--border)" }}
          >
            <h2 className="font-display text-3xl md:text-4xl mb-4" style={{ color: "var(--text)" }}>
              {t("account_title")}
            </h2>
            <p className="text-base leading-relaxed max-w-2xl mb-8" style={{ color: "var(--text-muted)" }}>
              {t("account_body")}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href={`/${locale}/wholesale/portal`}
                className="inline-flex h-12 px-8 rounded-full items-center justify-center text-[15px] font-medium transition-opacity hover:opacity-85"
                style={{ background: "var(--accent)", color: "#111114" }}
              >
                {t("account_signin")}
              </Link>
              <Link
                href={`/${locale}/wholesale/register`}
                className="inline-flex h-12 px-8 rounded-full items-center justify-center text-[15px] font-medium transition-opacity hover:opacity-70"
                style={{ border: "1px solid var(--border-strong)", color: "var(--text)" }}
              >
                {t("account_register")}
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Closing + enquiry form */}
      <section className="page-container py-20 md:py-24 grid md:grid-cols-2 gap-16 items-start">
        <Reveal>
          <div className="md:sticky md:top-32">
            <h2 className="font-display text-4xl md:text-5xl mb-6" style={{ color: "var(--text)" }}>{t("form_heading")}</h2>
            <p className="text-base leading-relaxed max-w-md" style={{ color: "var(--text-muted)" }}>{t("closing")}</p>

            {/* Direct line to sales — the same address the form posts to. */}
            <div className="mt-10 pt-8 max-w-md" style={{ borderTop: "1px solid var(--border)" }}>
              <p className="text-xs tracking-[0.25em] uppercase mb-3" style={{ color: "var(--text-faint)" }}>
                {t("sales_label")}
              </p>
              <a
                href={`mailto:${SALES_EMAIL}`}
                className="inline-flex items-center min-h-11 text-lg md:text-xl break-words transition-opacity hover:opacity-70"
                style={{ color: "var(--text)" }}
              >
                {SALES_EMAIL}
              </a>
              <p className="text-sm leading-relaxed mt-3" style={{ color: "var(--text-muted)" }}>
                {t("sales_note")}
              </p>
            </div>
          </div>
        </Reveal>
        <Reveal delay={140}>
          <WholesaleForm />
        </Reveal>
      </section>
    </div>
  );
}
