# Email flows

Two automated sequences: a four-part **welcome** series from a newsletter
signup, and a three-part **cart recovery** series from an abandoned bag. Both
run on a durable job queue swept by cron, both are cancellable, and neither
blocks the request that starts it.

---

## 1. What gets sent

| Step | When | Subject (EN) | Links to |
|------|------|--------------|----------|
| **W1** | immediately on signup | Welcome to Tactical HB | `/products`, `/setup` |
| **W2** | +2 days | Bowl. Heat. Cover. | `/setup`, `/products` |
| **W3** | +5 days | Uniform heat. Built to last. | `/products/hmd-tct-classic`, `/products` |
| **W4** | +9 days | Ranks, not random discounts | `/account/loyalty`, `/products` |
| **C1** | +1 hour after the bag last changed | Your bag is waiting | `/cart`, `/products` |
| **C2** | +24 hours | Still thinking it through? | `/cart`, `/setup` |
| **C3** | +72 hours | Last note on your bag | `/cart`, `/contact` |

Every URL is built by `url(locale, path)` in `lib/email/content.ts`, so a
Ukrainian mail links to `/uk/cart` and an English one to `/en/cart`. No path is
ever written out by hand.

**No discounts anywhere.** There is no coupon field in the copy data at all,
which is the surest way for one not to appear by accident. C3's premium
default is no offer either, per the content pack.

---

## 2. The files

| File | Job |
|------|-----|
| `lib/email/template.ts` | The approved master shell as a function. Tables + inline styles, one orange pill, the mark over the wordmark. `renderEmail()` and `renderEmailText()`. |
| `lib/email/content.ts` | All copy, keyed `step → locale`. Subjects, preheaders, body, bullets, CTA labels, and the paths each button points at. |
| `lib/email/flows.ts` | Scheduling, cancelling, the guards, and the send path. |
| `supabase/migrations/0026_email_flows.sql` | `subscribers`, `email_jobs`, `abandoned_carts`, and `claim_email_jobs()`. |
| `app/api/cron/email-queue/route.ts` | The sweeper. |
| `app/api/cart/snapshot/route.ts` | Where the browser posts the bag. |
| `app/api/newsletter/unsubscribe/route.ts` | One-click unsubscribe (POST only). |
| `app/[locale]/(shop)/newsletter/preferences/page.tsx` | Language + unsubscribe, reached by token from any mail. |
| `app/actions/newsletter.ts` | The public server actions the forms call. |
| `app/api/dev/email-preview/route.ts` | Look at any mail without sending it. **404 in production.** |
| `public/email/tct-mark.png` | 144×144 transparent PNG, `#1B1B16`, served at `https://tactical-hb.com/email/tct-mark.png`. |

### The Ukrainian is written, not transcribed

The English is the content pack verbatim. **The Ukrainian is not**: the pack was
exported with a font carrying no Cyrillic glyphs, so all 3,580 characters of the
approved Ukrainian are `.notdef` boxes and cannot be recovered from the PDF by
any means (pypdf, pdfminer and a PDFKit render all agree). Mario's instruction
was to write it rather than wait for a re-export.

It is written to the storefront's own vocabulary — чаша, пристрій нагріву,
вітрозахист, «Зібрати сет» — not machine-translated. **If the pack is ever
re-exported with a working font, replace the `uk` halves of `WELCOME` and `CART`
and nothing else.** No logic reads the words.

---

## 3. Scheduling

No `await sleep(2 days)` anywhere. A signup writes four rows with future
`send_after` timestamps and returns; a cron sweeps whatever is due.

```
subscribers        who may be mailed, in which language  (the consent record)
email_jobs         the clock                             (one row per send)
abandoned_carts    the bag, as the server last saw it    (the anchor)
```

**Idempotency** is a partial unique index, not application logic:

```sql
create unique index email_jobs_pending_uniq
  on public.email_jobs (job_key, step)
  where sent_at is null and cancelled_at is null;
```

Sending C1 twice is therefore a database error rather than a defect discovered
in someone's inbox. Job keys are `welcome:{email}` and `cart:{email}`.

**Claiming** uses `FOR UPDATE SKIP LOCKED` inside `claim_email_jobs()`, so two
overlapping cron runs divide the work instead of both sending the same mail. A
runner that dies mid-flight releases its rows after 15 minutes; a job that
fails five times is retired.

### W1 is sent inline

The row is written first, then `subscribe()` claims and sends the due job on the
same request. A welcome mail that waited for the next sweep would read as
broken. If the inline send fails, the cron picks it up — nothing is lost,
because the row exists before the attempt.

### Cart jobs date themselves

A cart edit writes **one** row (`abandoned_carts`) and nothing to the queue.
When a cart job wakes it compares the bag's `updated_at` against its own offset,
and if the bag is fresher it moves its own `send_after` and goes back to sleep.

The obvious alternative — cancel the three pending jobs and insert three new
ones on every edit — has a race: two tabs saving at once interleave their
cancels and inserts, and the loser's chain ends up anchored to a moment the
cart row no longer agrees with. Self-dating removes the race and turns four
writes per edit into one.

Consequence worth knowing: **a change after C1 has gone does not bring C1 back.**
Only pending steps move, so the sequence advances rather than restarting.
Someone who keeps nudging their bag gets one "your bag is waiting", not one per
nudge.

**Cooldown:** a fully-completed sequence cannot restart for 14 days
(`COOLDOWN_DAYS` in `flows.ts`). Without it, a regular browser would collect
three mails a week.

---

## 4. Cancellation — the hard requirement

> **Never send C1/C2/C3 after payment.**

Three independent stops, any one of which is sufficient:

1. **`lib/fulfilment.ts` step 0** — `cancelCartFlowOnPayment()` runs *before* the
   order row, the waybill and the fiscal receipt, and outside the `try`. Those
   are the steps that can be slow or fail, and a timeout must not be able to
   leave three marketing mails armed against someone who has already bought.
2. **The same call deletes the `abandoned_carts` row.** A send with no bag to
   describe cancels itself as `cart_emptied`.
3. **The send path checks orders directly.** Any `orders` row for that address
   dated at or after the bag's anchor cancels the job as `order_paid`. Orders
   are only ever written after Monobank confirms the money, so existence *is*
   proof of payment — status is not consulted, because a paid order that has
   since shipped must still count.

If the order lookup itself errors, the job **throws rather than sends**: we
cannot prove they have not paid, so it is postponed for the next sweep.

Other cancels: emptying the bag (`cart_emptied`), unsubscribing (both flows),
and losing consent between scheduling and sending (`no_consent`).

---

## 5. Consent

- `subscribers.marketing_opt_in` must be `true` and `unsubscribed_at` must be
  null, **checked again at send time** rather than trusted from when the job was
  written.
- The newsletter form's tickbox is the opt-in; the submit is refused without it.
- **The cart flow is gated by the same consent.** An abandoned-cart mail is a
  marketing send under Ukrainian and EU rules alike, so a bag is only recorded
  against an address that has already opted in.
- `NotifyForm` has no tickbox. Its visible promise — "be the first to know" — is
  the consent, and submitting it is an unambiguous request to be emailed. If
  that reading is ever challenged, the fix is a consent line in the form, not a
  silent list.
- The signup **locale is stored** and never inferred later. Someone who signed
  up on `/uk` does not start receiving English because they opened a link on
  `/en`. They can change it themselves on the preferences page, and that choice
  outranks the one captured at signup.

### Unsubscribe

Three routes, deliberately different:

| Path | Who uses it | Behaviour |
|------|-------------|-----------|
| `POST /api/newsletter/unsubscribe?token=…` | Gmail/Yahoo's own button, via `List-Unsubscribe` | Immediate, no confirmation. **POST only** — a GET returns 405. |
| `/{locale}/newsletter/preferences?token=…` | The footer link in every mail | Shows the address, offers language and unsubscribe. Nothing changes on page load. |
| `/{locale}/newsletter` | Anyone, no token | Email-only form. Always answers the same whether or not the address is on a list. |

**Why the one-click route is POST-only:** Outlook Safe Links and corporate
scanners fetch every URL in a message with a GET before the recipient sees it. A
GET that unsubscribed would silently remove people who never clicked anything.

`List-Unsubscribe` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click` are
set on every marketing send — Gmail and Yahoo have required both of bulk senders
since February 2024.

---

## 6. Prices and images

Every amount is recomputed by `priceCart()` — the same function the checkout
uses — at the moment the mail is built. Nothing monetary is ever stored in a
job or a cart snapshot. `abandoned_carts.lines` holds slugs, quantities and
options only.

Descriptions come from `describeLine()`, the cart's own, so the mail cannot
disagree with the site about what a thing is called or what finish it is in.

Currency follows the subscriber's locale: `€` for `en`, `₴` for `uk`.

W3 resolves HMD TCT Classic from the catalogue at send time. If that slug ever
leaves the catalogue the product row is dropped and the button falls back to
`/products`, rather than the mail carrying a broken image and a 404.

Images are absolute (`https://tactical-hb.com/images/…`) and unoptimised — an
email client cannot reach a Next.js image route.

**The dashed "STUDIO PRODUCT STILL" panel from the master is not in the
renderer.** In the master it is a note to whoever wires the mail up; sending it
would put a dashed box reading "HOSTED HTTPS IMAGE · 1104×480" in a customer's
inbox. A still renders only when a real HTTPS URL is passed as `stillUrl`.

---

## 7. Running it

### Environment

| Variable | Needed for | Notes |
|----------|-----------|-------|
| `RESEND_API_KEY` | sending | Already in Vercel. |
| `CRON_SECRET` | the sweeper | Already in Vercel. Both cron routes fail closed without it. |
| `SUPABASE_SERVICE_ROLE_KEY` | everything | Already in Vercel. |
| `SITE_URL` | absolute links | Defaults to `https://tactical-hb.com`. |
| `MARKETING_FROM_EMAIL` | *optional* | Unset today, so marketing shares `contact@` with transactional mail. Worth splitting eventually: deliverability reputation is per-address, and a campaign that collects complaints should not be able to drag order confirmations down with it. |

### The migration

`supabase/migrations/0026_email_flows.sql`, run by hand in the Supabase SQL
editor. Expected: *Success. No rows returned.* Safe to re-run. Verification
queries and a duplicate-insert test are in the file's footer.

### Cron cadence — read this before trusting the +1h

`vercel.json` asks for `*/15 * * * *`. **Vercel's Hobby plan interprets a cron
expression but only invokes it once a day**, so on Hobby the first cart mail
arrives on the next daily run rather than at +1h.

Nothing breaks and nothing is lost — jobs are durable and send late rather than
never — but **the timing in the brief is a Pro-plan timing**. Either upgrade, or
point any external scheduler at the route:

```
curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
  https://tactical-hb.com/api/cron/email-queue
```

The route is safe to call as often as you like and safe to overlap.

### Testing without spamming anyone

**Look at a mail without sending it** (dev server only — 404 in production):

```
http://localhost:3000/api/dev/email-preview?step=W1&locale=uk
http://localhost:3000/api/dev/email-preview?step=C1&locale=en&format=text
```

Steps `W1`–`W4` and `C1`–`C3`, locales `en` and `uk`. It renders through the
sender's own row builder, so what you see is what would be sent.

**Test the real path end to end** by subscribing with your own address on the
running site. That exercises consent, the token, the unsubscribe header and
Resend itself — none of which the preview touches. W1 arrives immediately; to
see W2 without waiting two days, move its row forward:

```sql
update public.email_jobs
   set send_after = now()
 where job_key = 'welcome:you@example.com' and step = 'W2';
```

…then hit the cron route with the bearer token.

**For the cart flow** you must be signed in — the snapshot route takes the
address from the session and ignores anything in the body (see below). Add
something to the bag, wait for the 4-second debounce, then:

```sql
update public.abandoned_carts set updated_at = now() - interval '2 hours'
 where email = 'you@example.com';
update public.email_jobs set send_after = now()
 where job_key = 'cart:you@example.com' and step = 'C1';
```

Backdating the cart matters: without it the job will correctly re-date itself
and refuse to send.

---

## 8. Known limits

- **Guests are not recovered.** The snapshot route takes the address from the
  session and never from the request body. A route that accepted
  `{ email, lines }` from anyone would be a way to make this shop send three
  mails about a bag someone else chose to a stranger's inbox. Widening it later
  means a signed, expiring token in the links we already mail people — not a
  trusted body.
- **Name, title and country are collected by the newsletter form and not
  stored.** The list holds an address, a language and a consent record, because
  that is all any flow reads. The day a personalised send exists, the columns go
  in with it.
- **No admin view of the queue yet.** Inspect it in SQL:
  ```sql
  select step, recipient, send_after, sent_at, cancelled_at, cancel_reason, attempts
    from public.email_jobs order by created_at desc limit 50;
  ```
- **A recovery mail illustrates at most four lines** (`MAX_PRODUCT_ROWS`). The
  button carries the rest.
