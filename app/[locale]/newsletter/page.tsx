import Link from "next/link";
import { getTranslations } from "next-intl/server";
import NewsletterForm from "@/components/newsletter/NewsletterForm";
import UnsubscribeForm from "@/components/newsletter/UnsubscribeForm";

export default async function NewsletterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("newsletter");

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

            <NewsletterForm locale={locale} />

            <div className="mt-20">
              <UnsubscribeForm locale={locale} />
            </div>
          </div>

          {/* Secondary rail */}
          <aside className="w-full lg:sticky lg:top-28">
            <Link
              href={`/${locale}/login`}
              className="h-12 w-full rounded-full flex items-center justify-center text-[15px] font-medium transition-colors hover:border-black"
              style={{ border: "1px solid var(--border-strong)", color: "var(--text)", background: "var(--field-bg)" }}
            >
              {t("have_account")}
            </Link>

            {/* Brand panel — the same dark plate used on the About page, so the
                rail carries weight without inventing a new image asset. */}
            <div
              className="mt-6 aspect-[4/3] relative overflow-hidden flex items-center justify-center"
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
