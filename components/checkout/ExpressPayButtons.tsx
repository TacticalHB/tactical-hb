"use client";

import { toast } from "sonner";

/* ---------------------------------------------------------------------------
   Express payment options — Apple Pay, Google Pay, PayPal.

   Each keeps its OWN official brand presentation: Apple Pay black, PayPal
   blue with the two-tone wordmark, Google Pay white with the four-colour G.
   These marks are prescribed by each provider's brand guidelines, so the
   Tactical HB accent deliberately does not appear here — our accent stays on
   our own primary actions.

   PLACEHOLDERS: acquiring isn't live, so none of these start a payment. They
   say so plainly when tapped rather than implying money moved.
--------------------------------------------------------------------------- */

type Method = "apple" | "google" | "paypal";

const LABELS: Record<Method, string> = {
  apple: "Apple Pay",
  google: "Google Pay",
  paypal: "PayPal",
};

function AppleMark() {
  return (
    <svg width="46" height="20" viewBox="0 0 42 18" fill="currentColor" aria-hidden="true">
      <path d="M8.2 3.1c.5-.6.8-1.4.7-2.2-.7 0-1.6.5-2.1 1.1-.5.5-.9 1.4-.7 2.2.8 0 1.6-.4 2.1-1.1zm.7 1.2c-1.2-.1-2.2.7-2.7.7-.6 0-1.4-.6-2.3-.6-1.2 0-2.3.7-2.9 1.8-1.2 2.1-.3 5.3.9 7 .6.9 1.3 1.8 2.2 1.8.9 0 1.2-.6 2.3-.6s1.4.6 2.3.5c.9 0 1.5-.8 2.1-1.7.7-1 .9-1.9.9-2-.1 0-1.8-.7-1.8-2.7 0-1.7 1.4-2.5 1.4-2.5-.7-1.1-1.9-1.3-2.4-1.7z" />
      <text x="14" y="13.5" fontSize="11.5" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="500">Pay</text>
    </svg>
  );
}

/** The Google "G" in its four official colours. */
function GoogleG({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

/** PayPal's two-tone wordmark: "Pay" dark navy, "Pal" light blue. */
function PayPalMark({ locale }: { locale: string }) {
  const uk = locale === "uk";
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-[14px]" style={{ color: "#ffffff" }}>
        {uk ? "Сплатити через" : "Pay with"}
      </span>
      <span className="text-[15px] font-bold italic leading-none">
        <span style={{ color: "#003087" }}>Pay</span>
        <span style={{ color: "#009cde" }}>Pal</span>
      </span>
    </span>
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

  // Official presentation per provider — not our brand palette.
  const skin: Record<Method, { background: string; border: string; color: string }> = {
    apple: { background: "#000000", border: "1px solid #000000", color: "#ffffff" },
    paypal: { background: "#0070ba", border: "1px solid #0070ba", color: "#ffffff" },
    google: { background: "#ffffff", border: "1px solid #dadce0", color: "#3c4043" },
  };

  return (
    <div className={`flex flex-col gap-2.5 ${className}`}>
      {methods.map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => notReady(m)}
          aria-label={`${LABELS[m]} — ${uk ? "незабаром" : "coming soon"}`}
          className="h-12 w-full rounded-full flex items-center justify-center transition-opacity hover:opacity-90"
          style={skin[m]}
        >
          {m === "apple" && <AppleMark />}
          {m === "paypal" && <PayPalMark locale={locale} />}
          {m === "google" && (
            <span className="flex items-center gap-2">
              <GoogleG />
              <span className="text-[15px] font-medium" style={{ color: "#3c4043" }}>Pay</span>
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
