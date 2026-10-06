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
      /* CLIPPED IN PLACE, NOT PUSHED OFF-SCREEN. `left: -9999px` is off-screen
         only in a left-to-right page: on the Arabic (RTL) storefront the
         page scrolls toward the left, so the field made /ar/contact and
         /ar/wholesale ~8,900px wide on a phone (6 Oct 2026 audit). The
         visually-hidden clip keeps it unseen in either direction, and still
         rendered — which is what makes a bot fill it. */
      style={{
        position: "absolute",
        width: 1,
        height: 1,
        padding: 0,
        margin: -1,
        overflow: "hidden",
        clip: "rect(0 0 0 0)",
        clipPath: "inset(50%)",
        whiteSpace: "nowrap",
        border: 0,
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
