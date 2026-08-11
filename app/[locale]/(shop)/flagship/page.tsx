import type { Metadata } from "next";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { getLocale } from "next-intl/server";
import Countdown from "@/components/Countdown";
import WaitlistForm from "@/components/flagship/WaitlistForm";
import { metadataFor } from "@/lib/seo";

/* ---------------------------------------------------------------------------
   The flagship file — a teaser for a product that does not exist yet in any
   photograph.

   THE PROBLEM THIS PAGE SOLVES. The homepage countdown pointed at nothing:
   there was no page behind it, so the most-linked thing on the site was a
   timer with no subject. But there is not one pixel of the Tactical Hookah in
   the repository, so a conventional teaser — hero shot, three features, a
   price — cannot be built and would be a lie if it were.

   SO THE WITHHOLDING IS THE CONTENT. A classified file is defined by what is
   blacked out, which makes it the one format where having almost nothing to
   show reads as intent rather than as an empty page. Every unknown is a
   redaction bar, and a redaction bar is not a placeholder waiting to be
   replaced — it is the design working. When Mario supplies a figure, a row
   stops being withheld; until then the page is complete as it stands.

   WHAT IS LEGIBLE IS ONLY WHAT IS TRUE. Three spec rows are readable —
   classification, origin, release date — because those three are the only
   things about this product that are known and checkable. Height, weight,
   material, finish, joint, price and run size are all withheld, not because
   the design wanted seven bars but because nobody has told me those numbers
   and inventing one on a page customers will hold us to is how a launch
   starts with a correction.

   THE PRICE IS WITHHELD ON PURPOSE, and would be even if I had it: the
   $150 in the strategy is the WHOLESALE figure, and a teaser that names a
   number invites the reader to decide it is too expensive before they have
   seen the thing.

   IT LIVES INSIDE (shop), UNLIKE /mr-hb. Mr HB is a story and goes full-bleed
   with its own chrome; this is a commercial page that has to convert, so it
   keeps the navbar, the cart and the footer — someone arriving from an ad
   must be able to shop from here. The dark ground sits between a dark navbar
   and a dark footer without a seam.
--------------------------------------------------------------------------- */

const INK = "#0a0b0d";
const PANEL = "#101215";
const ACCENT = "#F48140";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return metadataFor({ locale, path: "/flagship", key: "flagship" });
}

export default async function FlagshipPage() {
  const locale = await getLocale();
  return <FlagshipFile locale={locale} />;
}

/** A blacked-out value. The bar IS the information. */
function Redacted({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center h-[22px] px-3 text-[10px] tracking-[0.28em] uppercase select-none"
      style={{ background: "rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.38)" }}
    >
      {label}
    </span>
  );
}

function SpecRow({ label, value, withheld }: { label: string; value?: string; withheld: string }) {
  return (
    <div
      className="flex items-center justify-between gap-6 py-3.5"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
    >
      <span className="text-[12px] tracking-[0.16em] uppercase shrink-0" style={{ color: "rgba(255,255,255,0.42)" }}>
        {label}
      </span>
      {value ? (
        <span className="text-[14px] text-right" style={{ color: "#f4f3f0" }}>
          {value}
        </span>
      ) : (
        <Redacted label={withheld} />
      )}
    </div>
  );
}

function FlagshipFile({ locale }: { locale: string }) {
  const t = useTranslations("flagship");
  const mono = "ui-monospace, SFMono-Regular, Menlo, monospace";

  /* Three legible rows and seven bars. The ratio is the honest one, not a
     designed one — see the note at the top of this file. */
  const specs: { label: string; value?: string }[] = [
    { label: t("spec_category"), value: t("spec_category_v") },
    { label: t("spec_origin"), value: t("spec_origin_v") },
    { label: t("spec_release"), value: t("spec_release_v") },
    { label: t("spec_material") },
    { label: t("spec_finish") },
    { label: t("spec_height") },
    { label: t("spec_weight") },
    { label: t("spec_joint") },
    { label: t("spec_units") },
    { label: t("spec_price") },
  ];

  return (
    <div style={{ background: INK, color: "#f4f3f0" }}>
      {/* ================= HEADER ================= */}
      <section className="page-container pt-32 pb-16">
        <div className="flex items-center gap-3 mb-7">
          <span aria-hidden="true" style={{ width: 9, height: 9, background: ACCENT, display: "block" }} />
          <span className="text-[11px] tracking-[0.28em] uppercase font-semibold" style={{ fontFamily: mono }}>
            {t("file_ref")}
          </span>
        </div>

        <h1 className="font-display text-5xl md:text-7xl mb-6">{t("file_title")}</h1>

        <p className="text-[15px] md:text-[17px] leading-relaxed max-w-xl" style={{ color: "rgba(255,255,255,0.5)" }}>
          {t("file_standfirst")}
        </p>

        {/* The countdown stays on the homepage too — this is the same instant
            stated on the page that is actually about it. */}
        <div className="mt-14 pt-10" style={{ borderTop: "1px solid rgba(255,255,255,0.09)" }}>
          <span className="sr-only">{t("countdown_label")}</span>
          <Countdown locale={locale} tone="dark" />
        </div>
      </section>

      {/* ================= VISUAL RECORD ================= */}
      <section className="page-container pb-20">
        <div className="flex items-baseline justify-between gap-6 mb-6">
          <h2 className="text-[11px] tracking-[0.28em] uppercase font-semibold" style={{ fontFamily: mono }}>
            {t("frag_heading")}
          </h2>
        </div>
        <p className="text-[13px] leading-relaxed mb-8 max-w-lg" style={{ color: "rgba(255,255,255,0.38)" }}>
          {t("frag_note")}
        </p>

        {/* THREE WITHHELD FRAMES, not three broken image boxes. Each is a
            finished panel that says the record is closed rather than a grey
            rectangle apologising for a missing asset.

            WHEN CROPS ARRIVE, frag_note MOVES WITH THEM. It first read "Three
            frames cleared for release" over three panels that said IMAGE
            WITHHELD — a page contradicting itself in one eyeful, and the kind
            of copy that gets written for the design you intend rather than the
            one on screen. It now says nothing is cleared, which is true today;
            the day a crop goes in, that sentence has to change in the same
            commit or the contradiction comes straight back. */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="relative aspect-[4/3] grid place-items-center overflow-hidden"
              style={{ background: PANEL, border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="flex flex-col items-center gap-3">
                <span
                  className="inline-flex items-center h-[22px] px-3 text-[10px] tracking-[0.28em] uppercase"
                  style={{ background: "rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.38)" }}
                >
                  {t("frag_withheld")}
                </span>
                <span className="text-[10px] tracking-[0.2em]" style={{ fontFamily: mono, color: "rgba(255,255,255,0.2)" }}>
                  TCT-04 · {String(n).padStart(2, "0")}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= SPECIFICATION ================= */}
      <section className="page-container pb-20">
        <div className="max-w-2xl">
          <h2 className="text-[11px] tracking-[0.28em] uppercase font-semibold mb-6" style={{ fontFamily: mono }}>
            {t("spec_heading")}
          </h2>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.14)" }}>
            {specs.map((s) => (
              <SpecRow key={s.label} label={s.label} value={s.value} withheld={t("spec_withheld")} />
            ))}
          </div>
          <p className="text-[12px] mt-5" style={{ color: "rgba(255,255,255,0.3)" }}>
            {t("spec_note")}
          </p>
        </div>
      </section>

      {/* ================= EARLY ACCESS ================= */}
      <section className="page-container pb-20">
        <div className="p-8 md:p-11" style={{ background: PANEL, border: "1px solid rgba(255,255,255,0.07)" }}>
          <WaitlistForm locale={locale} />
        </div>
      </section>

      {/* ================= PARTNERS =================
          A separate route on purpose. The plan is that the 33 existing
          wholesale partners are contacted and order BEFORE this page opens to
          the public, so a partner arriving here must not be dropped into the
          same email box as a stranger — they are further along than it. */}
      <section className="page-container pb-24">
        <div className="max-w-2xl pt-10" style={{ borderTop: "1px solid rgba(255,255,255,0.09)" }}>
          <h2 className="text-[11px] tracking-[0.28em] uppercase font-semibold mb-5" style={{ fontFamily: mono }}>
            {t("partner_heading")}
          </h2>
          <p className="text-[14px] leading-relaxed mb-7" style={{ color: "rgba(255,255,255,0.5)" }}>
            {t("partner_body")}
          </p>
          <div className="flex flex-wrap items-center gap-6">
            <Link
              href={`/${locale}/wholesale`}
              className="inline-flex h-12 px-9 rounded-full items-center justify-center text-[12px] font-semibold tracking-[0.2em] uppercase transition-opacity hover:opacity-70"
              style={{ border: "1px solid rgba(255,255,255,0.25)", color: "#f4f3f0" }}
            >
              {t("partner_cta")}
            </Link>
            <Link
              href={`/${locale}/products`}
              className="text-[13px] underline underline-offset-4 transition-opacity hover:opacity-70"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              {t("back")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
