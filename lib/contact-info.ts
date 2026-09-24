/* ---------------------------------------------------------------------------
   Where the business can be reached.

   Plain constants (no "server-only") so client components can render them and
   the API routes can address mail to them from the same source — an address
   that appears in two places eventually disagrees with itself.
--------------------------------------------------------------------------- */

/** General enquiries, customer support, returns. */
export const ADMIN_EMAIL = "admin@tactical-hb.com";

/**
 * Wholesale enquiries and orders.
 *
 * On the company's own domain from 24 September 2026; it was an Outlook.com
 * mailbox before that, and partner PDFs sent earlier still print the old one.
 * This constant is the address every page shows, every wholesale notification
 * is sent TO, and every partner email says to reply to.
 */
export const SALES_EMAIL = "sales@tactical-hb.com";

export const PHONE = "+380 66 707 33 07";

/* ---------------------------------------------------------------------------
   The social profiles, in one place for the same reason the addresses are.

   All three accounts are @tactical_hb, and the handle is written once here so
   the footer marks and the contact rows cannot end up pointing at different
   spellings of it — which had already started: the footer linked
   www.instagram.com/tactical_hb/ while the contact page linked
   instagram.com/tactical_hb. Same profile, two strings, one of them destined
   to be missed the day the handle changes.

   Canonical www forms, as the profiles themselves redirect to.
--------------------------------------------------------------------------- */

/** One handle across every network. */
export const SOCIAL_HANDLE = "@tactical_hb";

/** The company's public name on LinkedIn, which has no @handle. */
export const LINKEDIN_NAME = "Tactical HB";

export const SOCIAL_URLS = {
  instagram: "https://www.instagram.com/tactical_hb/",
  tiktok: "https://www.tiktok.com/@tactical_hb",
  linkedin: "https://www.linkedin.com/company/tactical-hb",
} as const;
