"use client";

/* ---------------------------------------------------------------------------
   The honeypot: a field people never see and scripts nearly always fill.

   Positioned off-screen rather than display:none — some bots skip hidden
   inputs. aria-hidden and tabIndex -1 keep it away from screen readers and
   keyboard navigation, so it costs real users nothing.

   Never mark this required, and never give it a name a password manager or
   autofill would recognise.
--------------------------------------------------------------------------- */

export default function HoneypotField() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        left: "-9999px",
        width: 1,
        height: 1,
        overflow: "hidden",
      }}
    >
      <label htmlFor="company_website">Company website</label>
      <input
        id="company_website"
        name="company_website"
        type="text"
        tabIndex={-1}
        autoComplete="off"
      />
    </div>
  );
}
