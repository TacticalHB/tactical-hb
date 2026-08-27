/* ---------------------------------------------------------------------------
   TACTICAL HB — the lockup, in one place.

   WHY IT IS A COMPONENT NOW. The mark was hand-written in seven files. When the
   header was matched to the packaging, the footer directly below it still
   carried the old condensed one, and the two sat on the same dark ground three
   screens apart looking like two brands. That is the same shape of problem that
   put the printed price list out of step with the price book twice: one fact,
   several copies, maintained by hand.

   EVERY VALUE HERE IS RELATIVE TO THE FONT SIZE, which is what lets one
   component serve a 15px bar and a 30px footer. Tracking and the gap are both
   in `em`, so they scale together and the proportions hold at any size. The
   caller sets the size and nothing else.

   THE GAP CANNOT BE A SPACE. This is an inline-flex row, and flex layout strips
   the literal space between the text and the span — measured, its advance is 0.
   A spacer element gets the look right and wrecks the accessible name
   ("TACTICALHB", one token, read aloud and copied as one); word-spacing has
   nothing left to act on. So the real space stays in the markup, keeping
   textContent "TACTICAL HB", and the visible gap is drawn beside it with flex
   `gap` — sized at one letter-space, which places HB at twice the inter-letter
   distance. That is the printed lockup: a separate unit, not glued to the L.

   IT IS PINNED LTR. On the Arabic storefront the base direction reversed the
   two spans and the brand read "HB TACTICAL". A logotype is not a sentence — it
   does not translate and it does not mirror, in any script.

   TIGHTER ON MOBILE. Not a compromise on the lockup but the thing that keeps it
   one: at 0.32em the footer mark is about 322px wide, which does not fit a
   375px screen inside the page padding, and the header mark would reach the
   search icon. Both hold at 0.2em.
--------------------------------------------------------------------------- */

/** The packaging orange, given exactly. Deliberately NOT --accent (#FA8246),
    which it sits two points from: this mark is matched to a printed lockup, and
    the pouch is the thing a customer holds next to the screen. */
export const WORDMARK_HB = "#F48140";

/** The off-white the mark is set in on every dark ground the site has. */
export const WORDMARK_INK = "#f4f3f0";

/* ---- Two grounds, two weights of the same orange ---------------------------

   THE LOCKUP IS THE TRACKING, NOT THE COLOUR. Header and footer sit on the dark
   bar; the checkout chrome sits on cream. Painting the dark tone onto cream
   would put the off-white at 1.02:1 against the ground — the mark would simply
   not be there — so the colours switch with the ground while every proportion
   stays identical.

   AND THE BRIGHT ORANGE CANNOT GO ON CREAM EITHER. #F48140 measures 2.39:1
   there. That is the house rule this site already had before this component
   existed: one accent, two weights, bright on dark and deep on light. The deep
   weight (--accent-ink) reaches 4.00:1 — not a pass at body size, but a real
   improvement on the 2.31:1 the checkout has been shipping with --accent, and
   the honest ceiling for an orange on cream. If it ever has to pass outright,
   the answer is a darker orange token, not a different mark.
--------------------------------------------------------------------------- */
type Tone = "dark" | "light";

const TONES: Record<Tone, { ink: string; hb: string }> = {
  dark: { ink: WORDMARK_INK, hb: WORDMARK_HB },
  light: { ink: "var(--text)", hb: "var(--accent-ink)" },
};

export default function Wordmark({
  className = "",
  tone = "dark",
}: {
  className?: string;
  /** Which ground it sits on. `light` is the cream checkout chrome. */
  tone?: Tone;
}) {
  const c = TONES[tone];
  return (
    <span
      dir="ltr"
      className={
        "font-medium uppercase whitespace-nowrap inline-flex items-center " +
        "tracking-[0.2em] md:tracking-[0.32em] gap-[0.2em] md:gap-[0.32em] " +
        className
      }
      style={{ color: c.ink }}
    >
      TACTICAL <span style={{ color: c.hb }}>HB</span>
    </span>
  );
}
