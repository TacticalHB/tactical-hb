"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useCart } from "@/components/CartContext";

/* ---------------------------------------------------------------------------
   Where Monobank returns the customer after payment (redirectUrl).

   Deliberately thin. This page is COSMETIC — the webhook is the source of
   truth: it creates the order, awards loyalty, and sends the confirmation
   email. So this shows a reassuring thank-you and points at the email for
   details; it does not, and must not, try to create or display the order
   itself (the redirect carries no trustworthy order data).

   It does one real thing: clear the cart. The basket is deliberately kept
   through checkout so an abandoned payment leaves it intact — this is the
   first point where we know the customer went through the payment flow, so
   it is the right place to empty it.
--------------------------------------------------------------------------- */

export default function CheckoutSuccessClient({ locale }: { locale: string }) {
  const uk = locale === "uk";
  const { clearCart, hydrated } = useCart();

  // Only clear once the saved cart has actually loaded, or an early call would
  // race the localStorage restore and leave the basket behind.
  useEffect(() => {
    if (hydrated) clearCart();
  }, [hydrated, clearCart]);

  const L = uk
    ? {
        thanks: "Дякуємо — оплату отримано.",
        body: "Ваше замовлення підтверджено. Лист із деталями вже прямує до вас на пошту.",
        note: "Якщо листа немає протягом кількох хвилин, перевірте теку «Спам».",
        back: "Повернутися до магазину",
      }
    : {
        thanks: "Thank you — payment received.",
        body: "Your order is confirmed. A confirmation email with the details is on its way to you.",
        note: "If it doesn't arrive within a few minutes, please check your spam folder.",
        back: "Back to store",
      };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      <div className="px-6 md:px-12 lg:px-16 pt-28 pb-16 flex flex-col flex-1">
        <Link href={`/${locale}`} className="font-display text-xl tracking-widest mb-20" style={{ color: "var(--text)" }}>
          TACTICAL <span style={{ color: "var(--accent)" }}>HB</span>
        </Link>

        <span
          className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-8"
          style={{ background: "var(--bg-soft)" }}
          aria-hidden="true"
        >
          <svg width="22" height="22" viewBox="0 0 14 14" fill="none" style={{ color: "var(--accent)" }}>
            <path d="M2.5 7.5l3 3 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>

        <h1 className="font-display text-3xl md:text-5xl leading-[1.15] max-w-[620px]" style={{ color: "var(--text)" }}>
          {L.thanks}
        </h1>

        <p className="text-[15px] mt-8 max-w-[480px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
          {L.body}
        </p>
        <p className="text-[13px] mt-3 max-w-[480px] leading-relaxed" style={{ color: "var(--text-faint)" }}>
          {L.note}
        </p>

        <div className="mt-auto pt-16">
          <Link
            href={`/${locale}`}
            className="inline-flex h-12 px-12 items-center justify-center text-[15px] font-medium transition-opacity hover:opacity-85"
            style={{ background: "var(--accent)", color: "#111114" }}
          >
            {L.back}
          </Link>
        </div>
      </div>
    </div>
  );
}
