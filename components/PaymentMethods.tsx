/* ---------------------------------------------------------------------------
   Accepted payment methods — the badge row shown in the footer.

   These are the methods a customer actually meets on Monobank's Plata secure
   page: Visa / Mastercard cards, plus Apple Pay and Google Pay (the latter two
   render on the relevant device). PayPal is deliberately absent — Plata does
   not offer it, so we don't imply it.

   Designed for the dark footer: subtle translucent chips with recognisable
   brand marks. Purely informational — no click behaviour.
--------------------------------------------------------------------------- */

const chip: React.CSSProperties = {
  height: 30,
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: 6,
};

function Visa() {
  return (
    <svg width="34" height="12" viewBox="0 0 48 16" aria-hidden="true">
      <text x="24" y="13" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="700" fontStyle="italic" fontSize="15" letterSpacing="1" fill="#f4f3f0">VISA</text>
    </svg>
  );
}

function Mastercard() {
  return (
    <svg width="30" height="19" viewBox="0 0 32 20" aria-hidden="true">
      <circle cx="12" cy="10" r="8" fill="#EB001B" />
      <circle cx="20" cy="10" r="8" fill="#F79E1B" />
      <path d="M16 3.07A8 8 0 0 1 16 16.93A8 8 0 0 1 16 3.07Z" fill="#FF5F00" />
    </svg>
  );
}

function ApplePay() {
  return (
    <svg width="36" height="15" viewBox="0 0 42 18" fill="#f4f3f0" aria-hidden="true">
      <path d="M8.2 3.1c.5-.6.8-1.4.7-2.2-.7 0-1.6.5-2.1 1.1-.5.5-.9 1.4-.7 2.2.8 0 1.6-.4 2.1-1.1zm.7 1.2c-1.2-.1-2.2.7-2.7.7-.6 0-1.4-.6-2.3-.6-1.2 0-2.3.7-2.9 1.8-1.2 2.1-.3 5.3.9 7 .6.9 1.3 1.8 2.2 1.8.9 0 1.2-.6 2.3-.6s1.4.6 2.3.5c.9 0 1.5-.8 2.1-1.7.7-1 .9-1.9.9-2-.1 0-1.8-.7-1.8-2.7 0-1.7 1.4-2.5 1.4-2.5-.7-1.1-1.9-1.3-2.4-1.7z" />
      <text x="14" y="13.5" fontSize="11.5" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="500">Pay</text>
    </svg>
  );
}

function GooglePay() {
  return (
    <svg width="40" height="16" viewBox="0 0 62 24" aria-hidden="true">
      <g transform="translate(0,2) scale(0.42)">
        <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
        <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
        <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z" />
        <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" />
      </g>
      <text x="26" y="17" fontSize="14" fontFamily="Arial, Helvetica, sans-serif" fontWeight="500" fill="#f4f3f0">Pay</text>
    </svg>
  );
}

const methods = [
  { name: "Visa", icon: <Visa /> },
  { name: "Mastercard", icon: <Mastercard /> },
  { name: "Apple Pay", icon: <ApplePay /> },
  { name: "Google Pay", icon: <GooglePay /> },
];

export default function PaymentMethods() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2.5">
      {methods.map((m) => (
        <span
          key={m.name}
          role="img"
          aria-label={m.name}
          className="inline-flex items-center justify-center px-3"
          style={chip}
        >
          {m.icon}
        </span>
      ))}
    </div>
  );
}
