import "server-only";
import { esc } from "@/lib/email";

/* ---------------------------------------------------------------------------
   The campaign email shell.

   This is email-master-editorial.html turned into a function. The markup is
   the approved one, unchanged in structure: 600px table, cream ground, white
   card with 20px corners, the TCT mark over the wordmark, one orange pill, the
   social row and the unsubscribe line. Nothing here is a redesign.

   TABLES AND INLINE STYLES, ON PURPOSE. Outlook renders through Word, which
   ignores most of a stylesheet; the only layout it honours reliably is nested
   tables with attributes and inline styles. The <style> block carries the
   mobile media query alone, because that is all a media query can be trusted
   for.

   THE DASHED "STUDIO PRODUCT STILL" PANEL IS NOT HERE. In the master it is a
   design note to whoever wires the mail up, and sending it to a customer would
   put a dashed box reading "HOSTED HTTPS IMAGE · 1104×480" in their inbox. A
   still renders only when a real HTTPS image is passed; otherwise the block is
   omitted and the card closes up around it.

   EVERY INTERPOLATED STRING IS ESCAPED. Product names, headlines and labels
   all reach here from the catalogue or the copy registry, and an unescaped
   apostrophe in "F.CK THE PHUNNEL" would be the least of it — an & in a URL
   is enough to break a link in some clients.
--------------------------------------------------------------------------- */

const SITE = (process.env.SITE_URL || "https://tactical-hb.com").replace(/\/$/, "");

/** Brand constants, matching the approved shell exactly. */
const GROUND = "#F3F1EC";
const ACCENT = "#F48140";
const INK = "#1A1915";
const MUTED = "#6B6862";
const FAINT = "#98948C";
const SANS = "'Helvetica Neue',Helvetica,Arial,sans-serif";

export type EmailCta = { label: string; url: string };

export type EmailProductRow = {
  /** Absolute HTTPS URL. A row with no image renders without one. */
  imageUrl?: string;
  name: string;
  /** "With Lid + With Rubber", "With Timer" — whatever the line actually is. */
  variant?: string;
  /** Already formatted for the locale by the caller. Never built here. */
  priceLabel: string;
};

export type EmailTemplateInput = {
  locale: "en" | "uk";
  /** The grey line under the subject in an inbox list. */
  preheader: string;
  headline: string;
  /** Plain-text paragraphs; each becomes its own <p>-style row. */
  paragraphs: string[];
  /** Optional tight list, rendered as the pack's bulleted field notes. */
  bullets?: string[];
  primaryCta: EmailCta;
  secondaryCta?: EmailCta;
  /** Cart lines. Renders the master's optional product-row card. */
  productRows?: EmailProductRow[];
  /** A real hosted HTTPS still, or nothing at all. */
  stillUrl?: string;
  unsubscribeUrl: string;
  preferencesUrl: string;
};

/** Invisible padding so the inbox preview shows the preheader, not the body. */
const PREHEADER_PAD = "&#8199;&#847;".repeat(30);

function ctaButton(cta: EmailCta): string {
  return `
      <tr><td style="padding:26px 44px 6px;text-align:center;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" class="btn" style="border-collapse:separate;border-spacing:0;margin:0 auto;"><tr>
          <td style="background-color:${ACCENT};border-radius:999px;"><a class="btna" href="${esc(cta.url)}" style="display:block;padding:17px 42px;font-family:${SANS};font-size:15px;line-height:15px;font-weight:700;letter-spacing:.02em;color:#FFFFFF;text-decoration:none;">${esc(cta.label)}</a></td>
        </tr></table>
      </td></tr>`;
}

/* ---------------------------------------------------------------------------
   THE THUMBNAIL FRAME IS SQUARE, AND SO IS EVERY SOURCE THAT REACHES IT.

   An email client that honours an <img> width honours its height with it, and
   there is no object-fit to fall back on, so a non-square source in a square
   frame is not cropped — it is crushed. That is not fixable in markup, only in
   the asset, which is why lib/email/product-image.ts guarantees a 1:1 source
   (152px prebuilt, the catalogue square as a fallback) and never the tall tile
   cut-outs the flagship grid uses.

   Given that guarantee, width AND height are stated. Both attributes are what
   Outlook needs to reserve the box before the image loads, and stating only
   one leaves a row that reflows as pictures arrive.

   The cell is fixed at the same size, on the grey the photography is shot on,
   so an image that is slow, blocked or transparent-edged still leaves a frame
   where the product will be rather than a collapsed row.
--------------------------------------------------------------------------- */
const THUMB = 76;
const THUMB_BG = "#F5F5F5";

function productRowsHtml(rows: EmailProductRow[]): string {
  if (rows.length === 0) return "";
  const cards = rows
    .map((r) => {
      /* The frame is a nested one-cell table, not padding on the image cell:
         padding and a background colour on the same td would tint the gap as
         well as the frame, and Outlook would give the whole thing square
         corners of the wrong size. This way the outer cell spaces the row and
         the inner one is exactly the thumbnail. */
      const img = r.imageUrl
        ? `<td width="${THUMB + 14}" valign="middle" style="padding:14px 0 14px 14px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="${THUMB}" style="width:${THUMB}px;border-collapse:separate;border-spacing:0;"><tr>
    <td width="${THUMB}" height="${THUMB}" align="center" valign="middle" style="width:${THUMB}px;height:${THUMB}px;background-color:${THUMB_BG};border-radius:10px;font-size:0;line-height:0;"><img src="${esc(r.imageUrl)}" width="${THUMB}" height="${THUMB}" alt="${esc(r.name)}" style="display:block;width:${THUMB}px;height:${THUMB}px;border-radius:10px;"></td>
  </tr></table>
</td>`
        : "";
      const variant = r.variant
        ? `<div style="padding-top:5px;font-size:12px;color:${FAINT};">${esc(r.variant)}</div>`
        : "";
      return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:separate;border-spacing:0;border:1px solid #E7E3DC;border-radius:14px;margin-bottom:8px;">
<tr>
${img}
<td style="padding:14px 8px 14px 14px;font-family:${SANS};"><div style="font-size:15px;font-weight:700;color:${INK};">${esc(r.name)}</div>${variant}</td>
<td style="padding:14px 18px 14px 8px;text-align:right;font-family:${SANS};font-size:15px;font-weight:700;color:${INK};white-space:nowrap;">${esc(r.priceLabel)}</td>
</tr></table>`;
    })
    .join("");

  return `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:separate;border-spacing:0;background-color:#FFFFFF;">
        <tr><td class="rowpad" style="padding:14px 36px 4px;">${cards}</td></tr>
      </table>`;
}

export function renderEmail(i: EmailTemplateInput): string {
  const paras = i.paragraphs
    .map(
      (p) =>
        `<tr><td class="cardpad" style="padding:0 60px 14px;text-align:center;font-family:${SANS};font-size:15px;line-height:24px;color:${MUTED};mso-line-height-rule:exactly;">${esc(p)}</td></tr>`
    )
    .join("");

  const bullets = (i.bullets ?? [])
    .map(
      (b) =>
        `<tr><td class="cardpad" style="padding:0 60px 8px;text-align:center;font-family:${SANS};font-size:15px;line-height:23px;color:${MUTED};mso-line-height-rule:exactly;">&middot;&nbsp; ${esc(b)}</td></tr>`
    )
    .join("");

  /* Only a real hosted image ever becomes a still. */
  const still = i.stillUrl
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:separate;border-spacing:0;background-color:#FFFFFF;">
        <tr><td style="padding:16px 36px 6px;">
          <img src="${esc(i.stillUrl)}" width="528" alt="" style="display:block;width:100%;height:auto;border-radius:12px;">
        </td></tr>
      </table>`
    : "";

  const secondary = i.secondaryCta
    ? `<tr><td style="padding:14px 44px 42px;text-align:center;font-family:${SANS};font-size:13px;"><a href="${esc(i.secondaryCta.url)}" style="color:#3A3D40;text-decoration:underline;">${esc(i.secondaryCta.label)}</a></td></tr>`
    : `<tr><td style="padding:0 44px 42px;"></td></tr>`;

  return `<!DOCTYPE html>
<html lang="${i.locale}" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${esc(i.headline)} | Tactical HB</title>
<style>
html,body{margin:0!important;padding:0!important}
img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic}
table{mso-table-lspace:0pt;mso-table-rspace:0pt}
a{color:#3A3D40}

@media only screen and (max-width:480px){
  .wrap{width:100%!important}
  .px{padding-left:16px!important;padding-right:16px!important}
  .cardpad{padding-left:28px!important;padding-right:28px!important}
  /* The product rows carry a fixed 76px thumbnail, so the text has whatever is
     left. At 36px a side on a 375px screen that is 165px, which orphans the
     quantity onto its own line; at 16px it is 205px and the line holds. */
  .rowpad{padding-left:16px!important;padding-right:16px!important}
  .h1{font-size:28px!important;line-height:34px!important}
  .btn{width:100%!important}
  .btna{padding-left:0!important;padding-right:0!important;text-align:center!important}
}
</style>
<!--[if mso]><style>td,a,div,span{font-family:Arial,sans-serif!important}.btn td{padding:17px 42px!important}.btna{padding:0!important}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${GROUND};">
<span style="display:none!important;visibility:hidden;opacity:0;font-size:1px;line-height:1px;color:${GROUND};max-height:0;max-width:0;overflow:hidden;mso-hide:all;">${esc(i.preheader)}${PREHEADER_PAD}</span>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;background-color:${GROUND};">
<tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600"><tr><td><![endif]-->
<table role="presentation" cellpadding="0" cellspacing="0" border="0" class="wrap" width="600" style="width:600px;max-width:600px;border-collapse:collapse;background-color:${GROUND};">
    <tr><td class="px" style="padding:34px 24px 0;text-align:center;"><img src="${SITE}/email/tct-mark.png" width="36" height="36" alt="TCT" style="display:inline-block;vertical-align:middle;"></td></tr>
    <tr><td class="px" style="padding:12px 24px 26px;text-align:center;font-family:${SANS};font-size:14px;font-weight:700;letter-spacing:10px;color:#1B1B16;mso-line-height-rule:exactly;">TACTICAL <span style="color:${ACCENT};">HB</span></td></tr>
    <tr><td class="px" style="padding:0 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:separate;border-spacing:0;background-color:#FFFFFF;border-radius:20px 20px 0 0;">
        <tr><td class="cardpad h1" style="padding:46px 44px 14px;text-align:center;font-family:${SANS};font-size:34px;line-height:40px;font-weight:800;letter-spacing:-.01em;color:${INK};mso-line-height-rule:exactly;">${esc(i.headline)}</td></tr>
${paras}${bullets}
      </table>
${still}${productRowsHtml(i.productRows ?? [])}
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:separate;border-spacing:0;background-color:#FFFFFF;border-radius:0 0 20px 20px;">
${ctaButton(i.primaryCta)}
${secondary}
      </table>
    </td></tr>
    <tr><td style="padding:36px 24px 0;text-align:center;"><img src="${SITE}/email/tct-mark.png" width="22" height="22" alt="TCT" style="display:inline-block;opacity:.85;"></td></tr>
    <tr><td style="padding:14px 24px 0;text-align:center;font-family:${SANS};font-size:13px;font-weight:600;"><a href="${SITE}/${i.locale}" style="color:#3A3D40;text-decoration:none;">tactical-hb.com</a></td></tr>
    <tr><td style="padding:12px 24px 0;text-align:center;font-family:${SANS};font-size:12px;color:${MUTED};"><a href="https://www.instagram.com/tactical_hb/" style="color:${MUTED};text-decoration:none;">Instagram</a> &nbsp;&middot;&nbsp; <a href="https://www.tiktok.com/@tactical_hb" style="color:${MUTED};text-decoration:none;">TikTok</a> &nbsp;&middot;&nbsp; <a href="https://www.linkedin.com/company/tactical-hb" style="color:${MUTED};text-decoration:none;">LinkedIn</a></td></tr>
    <tr><td style="padding:14px 24px 0;text-align:center;font-family:${SANS};font-size:12px;color:${FAINT};"><a href="${esc(i.unsubscribeUrl)}" style="color:${FAINT};text-decoration:underline;">${i.locale === "uk" ? "Відписатися" : "Unsubscribe"}</a> &nbsp;&middot;&nbsp; <a href="${esc(i.preferencesUrl)}" style="color:${FAINT};text-decoration:underline;">${i.locale === "uk" ? "Налаштування" : "Manage preferences"}</a></td></tr>
    <tr><td style="padding:10px 24px 38px;text-align:center;font-family:${SANS};font-size:11px;letter-spacing:.04em;color:#B0ACA3;">Tactical HB &middot; ${i.locale === "uk" ? "Україна" : "Ukraine"}</td></tr>
  </table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`;
}

/**
 * The plain-text alternative.
 *
 * Not optional politeness: a mail with no text part scores worse with spam
 * filters and is unreadable in text-only clients, and Resend takes both.
 */
export function renderEmailText(i: EmailTemplateInput): string {
  const lines = [
    i.headline,
    "",
    ...i.paragraphs,
    ...(i.bullets ?? []).map((b) => `· ${b}`),
    "",
    ...(i.productRows ?? []).map(
      (r) => `— ${r.name}${r.variant ? ` (${r.variant})` : ""} · ${r.priceLabel}`
    ),
    "",
    `${i.primaryCta.label}: ${i.primaryCta.url}`,
    ...(i.secondaryCta ? [`${i.secondaryCta.label}: ${i.secondaryCta.url}`] : []),
    "",
    "—",
    "Tactical HB · tactical-hb.com",
    `${i.locale === "uk" ? "Відписатися" : "Unsubscribe"}: ${i.unsubscribeUrl}`,
  ];
  return lines.filter((l, n, a) => !(l === "" && a[n - 1] === "")).join("\n");
}
