"use client";

import { useId, useState } from "react";
import { t } from "@/lib/i18n-text";
import type { Product } from "@/lib/products";

/* ---------------------------------------------------------------------------
   A product's FAQ: each question is a button, and pressing it opens the
   answer underneath (Mario, 12 Oct 2026 — first used on FEAR 9E418).

   SEPARATE QUESTIONS, NOT ONE ACCORDION. Each opens and closes on its own, so
   a buyer can keep both answers on screen and compare them. They are rows,
   not the hairline accordions in the buy column, because they sit full width
   under the slogan, where a bare line would read as a divider rather than as
   something to press.

   ACCESSIBLE AS WRITTEN: a real <button> with aria-expanded and
   aria-controls, so the open/closed state is announced. The answer stays in
   the DOM while closed (collapsed by grid rows, and `hidden` from assistive
   tech) so search engines still read it. Logical properties (text-start,
   gap) mean nothing needs an Arabic branch.
--------------------------------------------------------------------------- */

type Faq = NonNullable<NonNullable<Product["pdp"]>["faq"]>[number];

export default function ProductFaq({ faq, locale }: { faq: Faq[]; locale: string }) {
  const title = t(locale, { uk: "Питання та відповіді", en: "FAQ", ja: "よくある質問", ar: "الأسئلة الشائعة" });
  return (
    <section className="page-container pb-20" aria-labelledby="product-faq-title">
      <div className="max-w-[860px]">
        <h2 id="product-faq-title" className="font-display text-4xl md:text-5xl tracking-wide leading-none" style={{ color: "#111" }}>
          {title}
        </h2>
        <div className="mt-8 flex flex-col gap-3">
          {faq.map((f) => (
            <FaqItem
              key={f.qEn}
              q={t(locale, { uk: f.qUk, en: f.qEn, ja: f.qJa, ar: f.qAr })}
              a={t(locale, { uk: f.aUk, en: f.aEn, ja: f.aJa, ar: f.aAr })}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    /* Hover tints the whole card, not the button inside it — on an open card
       a button-only tint drew a band across the question and stopped short
       of the answer. */
    <div className={`rounded-[18px] transition-colors hover:bg-[#ececec] ${open ? "bg-[#efefef]" : "bg-[#f5f5f5]"}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={id}
        className="w-full flex items-center justify-between gap-6 px-6 py-5 text-start rounded-[18px]"
      >
        <span className="text-[16px] md:text-[17px] font-medium" style={{ color: "#111" }}>{q}</span>
        {/* A plus that turns into a cross: the shape says "opens" without a word. */}
        <span
          aria-hidden="true"
          className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center transition-transform duration-[var(--motion-base)]"
          style={{ background: "#111", transform: open ? "rotate(45deg)" : "none" }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round">
            <path d="M7 1.5v11M1.5 7h11" />
          </svg>
        </span>
      </button>
      <div
        id={id}
        role="region"
        aria-hidden={!open}
        className="grid transition-[grid-template-rows] duration-[var(--motion-base)] ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <p className="px-6 pb-6 max-w-[70ch] text-[15px] leading-relaxed" style={{ color: "#4a4a4d" }}>{a}</p>
        </div>
      </div>
    </div>
  );
}
