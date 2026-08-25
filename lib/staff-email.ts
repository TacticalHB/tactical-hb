import "server-only";
import { esc } from "@/lib/email";
import {
  ACCENT,
  ACCENT_FILL,
  ACCENT_TEXT,
  CARD,
  FAINT,
  FONT,
  INK,
  MUTED,
  emailShell,
} from "@/lib/email-theme";

/* ---------------------------------------------------------------------------
   The house shape for a letter that goes to US rather than to a customer.

   ONE BUILDER FOR ALL OF THEM, because three staff alerts written separately
   is three that look slightly different by next month. The wholesale flow
   sends an enquiry alert, a registration alert and a request alert; from the
   sales inbox those are three steps of one story and should read as such.

   IT IS THE SAME SHELL AS THE CUSTOMER LETTERS, deliberately — mark, wordmark,
   beige ground, white cards. What differs is what goes IN it: no greeting, no
   sign-off, no marketing voice. A staff alert is read in three seconds to
   decide whether to act, so it leads with the facts as a label/value table and
   ends with the one button that takes you where the acting happens.

   ENGLISH ONLY, like the admin console. A Japanese enquiry arrives here in
   English because this inbox reads English; the customer's own copy is in
   their language, and those are two different readers.

   THE STATUS LINE IS THE LAST THING. Every one of these ends by saying what
   has and has not happened — "no payment has been taken", "they cannot see
   dealer prices until approved" — because the cost of misreading a wholesale
   alert is acting as though money moved when it did not.
--------------------------------------------------------------------------- */

export type StaffLetter = {
  /** Sits under the wordmark. Short: "Wholesale request WH-4F2A". */
  title: string;
  /** One sentence of context above the facts. Optional. */
  lead?: string;
  /** The facts, as label/value pairs. Empty values are dropped. */
  rows?: [string, string | null | undefined][];
  /** Free HTML blocks — a line table, a quoted note. Already escaped. */
  blocks?: string[];
  /** The one place this alert is acted on. */
  cta?: { label: string; url: string };
  /** What has and has not happened. Rendered quiet, at the end. */
  status?: string;
};

/** A quoted block of something a human wrote — an enquiry message, a note. */
export function staffQuote(heading: string, body: string): string {
  /* No rule of its own: a quote is given its own white card, and the card
     edge already separates it. The border this used to draw left a stray line
     floating above the heading with dead space over it. */
  return `
    <div>
      <div style="font-family:${FONT};font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:${FAINT};padding-bottom:6px">
        ${esc(heading)}
      </div>
      <div style="white-space:pre-wrap;font-family:${FONT};font-size:14px;line-height:1.6;color:${INK}">${esc(body)}</div>
    </div>`;
}

export function buildStaffLetter(letter: StaffLetter): string {
  const rows = (letter.rows ?? []).filter(([, v]) => (v ?? "").toString().trim());

  const factRows = rows
    .map(
      ([k, v]) => `
            <tr>
              <td style="padding:5px 18px 5px 0;font-family:${FONT};font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:${FAINT};white-space:nowrap;vertical-align:top">${esc(k)}</td>
              <td style="padding:5px 0;font-family:${FONT};font-size:14px;line-height:1.5;color:${INK}">${esc(String(v))}</td>
            </tr>`
    )
    .join("");

  const factsCard = rows.length
    ? `
        <tr><td style="background:${CARD};border-radius:14px;padding:18px 22px">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            ${factRows}
          </table>
        </td></tr>`
    : "";

  const bodyCards = (letter.blocks ?? [])
    .filter(Boolean)
    .map(
      (b) => `
        <tr><td style="padding-top:14px">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${CARD};border-radius:14px">
            <tr><td style="padding:18px 22px">${b}</td></tr>
          </table>
        </td></tr>`
    )
    .join("");

  const cta = letter.cta
    ? `
        <tr><td align="center" style="padding-top:26px">
          <a href="${esc(letter.cta.url)}" style="display:inline-block;background:${ACCENT_FILL};color:${ACCENT_TEXT};font-family:${FONT};font-size:15px;font-weight:600;text-decoration:none;padding:14px 28px;border-radius:999px">
            ${esc(letter.cta.label)}
          </a>
        </td></tr>`
    : "";

  const status = letter.status
    ? `
        <tr><td align="center" style="padding-top:18px;font-family:${FONT};font-size:12.5px;line-height:1.6;color:${MUTED}">
          ${esc(letter.status)}
        </td></tr>`
    : "";

  const lead = letter.lead
    ? `
        <tr><td align="center" style="padding-bottom:24px;font-family:${FONT};font-size:14px;line-height:1.6;color:${MUTED}">
          ${esc(letter.lead)}
        </td></tr>`
    : "";

  const inner = `
        <!-- Title -->
        <tr><td align="center" style="padding-bottom:${letter.lead ? "10px" : "26px"}">
          <h1 style="margin:0;font-family:${FONT};font-size:24px;line-height:1.3;font-weight:700;color:${INK}">
            ${esc(letter.title)}
          </h1>
        </td></tr>
        ${lead}
        ${factsCard}
        ${bodyCards}
        ${cta}
        ${status}`;

  return emailShell({ lang: "en", title: esc(letter.title), inner });
}

/** The accent rule the customer letters use above a total, for reuse in blocks. */
export const STAFF_RULE = `<div style="border-top:1px solid ${ACCENT};opacity:0.4;font-size:0;line-height:0;height:1px;margin:12px 0"></div>`;
