"use client";

import { linePrice, type CartLine } from "@/components/CartContext";
import { WasPrice } from "@/components/SetupSaving";
import { scaleMoney } from "@/lib/currency";
import { BEFORE_HALLOWEEN } from "@/lib/halloween";
import { useHalloween } from "@/components/halloween/useHalloween";

/* The regular line total, struck through, beside a line that is on the
   Halloween sale (31 Oct 2026) — in the bag, the cart page and the checkout
   summary. Renders nothing otherwise. Delete with lib/halloween. */
export default function SaleWas({ line, locale, className = "" }: { line: CartLine; locale: string; className?: string }) {
  useHalloween(); // re-render when the sale starts or ends
  const sale = linePrice(line);
  const regular = linePrice(line, BEFORE_HALLOWEEN);
  if (sale.eur === regular.eur) return null;
  return <WasPrice money={scaleMoney(regular, line.qty)} locale={locale} className={className} />;
}
