import { test } from "node:test";
import assert from "node:assert/strict";
import { pwOk, PASSWORD_MIN } from "@/lib/password-rules";
import { resetCopy } from "@/lib/password-reset";
import { LOCALES } from "@/lib/seo";

/* ---------------------------------------------------------------------------
   The two testable halves of the reset flow.

   The rest of it — generating the link, the throttle, the send — talks to
   Supabase and Resend, and a test that mocked both would be asserting that my
   mocks agree with each other. What CAN be pinned down here is the rule that
   decides whether a password is acceptable, and the promise that a person
   locked out is spoken to in their own language rather than dropped into
   English.
--------------------------------------------------------------------------- */

test("a password needs length, both cases and a digit", () => {
  assert.equal(pwOk("Tactical1"), true);
  assert.equal(pwOk("Short1A"), false, "seven characters is not enough");
  assert.equal(pwOk("alllowercase1"), false, "no capital");
  assert.equal(pwOk("ALLUPPERCASE1"), false, "no lower case");
  assert.equal(pwOk("NoDigitsHere"), false, "no number");
  assert.equal(pwOk(""), false);
});

test("the minimum the hint promises is the minimum the rule enforces", () => {
  /* The sentence shown to a customer names a number. If the two ever drift, a
     person reads "at least 8" and is refused at 8. */
  assert.equal(PASSWORD_MIN, 8);
  assert.equal(pwOk("Abcdefg1"), true, "exactly the minimum must pass");
  assert.equal(pwOk("Abcdef1"), false, "one under must not");
});

test("every storefront has its own reset letter", () => {
  /* The order and shipping letters are English and Ukrainian on purpose. This
     one is not: it is read by somebody locked out, which is the worst moment
     to be handed a language they do not read. */
  const en = resetCopy("en");
  for (const locale of LOCALES) {
    const c = resetCopy(locale);
    assert.ok(c.subject.length > 0, `${locale} has a subject`);
    assert.ok(c.cta.length > 0, `${locale} has a button label`);
    if (locale !== "en") {
      assert.notEqual(c.subject, en.subject, `${locale} is not falling back to English`);
      assert.notEqual(c.cta, en.cta, `${locale}'s button is not falling back to English`);
    }
  }
});

test("an unknown locale falls back to English rather than throwing", () => {
  assert.deepEqual(resetCopy("pt"), resetCopy("en"));
  assert.deepEqual(resetCopy(""), resetCopy("en"));
});

test("every letter tells the reader that ignoring it is safe", () => {
  /* The sentence that separates a reset email from an alarming one. It is the
     one line a phishing-wary reader looks for, so no storefront may lose it. */
  for (const locale of LOCALES) {
    assert.ok(resetCopy(locale).ignore.length > 20, `${locale} says what to do if it wasn't them`);
  }
});
