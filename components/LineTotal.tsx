import Price from "@/components/Price";
import { scaleMoney, type Money } from "@/lib/currency";
import { t } from "@/lib/i18n-text";

/* ---------------------------------------------------------------------------
   What one bag line costs: the line total, and — only when there is more than
   one — the unit price under it.

   The bag, the drawer and the checkout summary used to print the unit price
   beside "Qty 2", so a line of two ₴430 bowls read ₴430 while the subtotal
   below counted ₴860 (pre-launch audit, BUG-12). One component so the three
   places cannot drift apart again.
--------------------------------------------------------------------------- */
export default function LineTotal({ unit, qty, locale }: { unit: Money; qty: number; locale: string }) {
  return (
    <span className="inline-flex flex-col items-end">
      <Price money={scaleMoney(unit, qty)} locale={locale} />
      {qty > 1 && (
        <span className="text-[11.5px] font-normal" style={{ color: "var(--text-muted)" }}>
          <Price money={unit} locale={locale} /> {t(locale, { uk: "за шт.", en: "each", ja: "/ 点", ar: "للقطعة" })}
        </span>
      )}
    </span>
  );
}
