import { formatBoth, type Money } from "@/lib/currency";

/* ---------------------------------------------------------------------------
   One price, both currencies.

   The locale's currency is the headline (УКР → UAH, ENG → EUR) and the other
   sits next to it in small muted text, so both are always visible without
   competing. Every price on the site renders through this so they can never
   drift apart in format.
--------------------------------------------------------------------------- */

export default function Price({
  money,
  locale,
  className = "",
  secondaryClassName = "",
}: {
  money: Money;
  locale: string;
  /** styling for the headline amount — inherits the caller's size/colour */
  className?: string;
  secondaryClassName?: string;
}) {
  const { primary, secondary } = formatBoth(money, locale);
  return (
    <span className={`inline-flex items-baseline gap-2 ${className}`}>
      <span>{primary}</span>
      <span className={`text-[0.8em] font-normal opacity-60 ${secondaryClassName}`}>{secondary}</span>
    </span>
  );
}
