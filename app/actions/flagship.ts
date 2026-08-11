"use server";

import { isEmail, normaliseEmail, subscribe } from "@/lib/email/flows";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Locale } from "@/lib/email/content";

/* ---------------------------------------------------------------------------
   The flagship waitlist.

   IT IS THE SAME LIST AS EVERY OTHER SIGN-UP, tagged source 'notify' — the
   label the launch-notify form on the homepage has always written, and this
   page is that form's new home. A separate table would be a second place to
   forget to honour an unsubscribe, which is the only way a mailing list ever
   really goes wrong.

   WHAT COMES BACK IS A REFERENCE, NOT A QUEUE POSITION. "You are number 3"
   is a scoreboard, and early in a campaign it reads as an empty room; the
   same 3 written TCT-04/0003 reads as a record in a file, which is both what
   this page is dressed as and, more usefully, true — it is a count of the
   list, not a promise about order of despatch. Nobody is told anybody else's.
--------------------------------------------------------------------------- */

export type WaitlistResult =
  | { ok: true; reference: string }
  | { ok: false; error: "invalid_email" | "failed" };

/** TCT-04/0007 — the file this page is, and where in it they landed. */
function formatReference(n: number): string {
  return `TCT-04/${String(Math.max(n, 1)).padStart(4, "0")}`;
}

export async function joinFlagshipWaitlist(input: {
  email: string;
  locale: string;
}): Promise<WaitlistResult> {
  const email = normaliseEmail(input.email ?? "");
  if (!isEmail(email)) return { ok: false, error: "invalid_email" };

  const locale: Locale = input.locale === "uk" ? "uk" : "en";

  const result = await subscribe({ email, locale, source: "notify" });
  if (!result.ok) {
    return { ok: false, error: result.reason === "invalid_email" ? "invalid_email" : "failed" };
  }

  /* The count is a nicety, so it must never be the thing that fails the
     signup. If it cannot be read the address is still on the list, and a
     reference is still issued — from 1, which reads as "first in" rather than
     as an error, and is the only honest answer when the count is unknown. */
  let position = 1;
  try {
    const admin = createAdminClient();
    const { count } = await admin
      .from("subscribers")
      .select("email", { count: "exact", head: true })
      .eq("source", "notify")
      .is("unsubscribed_at", null);
    if (typeof count === "number" && count > 0) position = count;
  } catch (e) {
    console.error("[flagship] waitlist count unavailable:", e);
  }

  return { ok: true, reference: formatReference(position) };
}
