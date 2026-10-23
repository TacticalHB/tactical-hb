"use client";

import Price from "@/components/Price";
import type { Money } from "@/lib/currency";
import { halloweenMoney, halloweenEligible } from "@/lib/halloween";
import { useHalloween } from "@/components/halloween/useHalloween";

/* A price that knows about the Halloween sale (31 Oct 2026): the sale price
   in accent ink with the regular one struck through beside it, or the plain
   price any other day. `regular` is always the undiscounted figure — this
   component does the 20%, so a caller can never apply it twice. Delete with
   lib/halloween. */
export default function SalePrice({
  regular,
  category,
  locale,
  className = "",
  wasClassName = "text-[0.85em]",
}: {
  regular: Money;
  category: string;
  locale: string;
  className?: string;
  wasClassName?: string;
}) {
  const on = useHalloween();
  if (!on || !halloweenEligible(category)) return <Price money={regular} locale={locale} className={className} />;
  return (
    <span className={`inline-flex items-baseline gap-2 flex-wrap ${className}`}>
      <span style={{ color: "var(--accent-ink)" }}><Price money={halloweenMoney(regular)} locale={locale} /></span>
      <s className={`font-normal tabular-nums ${wasClassName}`} style={{ color: "#8d8d8f", textDecorationThickness: "1px" }}>
        <Price money={regular} locale={locale} />
      </s>
    </span>
  );
}
