"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMail } from "@/lib/email";
import { buildResetEmail } from "@/lib/password-reset";
import { SITE_URL } from "@/lib/seo";
import { isAppLocale } from "@/i18n/routing";

/* ---------------------------------------------------------------------------
   "I've forgotten my password."

   THE ANSWER IS ALWAYS THE SAME, and that is the most important line in this
   file. Whether the address has an account, has no account, is rate limited,
   or blew up inside Resend, the caller is told the same sentence: if there is
   an account, a link is on its way. Any branch a caller can tell apart turns
   this into an account-enumeration oracle — paste a customer list in, read
   which ones come back "no such user", and you have learned who shops here.
   The only failure that reports itself is a malformed address, which the
   sender already knows.

   WE SEND THE LETTER, SO WE OWN THE LIMIT. Supabase's own
   resetPasswordForEmail is rate limited by Supabase. This flow deliberately
   does not use it — the branded, four-language letter goes out through Resend
   — which means the protection Supabase would have applied is ours to apply,
   and 0041 exists for it. Without a limit, anybody who knows an address can
   have us mail that person a reset link on a loop.

   TWO LIMITS, BECAUSE EITHER ALONE IS SOFT. Per address stops one victim being
   mailed repeatedly; per IP stops one attacker working through a list of
   addresses. The IP is best effort — it comes from a forwarded header and is
   spoofable — which is exactly why it is the second limit and never the only
   one.
--------------------------------------------------------------------------- */

/** Per address, per window. Enough for a person who clicks twice, impatiently. */
const MAX_PER_EMAIL = 3;
/** Per IP, per window. Generous for a household, useless for a list. */
const MAX_PER_IP = 10;
const WINDOW_MINUTES = 60;

export type ResetRequestResult = { ok: true } | { ok: false; error: "bad_email" };

function normalise(email: string): string {
  return email.trim().toLowerCase();
}

/** Shape only. Deliverability is the mail server's opinion, not ours. */
function looksLikeEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

async function clientIp(): Promise<string | null> {
  const h = await headers();
  /* x-forwarded-for is a list; the client is the first entry. Vercel sets
     x-real-ip too and it is the tidier of the two when present. */
  const real = h.get("x-real-ip");
  if (real) return real.trim().slice(0, 64);
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim().slice(0, 64);
  return null;
}

export async function requestPasswordReset(input: {
  email: string;
  locale: string;
}): Promise<ResetRequestResult> {
  const email = normalise(input.email ?? "");
  if (!looksLikeEmail(email)) return { ok: false, error: "bad_email" };

  const locale = isAppLocale(input.locale) ? input.locale : "en";

  /* EVERYTHING PAST HERE RETURNS { ok: true }. Read the file header before
     adding a branch that does otherwise. */
  try {
    const admin = createAdminClient();
    const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
    const ip = await clientIp();

    const [byEmail, byIp] = await Promise.all([
      admin
        .from("password_reset_requests")
        .select("id", { count: "exact", head: true })
        .eq("email", email)
        .gte("requested_at", since),
      ip
        ? admin
            .from("password_reset_requests")
            .select("id", { count: "exact", head: true })
            .eq("ip", ip)
            .gte("requested_at", since)
        : Promise.resolve({ count: 0, error: null }),
    ]);

    /* A THROTTLE THAT CANNOT READ ITS OWN TABLE MUST NOT BECOME AN OPEN RELAY,
       and testing `error` alone does not achieve that.

       `head: true` makes supabase-js send a HEAD request, and PostgREST answers
       a HEAD against a table it cannot find with 204 No Content — no body, so
       no error to parse. The result is `{ error: null, count: null }`, which
       reads as a clean answer of "none". Written the obvious way,
       `(count ?? 0) >= MAX` then evaluates `0 >= 3`, and every request sails
       past a limit that is not running. Found by pointing this at a database
       where 0041 had not been applied and watching it send anyway.

       So the test is for a NUMBER. A count that succeeded is numeric; an error,
       a missing table, and a permission failure are all "unknown", and unknown
       fails closed. That costs a locked-out customer one retry. Failing open
       costs somebody an inbox full of reset links. */
    const countOf = (r: { error: unknown; count: number | null }): number | null =>
      r.error || typeof r.count !== "number" ? null : r.count;

    const emailCount = countOf(byEmail);
    const ipCount = ip ? countOf(byIp) : 0;

    if (emailCount === null || ipCount === null) {
      console.error("[password-reset] throttle unreadable — refusing to send");
      return { ok: true };
    }
    if (emailCount >= MAX_PER_EMAIL || ipCount >= MAX_PER_IP) {
      console.warn("[password-reset] rate limited");
      return { ok: true };
    }

    /* Logged BEFORE the send, so a send that hangs or throws still counts
       against the limit. A counter incremented on success is a counter an
       attacker can avoid by making the send fail. */
    await admin.from("password_reset_requests").insert({ email, ip });

    /* Opportunistic prune, on a request that is already doing IO. One more
       cron job is one more thing to forget. */
    await admin
      .from("password_reset_requests")
      .delete()
      .lt("requested_at", new Date(Date.now() - 24 * 3600_000).toISOString());

    const redirectTo = `${SITE_URL}/${locale}/reset-password`;
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });

    /* NO SUCH USER LANDS HERE, and it is indistinguishable from any other
       failure on purpose — including to our own logs, which is why this says
       "could not generate" rather than naming the reason. */
    if (error || !data?.properties?.action_link) {
      console.info("[password-reset] no link generated for this request");
      return { ok: true };
    }

    const { subject, html, text } = buildResetEmail({
      locale,
      url: data.properties.action_link,
    });

    const sent = await sendMail({ to: email, subject, html, text });
    if (!sent?.ok) console.error("[password-reset] send failed");
  } catch {
    /* Deliberately swallowed and deliberately unlogged in detail: the message
       could name the address. */
    console.error("[password-reset] request threw");
  }

  return { ok: true };
}
