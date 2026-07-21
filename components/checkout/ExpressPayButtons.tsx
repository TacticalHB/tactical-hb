"use client";

import { toast } from "sonner";

/* ---------------------------------------------------------------------------
   Express payment options — Apple Pay, Google Pay, PayPal.

   PLACEHOLDERS. Acquiring isn't live, so these deliberately do not pretend to
   start a payment: each one says so plainly when tapped. They stay clickable
   (rather than greyed out) so the checkout feels alive, but nothing here will
   ever let a shopper believe money moved.
--------------------------------------------------------------------------- */

type Method = "apple" | "google" | "paypal";

const LABELS: Record<Method, string> = {
  apple: "Apple Pay",
  google: "Google Pay",
  paypal: "PayPal",
};

function Glyph({ method }: { method: Method }) {
  if (method === "apple") {
    return (
      <svg width="42" height="18" viewBox="0 0 42 18" fill="currentColor" aria-hidden="true">
        <path d="M8.2 3.1c.5-.6.8-1.4.7-2.2-.7 0-1.6.5-2.1 1.1-.5.5-.9 1.4-.7 2.2.8 0 1.6-.4 2.1-1.1zm.7 1.2c-1.2-.1-2.2.7-2.7.7-.6 0-1.4-.6-2.3-.6-1.2 0-2.3.7-2.9 1.8-1.2 2.1-.3 5.3.9 7 .6.9 1.3 1.8 2.2 1.8.9 0 1.2-.6 2.3-.6s1.4.6 2.3.5c.9 0 1.5-.8 2.1-1.7.7-1 .9-1.9.9-2-.1 0-1.8-.7-1.8-2.7 0-1.7 1.4-2.5 1.4-2.5-.7-1.1-1.9-1.3-2.4-1.7z" />
        <text x="14" y="13.5" fontSize="11.5" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="500">Pay</text>
      </svg>
    );
  }
  if (method === "google") {
    return (
      <svg width="48" height="18" viewBox="0 0 48 18" fill="currentColor" aria-hidden="true">
        <text x="0" y="13.5" fontSize="12" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="500">G Pay</text>
      </svg>
    );
  }
  return (
    <svg width="52" height="18" viewBox="0 0 52 18" fill="currentColor" aria-hidden="true">
      <text x="0" y="13.5" fontSize="12" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="600" fontStyle="italic">PayPal</text>
    </svg>
  );
}

export default function ExpressPayButtons({
  locale,
  methods = ["apple", "google", "paypal"],
  className = "",
}: {
  locale: string;
  methods?: Method[];
  className?: string;
}) {
  const uk = locale === "uk";

  const notReady = (m: Method) =>
    toast(uk ? `${LABELS[m]} — незабаром` : `${LABELS[m]} — coming soon`, {
      description: uk
        ? "Онлайн-оплату буде підключено найближчим часом. Оформіть замовлення карткою."
        : "Online payment is being connected shortly. Please continue with card checkout.",
    });

  return (
    <div className={`flex flex-col gap-2.5 ${className}`}>
      {methods.map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => notReady(m)}
          aria-label={`${LABELS[m]} — ${uk ? "незабаром" : "coming soon"}`}
          className="h-12 w-full rounded-full flex items-center justify-center transition-colors"
          style={{
            background: m === "apple" ? "#000000" : m === "google" ? "#ffffff" : "#ffffff",
            color: m === "apple" ? "#ffffff" : "#111111",
            border: m === "apple" ? "1px solid #000000" : "1px solid var(--border-strong)",
          }}
        >
          <Glyph method={m} />
        </button>
      ))}
    </div>
  );
}
