"use server";

import {
  isEmail,
  normaliseEmail,
  resubscribeByToken,
  setSubscriberLocale,
  subscribe,
  unsubscribeEmail,
  unsubscribeByToken,
} from "@/lib/email/flows";
import type { Locale } from "@/lib/email/content";

/* ---------------------------------------------------------------------------
   The public newsletter actions.

   NO ADMIN CHECK HERE AND NONE NEEDED — every one of these is something a
   member of the public is entitled to do to their own address. What they are
   NOT entitled to do is learn anything about anyone else's, which is why every
   answer below is the same whether or not the address is on a list. A form
   that said "not found" would be a membership oracle: paste an address, read
   the answer, learn whether that person shops here.

   The token paths are different in kind. A token is unguessable and arrives
   only in a mail we sent, so holding one IS the proof of ownership — that is
   what lets the preferences page show an address and change its language,
   which the email-only form must never do.
--------------------------------------------------------------------------- */

export type NewsletterResult = { ok: true } | { ok: false; error: "invalid_email" | "failed" };

/**
 * Join the list, from any of the sign-up forms.
 *
 * `source` records which form it was, so a list that starts misbehaving can be
 * traced to the surface that produced it.
 */
export async function subscribeToNewsletter(input: {
  email: string;
  locale: string;
  source: string;
}): Promise<NewsletterResult> {
  const email = normaliseEmail(input.email ?? "");
  if (!isEmail(email)) return { ok: false, error: "invalid_email" };

  const locale: Locale = input.locale === "uk" ? "uk" : "en";
  // Anything unfamiliar is recorded as 'other' rather than trusted into the
  // column: source is written by the browser and only ever read by a human.
  const allowed = ["footer", "newsletter_page", "notify", "checkout"];
  const source = allowed.includes(input.source) ? input.source : "other";

  const result = await subscribe({ email, locale, source });
  if (!result.ok) {
    return { ok: false, error: result.reason === "invalid_email" ? "invalid_email" : "failed" };
  }
  return { ok: true };
}

/**
 * Leave the list from the public form, which has no token.
 *
 * ALWAYS ANSWERS OK. An address that was never on the list is already in the
 * state the caller asked for, and saying so out loud would turn this form into
 * the membership oracle described above. The cost is that anyone can
 * unsubscribe anyone — annoying, not harmful, and the standard trade for a
 * public unsubscribe form.
 */
export async function unsubscribeFromNewsletter(email: string): Promise<NewsletterResult> {
  const addr = normaliseEmail(email ?? "");
  if (!isEmail(addr)) return { ok: false, error: "invalid_email" };
  await unsubscribeEmail(addr, "unsubscribed_form");
  return { ok: true };
}

/* ---- the token paths, used by the preferences page ----------------------- */

export async function unsubscribeWithToken(token: string): Promise<NewsletterResult> {
  const ok = await unsubscribeByToken(token ?? "");
  return ok ? { ok: true } : { ok: false, error: "failed" };
}

export async function resubscribeWithToken(token: string): Promise<NewsletterResult> {
  const ok = await resubscribeByToken(token ?? "");
  return ok ? { ok: true } : { ok: false, error: "failed" };
}

export async function setNewsletterLocale(
  token: string,
  locale: string
): Promise<NewsletterResult> {
  const ok = await setSubscriberLocale(token ?? "", locale === "uk" ? "uk" : "en");
  return ok ? { ok: true } : { ok: false, error: "failed" };
}
