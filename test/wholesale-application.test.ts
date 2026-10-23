import { test } from "node:test";
import assert from "node:assert/strict";
import { EMPTY_ANSWERS, missingFor } from "../lib/wholesale-application-display";
import { buildApplicationReminder, buildWholesaleRegistrationReply, buildWholesaleReply } from "../lib/wholesale-email";

/* The online wholesale application (23 Oct 2026), which replaced the PDF. */

const full = { ...EMPTY_ANSWERS, legalName: "Arc Ltd", address: "1 Main St, Kyiv", taxId: "12345678" };

test("nothing can be sent without the three required answers, a proof document and the confirmation", () => {
  assert.deepEqual(missingFor(EMPTY_ANSWERS, [], ""), ["legalName", "address", "taxId", "proof", "confirmation"]);
  assert.deepEqual(missingFor(full, [], "Ana"), ["proof"]);
  // a photo of the premises is welcome but does not prove the business
  assert.deepEqual(missingFor(full, [{ kind: "premises" }], "Ana"), ["proof"]);
  assert.deepEqual(missingFor(full, [{ kind: "tax" }], "Ana"), []);
  assert.deepEqual(missingFor(full, [{ kind: "registration" }], "  "), ["confirmation"]);
});

test("the letters carry a button to the online application, never the old PDF", () => {
  const site = "https://tactical-hb.com";
  const reg = buildWholesaleRegistrationReply("uk", site);
  assert.equal(reg.attachments.length, 0);
  assert.match(reg.html, /https:\/\/tactical-hb\.com\/uk\/wholesale\/portal/);
  assert.doesNotMatch(reg.html + reg.text, /\.pdf/i);

  const enquiry = buildWholesaleReply("en", site);
  assert.equal(enquiry.attachments.length, 0);
  assert.match(enquiry.html, /\/en\/wholesale\/register/);

  const reminder = buildApplicationReminder("ja", site);
  assert.match(reminder.html, /\/ja\/wholesale\/portal/);
});
