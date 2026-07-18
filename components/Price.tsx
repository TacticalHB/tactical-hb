import { formatMoney, currencyForLocale, type Money } from "@/lib/currency";

/* ---------------------------------------------------------------------------
   One price, one currency.

   The currency follows the site language (УКР → UAH, ENG → EUR) and only
   changes when the language does — never both at once, never side by side.
   Every price renders through this so formats can't drift apart.
--------------------------------------------------------------------------- */

export default function Price({
  money,
  locale,
  className = "",
}: {
  money: Money;
  locale: string;
  /** inherits the caller's size/colour */
  className?: string;
}) {
  return <span className={className}>{formatMoney(money, currencyForLocale(locale))}</span>;
}
