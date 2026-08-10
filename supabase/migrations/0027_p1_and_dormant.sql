-- =============================================================================
--  Two new email flows: post-purchase P1, and the wholesale dormant check-in.
--
--  Run this in the Supabase SQL editor. Expected: "Success. No rows returned."
--  Safe to re-run.
--
--  ALL THIS DOES IS WIDEN TWO CHECK CONSTRAINTS. No new table, no new column.
--  Both flows were designed to fit the machinery that already exists — the
--  durable queue for the one that is scheduled, and the partner message log
--  for the one that is scanned — and a check constraint was the only thing in
--  the way. That is the point: a third orders table or a second send log is
--  how two systems start disagreeing about what was sent to whom.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. The queue learns about P1.
--
--    Post-purchase nurture is event-triggered with a delay — the shipped mail
--    goes, and three days later this one does — which is exactly what
--    email_jobs is for. Its job_key is 'p1:{order id}', so the partial unique
--    index that already stops a welcome step sending twice stops this too,
--    without a line of application code.
--
--    'wholesale' is NOT added here. That flow is a scan, not an event: nothing
--    happens to trigger it, a nightly pass simply asks who has gone quiet. A
--    queued job would have to be cancelled when an order arrived; a scan that
--    re-checks at send time cannot go stale in the first place.
-- ---------------------------------------------------------------------------
alter table public.email_jobs drop constraint if exists email_jobs_flow_check;
alter table public.email_jobs
  add constraint email_jobs_flow_check
  check (flow in ('welcome', 'cart', 'p1'));

-- ---------------------------------------------------------------------------
-- 2. The partner message log learns about the dormant letter.
--
--    partner_messages already records every letter sent to a partner, with the
--    address as it was at send time and a failed/sent status. It is therefore
--    already the answer to "when did we last contact this partner", which is
--    the cooldown this flow needs — so no last_follow_up_at column is added.
--    One place recording what was sent, not two that can drift.
--
--    A 'dormant' row is written by the cron, a 'followup' row by the founder
--    pressing send in /admin/partners. Both are letters to the same person and
--    both must count against the same silence.
-- ---------------------------------------------------------------------------
alter table public.partner_messages drop constraint if exists partner_messages_kind_check;
alter table public.partner_messages
  add constraint partner_messages_kind_check
  check (kind in ('followup', 'dormant'));

-- ---------------------------------------------------------------------------
-- 3. sent_by can now name a machine.
--
--    0023 made it `not null` on the reasoning that "a row that cannot name its
--    human has no business existing" — correct when the only way to send was a
--    founder pressing a button. The dormant scan sends without one, and writes
--    'system:dormant-cron', which no email address can collide with, so a row
--    written by the cron can never be misread as somebody's own letter. The
--    column stays NOT NULL: every row must still say who sent it. What has
--    changed is that "who" may be a process.
-- ---------------------------------------------------------------------------
comment on column public.partner_messages.sent_by is
  'Who sent it: an admin email address, or a system marker such as system:dormant-cron.';

-- NO NEW INDEX. The cooldown query is (partner_id, created_at desc), which is
-- exactly what 0023's partner_messages_partner_idx already covers. A second
-- index on the same columns is write cost for nothing.

-- =============================================================================
--  VERIFY — read-only. Run this and read the two definitions back.
--
--    select conname, pg_get_constraintdef(oid) as definition
--      from pg_constraint
--     where conname in ('email_jobs_flow_check', 'partner_messages_kind_check')
--     order by conname;
--
--  Expected, and nothing less — the OLD values must still be listed, or an
--  existing welcome/cart job or a founder's follow-up would start failing:
--
--    email_jobs_flow_check          CHECK (flow = ANY (ARRAY['welcome', 'cart', 'p1']))
--    partner_messages_kind_check    CHECK (kind = ANY (ARRAY['followup', 'dormant']))
--
--  And the widened column comment:
--
--    select col_description('public.partner_messages'::regclass,
--             (select attnum from pg_attribute
--               where attrelid = 'public.partner_messages'::regclass
--                 and attname = 'sent_by'));
--
--  NOTHING HERE WRITES A ROW. Reading the constraint back is stronger evidence
--  than a test insert anyway: an insert proves one value was accepted, the
--  definition proves exactly which values are, including the ones that must
--  still work.
-- =============================================================================
