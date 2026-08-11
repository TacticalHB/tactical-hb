import type { Metadata } from "next";
import { metadataFor } from "@/lib/seo";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { getLocale } from "next-intl/server";
import Reveal from "@/components/Reveal";
import { ADMIN_EMAIL } from "@/lib/contact-info";

/* ---------------------------------------------------------------------------
   Public offer / Terms of sale.

   THE CLAUSE UNDER "Order total and delivery" IS PRESCRIBED, not drafted here:
   it is docs/fiscal-payment-wording.md §4, reproduced in both languages. It is
   what makes the commercial model explicit to the customer — the order total is
   the price of the goods for the chosen destination, delivery is inside it, and
   no delivery service is sold separately. Reword it only with the accountant.

   Everything else on this page states what the shop actually does, and nothing
   more. In particular it does NOT interpret tax law, and it does not invent
   registration details: the seller is described as the site already presents
   itself, and the legal identifiers a Ukrainian public offer normally carries
   (ФОП full name, ІПН, registration address) still have to be added by Mario —
   they are his to supply, not mine to guess.

   Layout is the Payment & Delivery page's grammar, one column: a legal document
   should read as a document, so the clauses are numbered and the measure is
   narrow rather than the two-up cards used for marketing copy.
--------------------------------------------------------------------------- */


export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return metadataFor({ locale, path: "/offer", key: "offer" });
}

export default async function OfferPage() {
  const locale = await getLocale();
  return <OfferContent locale={locale} />;
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

function OfferContent({ locale }: { locale: string }) {
  const t = useTranslations("offer");
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
            {uk ? "ОФЕРТА" : "TERMS"}
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
            <Clause n={1} tag={t("seller_tag")}>
              <p>{t("seller_1")}</p>
              {/* The address is appended rather than interpolated: a literal
                  {"{email}"} inside the message is read by next-intl as an ICU
                  argument, which made this render as the raw key. Both
                  languages put the address last, so a trailing link reads
                  correctly in each. */}
              <p>
                {t("seller_2")}{" "}
                <a
                  href={`mailto:${ADMIN_EMAIL}`}
                  className="underline underline-offset-4 transition-opacity hover:opacity-70"
                  style={{ color: "var(--accent-ink)" }}
                >
                  {ADMIN_EMAIL}
                </a>
                .
              </p>
            </Clause>
          </Reveal>

          {/* The prescribed clause. The middle sentence carries the emphasis the
              source document marks in bold — it is the operative one. */}
          <Reveal delay={80}>
            <Clause n={2} tag={t("total_tag")}>
              <p>{t("total_1")}</p>
              <p style={{ color: "var(--text)", fontWeight: 500 }}>{t("total_2")}</p>
              <p>{t("total_3")}</p>
            </Clause>
          </Reveal>

          <Reveal delay={80}>
            <Clause n={3} tag={t("payment_tag")}>
              <p>{t("payment_1")}</p>
              <p>{t("payment_2")}</p>
            </Clause>
          </Reveal>

          <Reveal delay={80}>
            <Clause n={4} tag={t("delivery_tag")}>
              <p>{t("delivery_1")}</p>
              <p>{t("delivery_2")}</p>
            </Clause>
          </Reveal>

          <Reveal delay={80}>
            <Clause n={5} tag={t("returns_tag")}>
              <p>{t("returns_1")}</p>
              <p>
                <Link
                  href={`/${locale}/about#returns`}
                  className="underline underline-offset-4 transition-opacity hover:opacity-70"
                  style={{ color: "var(--accent-ink)" }}
                >
                  {t("returns_link")}
                </Link>
              </p>
            </Clause>
          </Reveal>

          <Reveal delay={80}>
            <Clause n={6} tag={t("more_tag")}>
              <p>{t("more_1")}</p>
              <p>
                <Link
                  href={`/${locale}/delivery`}
                  className="underline underline-offset-4 transition-opacity hover:opacity-70"
                  style={{ color: "var(--accent-ink)" }}
                >
                  {t("more_link")}
                </Link>
              </p>
            </Clause>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
