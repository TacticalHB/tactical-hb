import "server-only";
import { esc } from "@/lib/email";
import { CARD, INK, MUTED, FONT, emailShell } from "@/lib/email-theme";

/* ---------------------------------------------------------------------------
   The wholesale follow-up, dressed in the brand.

   Same shell, palette, wordmark and footer as the order confirmation, the
   shipping notification and the wholesale auto-reply — all of them import
   lib/email-theme, so a partner who has had all four sees one sender.

   NO HEADLINE, on purpose. Its siblings open with a big centred line because
   they announce something: an order, a parcel, a next step. This one is a
   short personal note asking how business is going, and a 27px banner over
   three sentences turns a message from a person into a notice from a company
   — which is exactly the thing §6.3's "keep partners warm" is trying not to
   send. Wordmark, letter, footer. Nothing else.

   THE TEXT IS THE FOUNDER'S, NOT THE TEMPLATE'S. What arrives here has been
   read and edited in /admin/followups; this function only lays it out. So
   every line is escaped — the body is untrusted input by the time it reaches
   HTML, even though the person who typed it is the site's own admin.
--------------------------------------------------------------------------- */

export type FollowUpMail = { subject: string; html: string; text: string };

/**
 * Lay out a plain-text letter as the brand's HTML email.
 *
 * Blank lines separate paragraphs; a single newline inside one becomes a
 * <br>, so a signature block stays a block. Nothing else is interpreted —
 * there is no markdown here, because a stray asterisk in a partner's name
 * should not turn into emphasis on its way out.
 */
export function buildFollowUpMail(input: {
  locale: "en" | "uk";
  subject: string;
  body: string;
}): FollowUpMail {
  const paragraphs = input.body
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const para = (s: string, top: number) => `
            <tr><td style="font-family:${FONT};font-size:15px;line-height:1.65;color:${INK};padding-top:${top}px">
              ${esc(s).replace(/\n/g, "<br>")}
            </td></tr>`;

  // The last paragraph is the sign-off in every draft the agent produces, and
  // in most the founder writes. Muting it is the same treatment the wholesale
  // reply gives its signature, and it degrades harmlessly when the letter has
  // been rewritten into a single block.
  const lastIndex = paragraphs.length - 1;

  const inner = `
        <!-- Letter -->
        <tr><td style="background:${CARD};border-radius:14px;padding:26px 24px">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
${paragraphs
  .map((p, i) =>
    i === lastIndex && paragraphs.length > 1
      ? `            <tr><td style="font-family:${FONT};font-size:15px;line-height:1.65;color:${MUTED};padding-top:24px">
              ${esc(p).replace(/\n/g, "<br>")}
            </td></tr>`
      : para(p, i === 0 ? 0 : 16)
  )
  .join("")}
          </table>
        </td></tr>`;

  return {
    subject: input.subject,
    html: emailShell({ lang: input.locale, title: esc(input.subject), inner }),
    // The plain-text part is the founder's letter exactly as typed. Mail
    // clients that show it are showing what was written, unlaid-out.
    text: `${input.body.trim()}\n\nTACTICAL HB`,
  };
}
