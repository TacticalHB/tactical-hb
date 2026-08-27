/* ---------------------------------------------------------------------------
   Shared look for every email this shop sends.

   ONE PALETTE, FOR BOTH FAMILIES. The four transactional letters — order
   confirmation, shipping notice, wholesale reply, follow-up — and the
   marketing flows in lib/email/ all read their colours, their font and their
   wordmark from here. lib/email/template.ts used to carry its own copies,
   transcribed from the editorial master, and they had already drifted: five of
   seven tokens differed and the accent was a third orange. Two emails from one
   brand arriving in one inbox in two different creams looks like two senders.

   THE VALUES ARE THE EDITORIAL MASTER'S. That is the direction Mario chose —
   the marketing look is the house look now, and the transactional letters came
   to it rather than the other way round.

   Written for email clients, not browsers: tables for layout, inline styles
   only, no flexbox or grid, one 600px column. Rounded corners degrade to
   square in older Outlook, which is fine.
--------------------------------------------------------------------------- */

const SITE = (process.env.SITE_URL || "https://tactical-hb.com").replace(/\/$/, "");

export const BG = "#F3F1EC";
export const CARD = "#FFFFFF";
export const INK = "#1A1915";
export const MUTED = "#6B6862";
export const FAINT = "#98948C";
export const LINE = "#E7E3DC";

/* The packaging orange, in the same two weights the site uses — email clients
   have no custom properties, so these are literals of --accent-ink and
   --accent from globals.css and must be changed together with them.

   ACCENT is the deep tone: only ever ink on a white card, where the bright
   tone is too light to read. ACCENT_FILL is the bright tone, and every block
   of it carries DARK text.

   WHY DARK AND NOT WHITE, since the editorial master fills its pill with
   orange and sets the label in white: white on this orange measures 2.5:1,
   against the 4.5:1 a body-sized label needs. Dark on the same fill is 7.5:1.
   It is also what the site's own buttons do and what the shipping notice has
   always done, so the one white-on-orange pill in the master was the odd one
   out on legibility and on precedent alike. The fill colour is unchanged to
   the eye — the master's #F48140 and this #FA8246 sit 1.03:1 apart — so what
   moved is the label, not the button. */
export const ACCENT = "#C45A1A";
export const ACCENT_FILL = "#FA8246";
export const ACCENT_TEXT = "#111114";

/* Inter first, because it is the site's face and the mark is now set in it.
   NO WEBFONT IS LOADED, deliberately: Gmail and Outlook strip <link> anyway,
   and a Google Fonts request on open is a remote call that reports the open.
   So this renders in Inter where the reader already has it and falls back to
   the same Helvetica/Arial as before everywhere else — which is the closest
   ubiquitous match to Inter, and exactly what this stack was already doing. */
export const FONT = "Inter,'Helvetica Neue',Helvetica,Arial,sans-serif";

/** The hosted mark. A PNG, not the SVG: Gmail and Outlook refuse SVG outright. */
export const MARK_URL = `${SITE}/email/tct-mark.png`;

/** Hryvnia, formatted the way every customer-facing total is. */
export const uah = (n: number) => `₴${Math.round(n).toLocaleString("uk-UA")}`;

/** The mark-over-wordmark lockup that opens every email.

    The mark is a remote image and most clients block those until the reader
    allows them, so the wordmark underneath is TEXT and carries the brand on
    its own. The alt is "TCT" for the same reason: a blocked image should read
    as the mark's name, not as a broken tile. */
/* ---- The lockup, matched to the site -------------------------------------

   TWO SHELLS, ONE MARK. The transactional shell below and the marketing shell
   in lib/email/template each used to spell this out, identically, and that is
   how the palette drifted the last time. They now share these two constants,
   so the mark can only be changed for both at once.

   IT IS THE SITE'S LOCKUP AT EMAIL SCALE: the body face, medium rather than
   bold, and the letters tracked at the same 0.32em the header and footer use
   (4.5px at 14px). It used to be bold at 10px — 0.71em — which read as a
   different, wider mark than the one on the site it links to.

   HB IS THE DEEP ORANGE, AND THAT IS A FIX. This mark sits on the cream
   ground, not on the white card, and it was set in ACCENT_FILL: the bright
   tone measures 2.23:1 there. The rule at the top of this file already said
   so — the bright tone is for blocks of fill, the deep tone is ink on light —
   and the wordmark was the one place breaking it. ACCENT reaches 3.86:1.
   Short of AA at body size, and the honest ceiling for an orange on cream;
   the site's light-ground chrome sits at the same 4.00:1 for the same reason.
--------------------------------------------------------------------------- */
/* ---- The webfont, and exactly what it can and cannot do -------------------

   WHO ACTUALLY GETS IT: Apple Mail and iOS Mail, plus Samsung Mail — WebKit
   clients that honour a stylesheet link. That is a large share of opens and the
   reason this is here at all. Gmail and Outlook.com strip the link outright and
   render the Helvetica/Arial fallback, which is the closest ubiquitous match to
   Inter and what every one of these letters looked like before today. Nobody
   gets a broken mark; some readers get the exact one.

   HIDDEN FROM OUTLOOK ON PURPOSE. The conditional wrapper means the Word engine
   never sees the link. Left visible it can fail to resolve the face and fall
   through to Times New Roman — a serif, in a mark that is the brand — which is
   far worse than the Arial it falls back to cleanly when the link is not there.

   ONE VARIABLE FILE, NOT FIVE STATICS. These letters use 400 through 800, and
   the range asks css2 for a single variable font rather than five separate
   downloads. `display=swap` means the text is readable in the fallback while it
   loads and never invisible.

   IT IS A REMOTE REQUEST ON OPEN, and that is a real cost, not a footnote: it
   tells Google's CDN that this address opened this mail, roughly when. Mario
   asked for it knowing that. If it should ever come out, deleting this constant
   and its two uses restores exactly the previous behaviour.
--------------------------------------------------------------------------- */
export const FONT_LINK =
  `<!--[if !mso]><!-->` +
  `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400..800&display=swap">` +
  `<!--<![endif]-->`;

export const WORDMARK_TYPE =
  `font-family:${FONT};font-size:14px;font-weight:500;letter-spacing:4.5px;color:#1B1B16`;

/** The mark itself. `TACTICAL` inherits the colour; only HB is set. */
export const WORDMARK_HTML = `TACTICAL <span style="color:${ACCENT}">HB</span>`;

export const wordmarkRow = `
        <!-- Wordmark -->
        <tr><td align="center" style="padding-bottom:6px">
          <img src="${MARK_URL}" width="36" height="36" alt="TCT" style="display:inline-block;vertical-align:middle">
        </td></tr>
        <tr><td align="center" style="padding:12px 0 28px">
          <span style="${WORDMARK_TYPE}">${WORDMARK_HTML}</span>
        </td></tr>`;

/** The small mark, site link and social row that closes every email.

    `extra` is appended below the social row and above the country line — the
    marketing flows pass their unsubscribe and preferences links there, and the
    transactional letters pass nothing, because an order confirmation must not
    offer to unsubscribe from itself. */
export function footerRows(extra = ""): string {
  return `
        <!-- Footer -->
        <tr><td align="center" style="padding-top:36px">
          <img src="${MARK_URL}" width="22" height="22" alt="TCT" style="display:inline-block;opacity:.85">
        </td></tr>
        <tr><td align="center" style="padding-top:14px;font-family:${FONT};font-size:13px;font-weight:600">
          <a href="${SITE}" style="color:#3A3D40;text-decoration:none">tactical-hb.com</a>
        </td></tr>
        <tr><td align="center" style="padding-top:12px;font-family:${FONT};font-size:12px;color:${MUTED}">
          <a href="https://www.instagram.com/tactical_hb/" style="color:${MUTED};text-decoration:none">Instagram</a>
          &nbsp;&middot;&nbsp;
          <a href="https://www.tiktok.com/@tactical_hb" style="color:${MUTED};text-decoration:none">TikTok</a>
          &nbsp;&middot;&nbsp;
          <a href="https://www.linkedin.com/company/tactical-hb" style="color:${MUTED};text-decoration:none">LinkedIn</a>
        </td></tr>${extra}
        <tr><td align="center" style="padding-top:10px;font-family:${FONT};font-size:11px;letter-spacing:.04em;color:#B0ACA3">
          Tactical HB &middot; Ukraine
        </td></tr>`;
}

/** Kept as a constant because the four transactional builders import it. */
export const footerRow = footerRows();

/**
 * The outer shell — background, centring, and the 600px column.
 * `inner` is the table rows between the wordmark and the footer.
 */
export function emailShell(opts: { lang: string; title: string; inner: string }): string {
  return `<!doctype html>
<html lang="${opts.lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${opts.title}</title>
${FONT_LINK}</head>
<body style="margin:0;padding:0;background:${BG}">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BG}">
    <tr><td align="center" style="padding:36px 16px 48px">

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:100%;max-width:600px">
${wordmarkRow}
${opts.inner}
${footerRow}

      </table>
    </td></tr>
  </table>
</body></html>`;
}
