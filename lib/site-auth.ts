/**
 * Dev password gate — OFF by default as of the public opening.
 *
 * To put the whole site back behind the password: set SITE_GATE=on in
 * Vercel → Settings → Environment Variables and redeploy. No code change.
 * Unset (or any other value) leaves the site open.
 */
export const SITE_GATE_ENABLED = process.env.SITE_GATE === "on";

export const SITE_PASSWORD = process.env.SITE_PASSWORD || "2005";
export const AUTH_COOKIE = "tct_site_auth";
