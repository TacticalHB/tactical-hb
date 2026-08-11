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

   A DARK COVER, THEN PAPER — and the first cut got this wrong. It was
   near-black end to end, on the reasoning that /mr-hb is dark and this is the
   same universe. Two things were wrong with that. Mr HB's darkness is carrying
   full-bleed photography; here every frame is withheld, so the same ground had
   nothing in it and 2,370px of empty near-black read as a void rather than as
   cinema. And a redacted document is BLACK INK ON WHITE PAPER — grey bars on
   black is the photographic negative of the thing being imitated.

   Six of the eight text styles also failed WCAG AA on that ground, some badly
   (the frame references at 1.84:1, the consent line at 2.88:1). Layering ever
   fainter whites on near-black is how that happens, and it is a good signal
   the ground itself is wrong rather than the opacities.

   So the structure is now the one /mr-hb already uses and which this page
   should have borrowed in the first place: a dark cover carrying the title and
   the countdown, then the file itself on the storefront's paper. The bars are
   real ink on real paper, and every contrast failure goes with the change.

   WHAT IS LEGIBLE IS ONLY WHAT IS TRUE. Three spec rows are readable —
   classification, origin, release date — because those three are the only
   things about this product that are known and checkable. Height, weight,
   material, finish, joint, price and run size are all withheld, not because
   the design wanted seven bars but because nobody has told me those numbers
   and inventing one on a page customers will hold us to is how a launch starts
   with a correction.

   THE PRICE IS WITHHELD ON PURPOSE, and would be even if I had it: the $150
   in the strategy is the WHOLESALE figure, and a teaser that names a number
   invites the reader to decide it is too expensive before they have seen the
   thing.

   IT LIVES INSIDE (shop), UNLIKE /mr-hb, which is a story and goes full-bleed
   with its own chrome. This is a commercial page that has to convert, so it
   keeps the navbar, the cart and the footer — someone arriving from an ad must
   be able to shop from here.
--------------------------------------------------------------------------- */

/** The cover band only. Everything below it is the storefront's own palette. */
const COVER_INK = "#0a0b0d";

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

/**
 * A blacked-out value — solid ink with the label knocked out of it, which is
 * what a redaction actually looks like and lands around 16:1 rather than the
 * 3.34:1 the grey-on-black version managed.
 */
function Redacted({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center h-[22px] px-3 text-[10px] tracking-[0.28em] uppercase select-none"
      style={{ background: "var(--text)", color: "var(--bg)" }}
    >
      {label}
    </span>
  );
}

function SpecRow({ label, value, withheld }: { label: string; value?: string; withheld: string }) {
  return (
    <div
      className="flex items-center justify-between gap-6 py-3.5"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      <span className="text-[12px] tracking-[0.16em] uppercase shrink-0" style={{ color: "var(--text-muted)" }}>
        {label}
      </span>
      {value ? (
        <span className="text-[14px] text-right font-medium" style={{ color: "var(--text)" }}>
          {value}
        </span>
      ) : (
        <Redacted label={withheld} />
      )}
    </div>
  );
}

/**
 * A section label: an accent square, then the words in ink.
 *
 * NOT accent-ink TYPE. The deep orange lands at 4.00:1 on the storefront
 * cream, which clears nothing at 11px, and setting a whole label in it is
 * asking a brand colour to do a body colour's job. The square carries the
 * accent and the words stay readable — which is also the rule the rest of the
 * site follows, and what the waitlist heading beneath already does.
 */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-3 mb-5">
      <span
        aria-hidden="true"
        style={{ width: 9, height: 9, background: "var(--accent)", display: "block" }}
      />
      <span
        className="text-[11px] tracking-[0.28em] uppercase font-semibold"
        style={{ color: "var(--text)", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
      >
        {children}
      </span>
    </h2>
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
    <div style={{ background: "var(--bg)" }}>
      {/* ================= THE COVER =================
          The one dark block on the page, and it earns it: title, one line, and
          the countdown. It ends on a hard edge rather than a gradient, the way
          the envelope gives way to the letter on /mr-hb. */}
      <section style={{ background: COVER_INK, color: "#f4f3f0" }}>
        <div className="page-container pt-32 pb-16">
          <div className="flex items-center gap-3 mb-7">
            <span aria-hidden="true" style={{ width: 9, height: 9, background: "#F48140", display: "block" }} />
            <span className="text-[11px] tracking-[0.28em] uppercase font-semibold" style={{ fontFamily: mono }}>
              {t("file_ref")}
            </span>
          </div>

          <h1 className="font-display text-5xl md:text-7xl mb-6">{t("file_title")}</h1>

          <p className="text-[15px] md:text-[17px] leading-relaxed max-w-xl" style={{ color: "rgba(255,255,255,0.62)" }}>
            {t("file_standfirst")}
          </p>

          {/* The countdown stays on the homepage too — this is the same instant
              stated on the page that is actually about it. */}
          <div className="mt-14 pt-10" style={{ borderTop: "1px solid rgba(255,255,255,0.12)" }}>
            <span className="sr-only">{t("countdown_label")}</span>
            <Countdown locale={locale} tone="dark" />
          </div>
        </div>
      </section>

      {/* ================= VISUAL RECORD ================= */}
      <section className="page-container pt-20 pb-16">
        <SectionLabel>{t("frag_heading")}</SectionLabel>
        <p className="text-[14px] leading-relaxed mb-8 max-w-lg" style={{ color: "var(--text-muted)" }}>
          {t("frag_note")}
        </p>

        {/* THREE WITHHELD FRAMES, not three broken image boxes. Each is a
            finished panel that says the record is closed rather than a grey
            rectangle apologising for a missing asset. The plate is #f5f5f5 —
            the catalogue's own studio background, the same literal the
            products grid and the PDP gallery set behind a photograph, so these
            read as frames waiting on the same shelf.

            WHEN CROPS ARRIVE, frag_note MOVES WITH THEM. It first read "Three
            frames cleared for release" over three panels saying IMAGE WITHHELD
            — a page contradicting itself in one eyeful, and the kind of copy
            that gets written for the design you intend rather than the one on
            screen. It now says nothing is cleared, which is true today; the
            day a crop goes in, that sentence changes in the same commit or the
            contradiction comes straight back. */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              /* SHORTER ON A PHONE. At 4:3 the three plates stack into about
                 900px of near-empty paper between the countdown and the spec
                 sheet — a long scroll past nothing to reach the part that
                 actually says something. Wide and shallow keeps them a set of
                 three without making the reader pay for it; they go back to
                 4:3 the moment there is a second column to sit in. */
              className="relative aspect-[5/2] sm:aspect-[4/3] grid place-items-center overflow-hidden rounded-[14px]"
              style={{ background: "#f5f5f5", border: "1px solid var(--border)" }}
            >
              <div className="flex flex-col items-center gap-3">
                <Redacted label={t("frag_withheld")} />
                <span className="text-[10px] tracking-[0.2em]" style={{ fontFamily: mono, color: "var(--text-muted)" }}>
                  TCT-04 · {String(n).padStart(2, "0")}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= SPECIFICATION ================= */}
      <section className="page-container pb-16">
        <div className="max-w-2xl">
          <SectionLabel>{t("spec_heading")}</SectionLabel>
          <div style={{ borderTop: "2px solid var(--text)" }}>
            {specs.map((s) => (
              <SpecRow key={s.label} label={s.label} value={s.value} withheld={t("spec_withheld")} />
            ))}
          </div>
          <p className="text-[12px] mt-5" style={{ color: "var(--text-muted)" }}>
            {t("spec_note")}
          </p>
        </div>
      </section>

      {/* ================= EARLY ACCESS ================= */}
      <section className="page-container pb-16">
        <div
          className="p-8 md:p-11 rounded-[18px]"
          style={{ background: "var(--bg-soft)", border: "1px solid var(--border)" }}
        >
          <WaitlistForm locale={locale} />
        </div>
      </section>

      {/* ================= PARTNERS =================
          A separate route on purpose. The plan is that the 33 existing
          wholesale partners are contacted and order BEFORE this page opens to
          the public, so a partner arriving here must not be dropped into the
          same email box as a stranger — they are further along than it. */}
      <section className="page-container pb-24">
        <div className="max-w-2xl pt-12" style={{ borderTop: "1px solid var(--border)" }}>
          <SectionLabel>{t("partner_heading")}</SectionLabel>
          <p className="text-[14px] leading-relaxed mb-7" style={{ color: "var(--text-muted)" }}>
            {t("partner_body")}
          </p>
          <div className="flex flex-wrap items-center gap-6">
            <Link
              href={`/${locale}/wholesale`}
              className="inline-flex h-12 px-9 rounded-full items-center justify-center text-[12px] font-semibold tracking-[0.2em] uppercase transition-colors hover:bg-black/5"
              style={{ border: "1px solid var(--border-strong)", color: "var(--text)" }}
            >
              {t("partner_cta")}
            </Link>
            <Link
              href={`/${locale}/products`}
              className="text-[13px] underline underline-offset-4 transition-opacity hover:opacity-70"
              style={{ color: "var(--text-muted)" }}
            >
              {t("back")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
