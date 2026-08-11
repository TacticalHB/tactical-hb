import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getLocale } from "next-intl/server";
import Reveal from "@/components/Reveal";
import { ADMIN_EMAIL } from "@/lib/contact-info";
import { metadataFor } from "@/lib/seo";

/* ---------------------------------------------------------------------------
   Privacy Policy.

   THIS PAGE WAS BEING LINKED TO BEFORE IT EXISTED. The newsletter consent
   checkbox says "I have read and understood the Privacy Policy" and the cookie
   banner implies one — while the site collected email addresses, names, phone
   numbers, delivery addresses and marketing consent from customers in the EU.
   Asking someone to confirm they have read a document that does not exist is
   the part that actually matters here.

   IT DESCRIBES THIS CODEBASE, NOT A TEMPLATE. Every category listed was read
   off the schema and the flows: orders and their shipping fields, profiles,
   subscribers, abandoned_carts, favourites, the loyalty tables, and the three
   cookie categories in lib/cookie-consent.ts. If a flow is added that touches
   personal data, this page is part of that change, not a follow-up.

   CLAUSE 04 NAMES CATEGORIES OF RECIPIENT, NOT VENDORS — Mario's call, on 11
   August 2026, and the reason is competitive: a privacy policy is a public
   page, and listing the stack on it tells anyone who looks exactly what this
   business is built on. So "the providers who host this site", not the names.

   The clause itself has to stay, which is why this is a rewrite rather than
   the deletion that was asked for. Telling people who their data reaches is
   the one disclosure the GDPR spells out by name, and it is the whole reason
   this page exists — but the same rule says "recipients OR CATEGORIES of
   recipients", so categories satisfy it exactly. Nothing legal is lost and no
   vendor is named. Deleting the clause outright would have opened a hole in
   the document written to close one.

   Two names survive elsewhere on the site on purpose: the payment processor
   in /offer, because it is what appears on the customer's card statement and
   a mystery line item is worse than a named one, and the carrier, because the
   customer picks it themselves at checkout. Neither is a secret to anyone who
   has bought something. The genuinely private stack is not on the site.

   STILL OUTSTANDING, AND ONLY MARIO CAN SUPPLY IT: the registration
   identifiers for the controller. The seller is described here exactly as
   /offer describes it — same wording, deliberately — so both documents can be
   completed in one pass. A privacy policy whose controller cannot be
   identified beyond a trading name is weaker than one that is late.

   NOT LEGAL ADVICE, and it has not been reviewed by a lawyer. It is an honest,
   specific account of what the software does with personal data, which is the
   right starting point for that review rather than a substitute for it.

   Layout follows /offer's grammar exactly: header band, then numbered clauses
   in one column. Two legal documents on one site should not look like two
   different sites.
--------------------------------------------------------------------------- */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return metadataFor({ locale, path: "/privacy", key: "privacy" });
}

export default async function PrivacyPage() {
  const locale = await getLocale();
  return <PrivacyContent locale={locale} />;
}

function Clause({
  n,
  tag,
  children,
}: {
  n: number;
  tag: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t-2 pt-6" style={{ borderColor: "var(--accent-ink)" }}>
      <span
        className="text-xs tracking-[0.35em] uppercase block mb-5"
        style={{ color: "var(--accent-ink)" }}
      >
        {String(n).padStart(2, "0")} · {tag}
      </span>
      <div
        className="flex flex-col gap-4 text-sm md:text-base leading-relaxed"
        style={{ color: "var(--text-muted)" }}
      >
        {children}
      </div>
    </div>
  );
}

/** A bulleted run inside a clause, for the lists that are genuinely lists. */
function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-3 pl-5" style={{ listStyle: "disc" }}>
      {items.map((item) => (
        <li key={item.slice(0, 32)}>{item}</li>
      ))}
    </ul>
  );
}

function PrivacyContent({ locale }: { locale: string }) {
  const t = useTranslations("privacy");
  const uk = locale === "uk";

  return (
    <div style={{ background: "var(--bg)" }}>
      {/* ---- Header band ---- */}
      <div
        className="relative overflow-hidden pt-36 pb-20"
        style={{ background: "var(--bg-soft)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="absolute inset-0 flex items-center justify-end pr-8 pointer-events-none overflow-hidden">
          <span
            className="font-display text-[13vw] leading-none select-none"
            style={{ color: "rgba(23,22,15,0.035)" }}
          >
            {uk ? "ДАНІ" : "PRIVACY"}
          </span>
        </div>
        <div className="page-container relative">
          <Reveal>
            <span
              className="text-xs tracking-[0.35em] uppercase block mb-4"
              style={{ color: "var(--accent-ink)" }}
            >
              Tactical HB
            </span>
            <h1 className="font-display text-5xl md:text-7xl max-w-3xl" style={{ color: "var(--text)" }}>
              {t("title")}
            </h1>
            <p
              className="mt-6 max-w-xl text-sm md:text-base leading-relaxed"
              style={{ color: "var(--text-muted)" }}
            >
              {t("intro")}
            </p>
            <p className="mt-4 text-xs tracking-[0.18em] uppercase" style={{ color: "var(--text-faint)" }}>
              {t("updated")}
            </p>
          </Reveal>
        </div>
      </div>

      {/* ---- Clauses ---- */}
      <section className="page-container py-24">
        <div className="max-w-3xl flex flex-col gap-14">
          <Reveal>
            <Clause n={1} tag={t("controller_tag")}>
              <p>{t("controller_1")}</p>
              {/* The address is appended rather than interpolated, for the same
                  reason /offer does it: a literal brace inside a message is
                  read by next-intl as an ICU argument and renders as the raw
                  key. Both languages put the address last. */}
              <p>
                {t("controller_2")}{" "}
                <a
                  href={`mailto:${ADMIN_EMAIL}`}
                  className="underline underline-offset-4"
                  style={{ color: "var(--text)" }}
                >
                  {ADMIN_EMAIL}
                </a>
                .
              </p>
            </Clause>
          </Reveal>

          <Reveal>
            <Clause n={2} tag={t("collect_tag")}>
              <p>{t("collect_intro")}</p>
              <Bullets
                items={[
                  t("collect_order"),
                  t("collect_account"),
                  t("collect_newsletter"),
                  t("collect_cart"),
                  t("collect_forms"),
                  t("collect_cookies"),
                ]}
              />
            </Clause>
          </Reveal>

          <Reveal>
            <Clause n={3} tag={t("cookies_tag")}>
              <p>{t("cookies_1")}</p>
              <p>{t("cookies_2")}</p>
            </Clause>
          </Reveal>

          <Reveal>
            <Clause n={4} tag={t("sharing_tag")}>
              <p>{t("sharing_intro")}</p>
              <Bullets
                items={[
                  t("sharing_hosting"),
                  t("sharing_payment"),
                  t("sharing_delivery"),
                  t("sharing_email"),
                  t("sharing_fiscal"),
                ]}
              />
              <p>{t("sharing_legal")}</p>
            </Clause>
          </Reveal>

          <Reveal>
            <Clause n={5} tag={t("retention_tag")}>
              <Bullets
                items={[
                  t("retention_order"),
                  t("retention_account"),
                  t("retention_newsletter"),
                  t("retention_cart"),
                ]}
              />
            </Clause>
          </Reveal>

          <Reveal>
            <Clause n={6} tag={t("rights_tag")}>
              <p>{t("rights_intro")}</p>
              <Bullets
                items={[
                  t("rights_access"),
                  t("rights_rectify"),
                  t("rights_erase"),
                  t("rights_restrict"),
                  t("rights_portability"),
                  t("rights_object"),
                ]}
              />
              <p>{t("rights_withdraw")}</p>
              <p>{t("rights_complain")}</p>
            </Clause>
          </Reveal>

          <Reveal>
            <Clause n={7} tag={t("transfers_tag")}>
              <p>{t("transfers_1")}</p>
            </Clause>
          </Reveal>

          <Reveal>
            <Clause n={8} tag={t("security_tag")}>
              <p>{t("security_1")}</p>
              <p>{t("security_2")}</p>
            </Clause>
          </Reveal>

          <Reveal>
            <Clause n={9} tag={t("children_tag")}>
              <p>{t("children_1")}</p>
            </Clause>
          </Reveal>

          <Reveal>
            <Clause n={10} tag={t("changes_tag")}>
              <p>{t("changes_1")}</p>
            </Clause>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
