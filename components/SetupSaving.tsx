import Price from "./Price";
import { t } from "@/lib/i18n-text";
import type { Money } from "@/lib/currency";

/* ---------------------------------------------------------------------------
   How the full-setup saving is shown — and, just as much, how it is not.

   THE COPY RULE, IN ONE FILE SO IT CAN BE AUDITED IN ONE FILE. This mechanism
   is never called a discount, never quotes a percentage, and never says off,
   promo or sale — nor «знижка» or any relative of it. It states what the
   basket was and what it is, in money, and stops there.

   That is a deliberate tone decision rather than a legal one: a shop that
   shouts a percentage is running a promotion, and this is not a promotion. It
   is what a complete setup costs. The quiet form also survives being true
   forever, which a sale banner does not.

   BOTH HALVES LIVE HERE because they must agree everywhere they appear — the
   bag drawer, the cart page, the checkout panel and the builder all show the
   same two things, and a fourth surface inventing its own wording is how the
   word "discount" gets back in.
--------------------------------------------------------------------------- */

/**
 * The struck-through former figure. Muted and marked up as a deletion so it
 * is announced as one rather than read out as the price the customer pays.
 */
export function WasPrice({
  money,
  locale,
  className = "",
}: {
  money: Money;
  locale: string;
  className?: string;
}) {
  return (
    <s
      className={`text-[13px] tabular-nums ${className}`}
      style={{ color: "var(--text-faint)", textDecorationThickness: "1px" }}
    >
      {/* 通常 = "usually/normally", which is how a Japanese shop marks the
          former figure. A literal "was" would read as a tense, not a price. */}
      {t(locale, { uk: "Було ", en: "Was ", ja: "通常 " })}
      <Price money={money} locale={locale} />
    </s>
  );
}

/** One muted line saying why the figure moved. Names the three pieces. */
export function SetupNote({ locale, className = "" }: { locale: string; className?: string }) {
  return (
    <p className={`text-[12px] leading-snug ${className}`} style={{ color: "var(--text-faint)" }}>
      {t(locale, {
        uk: "Повний сет — чаша, пристрій для нагріву та ковпак.",
        en: "Full setup — bowl, heat device and wind cover.",
        ja: "フルセット — ボウル、ヒートデバイス、ウインドカバー。",
      })}
    </p>
  );
}
