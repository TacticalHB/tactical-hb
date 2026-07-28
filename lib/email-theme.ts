/* ---------------------------------------------------------------------------
   Shared look for customer emails.

   Extracted so the order confirmation and the shipping notification cannot
   drift apart: one palette, one font stack, one wordmark, one footer. A brand
   that renders two different greys in two consecutive emails looks like two
   different senders.

   Written for email clients, not browsers: tables for layout, inline styles
   only, no flexbox or grid, one 600px column. Rounded corners degrade to square
   in older Outlook, which is fine.

   The wordmark is TEXT, not the logo file. Gmail and Outlook refuse SVG
   outright, and most clients block remote images until the reader allows them —
   a text lockup always renders, and it is the same wordmark the site header
   uses.
--------------------------------------------------------------------------- */

export const BG = "#f7f5f1";
export const CARD = "#ffffff";
export const INK = "#17160f";
export const MUTED = "#6c6860";
export const FAINT = "#a39d92";
export const LINE = "#e4e0d8";
/* The packaging orange, in the same two weights the site uses — email clients
   have no custom properties, so the values are literals of --accent-ink and
   --accent from globals.css and must be changed together with them.
   ACCENT is the deep tone: it is only ever ink on this white card, where the
   bright tone is too light to read. ACCENT_FILL is the bright tone, for the
   one place a block of orange carries dark text. */
export const ACCENT = "#C45A1A";
export const ACCENT_FILL = "#FA8246";
export const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

/** Hryvnia, formatted the way every customer-facing total is. */
export const uah = (n: number) => `₴${Math.round(n).toLocaleString("uk-UA")}`;

/** The wordmark row that opens every email. */
export const wordmarkRow = `
        <!-- Wordmark -->
        <tr><td align="center" style="padding-bottom:28px">
          <span style="font-family:${FONT};font-size:19px;font-weight:700;letter-spacing:3px;color:${INK}">
            TACTICAL <span style="color:${ACCENT}">HB</span>
          </span>
        </td></tr>`;

/** The rule-and-wordmark footer that closes every email. */
export const footerRow = `
        <!-- Footer -->
        <tr><td align="center" style="padding-top:36px;border-top:1px solid ${LINE};margin-top:20px">
          <div style="font-family:${FONT};font-size:12px;letter-spacing:2px;color:${FAINT};padding-top:22px">
            TACTICAL HB
          </div>
        </td></tr>`;

/**
 * The outer shell — background, centring, and the 600px column.
 * `inner` is the table rows between the wordmark and the footer.
 */
export function emailShell(opts: { lang: string; title: string; inner: string }): string {
  return `<!doctype html>
<html lang="${opts.lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${opts.title}</title></head>
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
