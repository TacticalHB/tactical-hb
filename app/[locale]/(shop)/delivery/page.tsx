import type { Metadata } from "next";
import { metadataFor } from "@/lib/seo";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { getLocale } from "next-intl/server";
import Reveal from "@/components/Reveal";

/* ---------------------------------------------------------------------------
   Payment & Delivery.

   The commercial model this page states is deliberate, not marketing copy:
   the customer pays ONE total for the order, and delivery to the chosen
   destination is part of the goods price — never a separately sold "delivery
   service". The wording follows the FOP-2 brief of 29 July 2026 (§5 EN, §6 UK)
   near-verbatim; edit meaning here only with the accountant in the loop.

   Layout borrows the About page's grammar — soft header band with an oversized
   watermark, accent-ruled cards — so the two content pages read as siblings.
--------------------------------------------------------------------------- */


export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return metadataFor({ locale, path: "/delivery", key: "delivery" });
}

export default async function DeliveryPage() {
  const locale = await getLocale();
  return <DeliveryContent locale={locale} />;
}

function DeliveryContent({ locale }: { locale: string }) {
  const t = useTranslations("delivery");

  const steps = [t("after_1"), t("after_2"), t("after_3")];

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
            {t("eyebrow")}
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
            <p className="mt-6 max-w-xl text-sm md:text-base leading-relaxed" style={{ color: "var(--text-muted)" }}>
              {t("intro")}
            </p>
          </Reveal>
        </div>
      </div>

      {/* ---- Payment / Delivery — the two core statements ---- */}
      <section className="page-container py-24">
        <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-start">
          <Reveal>
            <div className="border-t-2 pt-6" style={{ borderColor: "var(--accent-ink)" }}>
              <span className="text-xs tracking-[0.35em] uppercase block mb-5" style={{ color: "var(--accent-ink)" }}>
                {t("payment_tag")}
              </span>
              <div className="flex flex-col gap-5 text-sm md:text-base leading-relaxed" style={{ color: "var(--text-muted)" }}>
                <p>{t("payment_1")}</p>
                <p style={{ color: "var(--text)" }}>{t("payment_2")}</p>
              </div>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="border-t-2 pt-6" style={{ borderColor: "var(--accent-ink)" }}>
              <span className="text-xs tracking-[0.35em] uppercase block mb-5" style={{ color: "var(--accent-ink)" }}>
                {t("delivery_tag")}
              </span>
              <div className="flex flex-col gap-5 text-sm md:text-base leading-relaxed" style={{ color: "var(--text-muted)" }}>
                <p>{t("delivery_1")}</p>
                <p>{t("delivery_2")}</p>
                <p style={{ color: "var(--text)" }}>{t("delivery_3")}</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---- Ukraine / International ---- */}
      <section className="py-24" style={{ background: "var(--bg-soft)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div className="page-container grid md:grid-cols-2 gap-12 md:gap-16 items-start">
          <Reveal>
            <div>
              <span className="text-xs tracking-[0.35em] uppercase block mb-6" style={{ color: "var(--accent-ink)" }}>
                {t("ua_tag")}
              </span>
              <ul className="flex flex-col gap-4">
                {[t("ua_1"), t("ua_2")].map((line) => (
                  <li key={line} className="flex gap-4 text-sm md:text-base leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    <span aria-hidden="true" className="mt-[0.62em] w-5 h-px shrink-0" style={{ background: "var(--accent-ink)" }} />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div>
              <span className="text-xs tracking-[0.35em] uppercase block mb-6" style={{ color: "var(--accent-ink)" }}>
                {t("intl_tag")}
              </span>
              <ul className="flex flex-col gap-4">
                {[t("intl_1"), t("intl_2"), t("intl_3")].map((line) => (
                  <li key={line} className="flex gap-4 text-sm md:text-base leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    <span aria-hidden="true" className="mt-[0.62em] w-5 h-px shrink-0" style={{ background: "var(--accent-ink)" }} />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---- After you pay — three numbered steps ---- */}
      <section className="page-container py-24">
        <Reveal>
          <span className="text-xs tracking-[0.35em] uppercase block mb-4" style={{ color: "var(--accent-ink)" }}>
            {t("after_tag")}
          </span>
        </Reveal>
        <div className="grid sm:grid-cols-3 gap-8 mt-10">
          {steps.map((s, i) => (
            <Reveal key={s} delay={i * 90}>
              <div className="border-t-2 pt-6 h-full" style={{ borderColor: "var(--accent-ink)" }}>
                <div className="font-display text-5xl mb-5" style={{ color: "var(--accent-ink)", opacity: 0.35 }}>
                  0{i + 1}
                </div>
                <p className="text-sm md:text-base leading-relaxed" style={{ color: "var(--text-muted)" }}>{s}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---- Returns pointer ---- */}
      <section className="py-20" style={{ background: "var(--bg-soft)", borderTop: "1px solid var(--border)" }}>
        <div className="page-container">
          <Reveal>
            <span className="text-xs tracking-[0.35em] uppercase block mb-4" style={{ color: "var(--accent-ink)" }}>
              {t("returns_tag")}
            </span>
            <p className="max-w-2xl text-sm md:text-base leading-relaxed" style={{ color: "var(--text-muted)" }}>
              {t("returns_1")}
            </p>
            {/* The returns policy lives on the About page. */}
            <Link
              href={`/${locale}/about#returns`}
              className="link-accent inline-flex items-center min-h-11 mt-6 text-xs tracking-[0.18em] uppercase border-b pb-1"
            >
              {t("returns_link")} →
            </Link>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
