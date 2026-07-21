"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart, lineKey, linePrice } from "@/components/CartContext";
import { describeLine } from "@/lib/cart-display";
import ExpressPayButtons from "@/components/checkout/ExpressPayButtons";
import CartInfoSections from "./CartInfoSections";
import NewsletterPromo from "@/components/NewsletterPromo";
import Price from "@/components/Price";

/* ---------------------------------------------------------------------------
   Full shopping bag.

   Shipping is shown as a placeholder rather than 0.00 — quoting free shipping
   we haven't calculated would be a promise we can't keep. The total therefore
   reads as the merchandise total, and says so.
--------------------------------------------------------------------------- */

export default function CartPageClient({ locale }: { locale: string }) {
  const { lines, subtotal, changeQty, removeLine, count, hydrated } = useCart();
  const router = useRouter();
  const uk = locale === "uk";

  const L = {
    title: uk ? "Ваш кошик" : "Your Shopping Bag",
    empty: uk ? "У вашому кошику поки що порожньо." : "Your shopping bag is currently empty.",
    browse: uk ? "Перейти до товарів" : "Continue shopping",
    summary: uk ? "Підсумок замовлення" : "Order Summary",
    subtotal: uk ? "Проміжний підсумок" : "Subtotal",
    shipping: uk ? "Доставка" : "Shipping",
    shippingNote: uk ? "Розраховується далі" : "Calculated at checkout",
    total: uk ? "Разом" : "Total",
    totalNote: uk ? "Без вартості доставки" : "Excludes delivery",
    checkout: uk ? "Перейти до оформлення" : "Proceed to checkout",
    or: uk ? "або сплатіть швидше" : "or pay faster with",
    remove: uk ? "Видалити" : "Remove",
    colour: uk ? "Колір" : "Colour",
    material: uk ? "Матеріал" : "Materials",
    qty: uk ? "Кількість" : "Quantity",
    dec: uk ? "Зменшити кількість" : "Decrease quantity",
    inc: uk ? "Збільшити кількість" : "Increase quantity",
  };

  // Don't flash "your bag is empty" at someone whose cart is still loading.
  if (!hydrated) return <div style={{ minHeight: "60vh" }} />;

  if (lines.length === 0) {
    return (
      <div className="page-container pt-36 pb-32">
        <h1 className="font-display text-4xl md:text-5xl mb-6" style={{ color: "var(--text)" }}>{L.title}</h1>
        <p className="text-[15px] mb-8" style={{ color: "var(--text-muted)" }}>{L.empty}</p>
        <Link
          href={`/${locale}/products`}
          className="inline-flex h-12 px-8 rounded-full items-center justify-center text-[15px] font-medium transition-opacity hover:opacity-85"
          style={{ background: "var(--accent)", color: "#111114" }}
        >
          {L.browse}
        </Link>
      </div>
    );
  }

  return (
    <div className="page-container pt-36 pb-24">
      <h1 className="font-display text-4xl md:text-5xl mb-10" style={{ color: "var(--text)" }}>
        {L.title} <span style={{ color: "var(--text-muted)" }}>({count})</span>
      </h1>

      <div className="grid lg:grid-cols-[1fr_380px] gap-12 xl:gap-16 items-start">
        {/* Lines */}
        <div>
          {/* Newsletter prompt — cart page and footer only, never the mini cart. */}
          <NewsletterPromo locale={locale} />

          <ul className="flex flex-col mt-8">
          {lines.map((l, i) => {
            const d = describeLine(l, locale);
            if (!d) return null;
            const key = lineKey(l.slug, l.options);
            return (
              <li
                key={key}
                className="flex flex-col sm:flex-row gap-6 sm:gap-8 py-8"
                style={{ borderTop: i > 0 ? "1px solid var(--border)" : "none" }}
              >
                <Link
                  href={`/${locale}/products/${l.slug}`}
                  className="relative w-full sm:w-[168px] h-[200px] sm:h-[168px] shrink-0"
                  style={{ background: "var(--bg-soft)" }}
                >
                  <Image
                    src={d.image}
                    alt={d.name}
                    fill
                    sizes="(max-width: 640px) 100vw, 168px"
                    className="object-contain p-3"
                  />
                </Link>

                <div className="flex-1 min-w-0 flex flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <Link
                      href={`/${locale}/products/${l.slug}`}
                      className="text-[17px] font-medium leading-snug transition-opacity hover:opacity-70"
                      style={{ color: "var(--text)" }}
                    >
                      {d.name}
                    </Link>
                    <span className="text-[17px] shrink-0" style={{ color: "var(--text)" }}>
                      <Price money={linePrice(l)} locale={locale} />
                    </span>
                  </div>

                  <dl className="mt-2.5 text-[14px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    {d.colour && <div>{L.colour}: <span style={{ color: "var(--text)" }}>{d.colour}</span></div>}
                    {d.material && <div>{L.material}: <span style={{ color: "var(--text)" }}>{d.material}</span></div>}
                    {d.addons && <div>{d.addons}</div>}
                  </dl>

                  <div className="flex items-center justify-between gap-4 mt-auto pt-5">
                    <div className="flex items-center" style={{ border: "1px solid var(--border-strong)" }}>
                      <button
                        onClick={() => changeQty(key, -1)}
                        className="w-10 h-10 flex items-center justify-center transition-opacity hover:opacity-60"
                        style={{ color: "var(--text)" }}
                        aria-label={L.dec}
                      >
                        −
                      </button>
                      <span className="w-10 text-center text-[15px] tabular-nums" style={{ color: "var(--text)" }}>
                        {l.qty}
                      </span>
                      <button
                        onClick={() => changeQty(key, 1)}
                        className="w-10 h-10 flex items-center justify-center transition-opacity hover:opacity-60"
                        style={{ color: "var(--text)" }}
                        aria-label={L.inc}
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => removeLine(key)}
                      className="text-[13px] underline underline-offset-4 transition-opacity hover:opacity-60"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {L.remove}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
          </ul>
        </div>

        {/* Summary */}
        <aside className="lg:sticky lg:top-28 p-7" style={{ background: "var(--bg-soft)" }}>
          <h2 className="text-[17px] font-medium mb-6" style={{ color: "var(--text)" }}>{L.summary}</h2>

          <div className="flex flex-col gap-3 text-[14px]">
            <div className="flex items-center justify-between">
              <span style={{ color: "var(--text-muted)" }}>{L.subtotal}</span>
              <span style={{ color: "var(--text)" }}><Price money={subtotal} locale={locale} /></span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ color: "var(--text-muted)" }}>{L.shipping}</span>
              <span style={{ color: "var(--text-muted)" }}>{L.shippingNote}</span>
            </div>
          </div>

          <div
            className="flex items-center justify-between mt-5 pt-5"
            style={{ borderTop: "1px solid var(--border-strong)" }}
          >
            <span className="text-[15px] font-medium" style={{ color: "var(--text)" }}>{L.total}</span>
            <span className="text-[20px] font-medium" style={{ color: "var(--text)" }}>
              <Price money={subtotal} locale={locale} />
            </span>
          </div>
          <p className="text-[12px] mt-1.5" style={{ color: "var(--text-faint)" }}>{L.totalNote}</p>

          <button
            onClick={() => router.push(`/${locale}/checkout`)}
            className="w-full h-12 rounded-full mt-6 text-[15px] font-medium transition-opacity hover:opacity-85"
            style={{ background: "var(--accent)", color: "#111114" }}
          >
            {L.checkout}
          </button>

          <div className="flex items-center gap-3 my-5">
            <span className="flex-1 h-px" style={{ background: "var(--border-strong)" }} />
            <span className="text-[11px] tracking-[0.15em] uppercase" style={{ color: "var(--text-faint)" }}>{L.or}</span>
            <span className="flex-1 h-px" style={{ background: "var(--border-strong)" }} />
          </div>

          <ExpressPayButtons locale={locale} />

          <CartInfoSections locale={locale} />
        </aside>
      </div>
    </div>
  );
}
