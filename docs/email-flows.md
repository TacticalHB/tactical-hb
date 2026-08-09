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
| `lib/email-theme.ts` | **The palette, font and wordmark for all five email families.** |
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
| `lib/email/product-image.ts` | Picks the square thumbnail for a cart line. |
| `scripts/email-thumbs.mjs` | Builds those thumbnails — `npm run email:thumbs`. |
| `public/email/tct-mark.png` | 144×144 transparent PNG, `#1B1B16`, served at `https://tactical-hb.com/email/tct-mark.png`. |
| `public/email/products/*.jpg` | 152×152 product thumbnails, ~3 KB each. |

### The Ukrainian is written, not transcribed

The English is the content pack verbatim. **The Ukrainian is not**: the pack was
exported with a font carrying no Cyrillic glyphs, so all 3,580 characters of the
approved Ukrainian are `.notdef` boxes and cannot be recovered from the PDF by
any means (pypdf, pdfminer and a PDFKit render all agree). Mario's instruction
was to write it rather than wait for a re-export.

It is written to the storefront's own vocabulary — чаша, пристрій нагріву,
ковпак, «Зібрати сет» — not machine-translated. **If the pack is ever
re-exported with a working font, replace the `uk` halves of `WELCOME` and `CART`
and nothing else.** No logic reads the words.

---

## 2b. One palette, five families

`lib/email-theme.ts` holds the colours, the font stack, the mark-over-wordmark
lockup and the footer for **every** email this shop sends — the four
transactional letters (order, shipping, wholesale, follow-up) and the marketing
flows alike.

It did not start that way. `lib/email/template.ts` carried its own copies,
transcribed from the editorial master, and they had already drifted: five of
seven tokens differed and the pill was a third orange. Mario's call was that the
**editorial look is the house look**, so the transactional letters came to it
rather than the other way round.

| Token | Value | Note |
|-------|-------|------|
| `BG` | `#F3F1EC` | the cream ground |
| `CARD` | `#FFFFFF` | |
| `INK` | `#1A1915` | |
| `MUTED` | `#6B6862` | |
| `FAINT` | `#98948C` | |
| `LINE` | `#E7E3DC` | |
| `ACCENT` | `#C45A1A` | the deep weight — orange **text** on white only |
| `ACCENT_FILL` | `#FA8246` | the bright weight — every **fill** |
| `ACCENT_TEXT` | `#111114` | what sits on a fill |

`ACCENT` and `ACCENT_FILL` are literals of `--accent-ink` and `--accent` from
`globals.css` and **must be changed together with them**. Every other token is
within 1.04:1 of its `globals.css` counterpart — indistinguishable side by side
— except `FAINT`, which is a touch deeper than the site's at 1.12:1.

### The one place the master was not followed

The master fills its CTA with orange and sets the label in **white**. That
measures **2.5:1**, against the 4.5:1 a body-sized label needs. Dark on the same
fill is **7.5:1**, and it is what the site's own buttons and the shipping notice
have always done — the master's pill was the odd one out on legibility and on
precedent alike.

So the label is dark, not the fill lighter. The fill itself is unchanged to the
eye: the master's `#F48140` and the brand's `#FA8246` sit **1.03:1** apart.

To put white back it is one constant — `ACCENT_TEXT` in `lib/email-theme.ts`.

### Transactional letters get no unsubscribe

`footerRows(extra)` appends the marketing flows' unsubscribe and preferences
links; the transactional letters pass nothing. An order confirmation must not
offer to unsubscribe from itself, and the mail rules that require a
`List-Unsubscribe` header apply to marketing, not to receipts.

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

### Thumbnails must be square, and that is enforced in the asset

An email client that honours an `<img>` width attribute honours the height with
it, and there is no `object-fit` to fall back on. A non-square source in a
square frame is not cropped — **it is crushed**, and no markup can prevent it.

So `lib/email/product-image.ts` guarantees a 1:1 source. Two rules:

- **Never `tileImage`.** `describeLine` prefers the tile art because on the site
  it *is* the styled thumbnail, but tiles are tall bleed cut-outs for the
  flagship grid — 588×795, 576×815, and the wind cover at 524×968. Correct
  there, ruinous in a 76px square. This was the bug.
- **Prefer the prebuilt thumbnail.** `public/email/products/*.jpg` are 152×152
  (twice the 76px slot, so retina stays sharp) flattened onto `#F5F5F5`, the
  exact grey the product photography is shot on — every corner pixel measures
  (245,245,245), so letterbox bands and transparent edges are invisible rather
  than framed. The fallback is the full-size catalogue square: heavy, but
  square, so the worst case is a slow row and never a warped one.

Weight matters here too. The catalogue heroes are 96–562 KB each; four in one
message is over a megabyte to show four 76px thumbs. The thumbnails are ~3 KB,
which takes a three-line recovery mail from ~1.1 MB of images to 13 KB.

**The order confirmation uses them too**, via `emailThumbFor()` — 991 KB of
product photos down to 9 KB on a three-line order, 108× lighter. Its resolution
order is deliberately different, because a receipt is a record:

1. **The thumbnail of the photo captured at checkout.** That photo is what was
   bought. An order placed before variants were recorded has a purple HMD in
   `image` and nothing in `variant`, so re-resolving from the slug would put a
   black one in someone's receipt.
2. The catalogue square for the slug and variant.
3. The stored path exactly as it is — a discontinued product still shows what
   the customer bought.

Only step 3 can yield a source that is not 1:1, and the markup is told: a known
square gets `width` **and** `height`, the fallback gets `width` only and scales
proportionally. That row comes out a little taller or shorter than its
neighbours, which is a far better receipt than a misshapen product.

```bash
npm run email:thumbs
```

**Re-run that whenever a product photo changes** — the output is committed, and
a stale thumbnail is a mail showing last season's finish. If a new photo is
added without rebuilding, the fallback keeps the mail correct, only heavier.

Images are absolute (`https://tactical-hb.com/email/products/…`) and
unoptimised — an email client cannot reach a Next.js image route.

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

`vercel.json` asks for `0 7 * * *` — **once a day, ~10:00 Kyiv.** Not a
preference: it is the most this plan allows.

| Plan | Cron jobs / project | Minimum interval | Precision |
|------|--------------------|------------------|-----------|
| Hobby | 100 | **once per day** | per-hour (±59 min) |
| Pro | 100 | once per minute | per-minute |

**A sub-daily expression does not get downgraded — it fails the deployment.**
`*/15 * * * *` returns *"Hobby accounts are limited to daily cron jobs"* and the
build never ships. This happened once; the site sat on the previous commit
until the schedule was corrected. Do not put a faster expression back without
checking the plan first.

So **on Hobby a cart mail arrives on the next morning's run, not at +1h.**
Nothing is lost — the jobs are durable, and the +1h/+24h/+72h offsets still
decide the order and the eligibility, only the delivery moment slips. The batch
is the matching limit: 25 sends per run is 25 mails a day, ample now, and the
first number to raise if the list grows.

Two ways to get the timing the brief specifies — upgrade to Pro, or point any
external scheduler at the route, which costs nothing:

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
http://localhost:3000/api/dev/email-preview?step=C1&locale=uk&local=1
http://localhost:3000/api/dev/email-preview?step=order&locale=uk&local=1
```

The four transactional letters render here too — `order`, `shipping`,
`wholesale`, `followup` — from sample inputs in
`app/api/dev/email-preview/transactional.ts`. That is the only way to see all
five families together, which is what keeps the shared palette shared.

Steps `W1`–`W4` and `C1`–`C3`, locales `en` and `uk`. It renders through the
sender's own row builder, so what you see is what would be sent.

`local=1` rewrites the absolute `tactical-hb.com` URLs to the dev origin, which
is the only way to see the pictures before a deploy has put them on the CDN.
Off by default, because a real send uses the live addresses and a preview that
quietly showed localhost links would be lying about them.

The sample bag is chosen to stress the frame: a bowl (tall subject), the wind
cover (whose tile art is the 524×968 that used to warp), and an HMD in a named
finish (a variant photo rather than the catalogue one).

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
