-- =============================================================================
--  THB-OS Phase F, part 2 — the record of what we actually sent a partner.
--
--  Run this in the Supabase SQL editor AFTER 0022_suppliers_machines.sql.
--  Expected: "Success. No rows returned." Safe to re-run.
--
--  WHAT CHANGES THE DAY THIS LANDS. Until now nothing in this codebase has
--  ever sent a message to a customer or a partner on an agent's suggestion.
--  Order confirmations and the wholesale auto-reply are replies to something
--  the recipient just did; the low-stock alert and the Monday brief talk only
--  to the founder. The follow-up send gate is the first path where a person
--  who did nothing receives a letter because the system noticed their silence.
--
--  So the constraints are written down here, in the schema, not just in the
--  page that happens to call it today:
--
--  · ONE ROW PER SEND ATTEMPT, written whether it succeeded or failed. A
--    failed send that left no trace is how the same partner gets three copies.
--  · SUBJECT AND BODY ARE SNAPSHOTS. The founder edits the draft before
--    approving, so the template cannot reconstruct what was sent — the same
--    reasoning that made order_items snapshot product_name in 0003.
--  · sent_by IS THE HUMAN WHO APPROVED IT, never 'system'. There is no cron
--    path to this table and there must never be one: a scheduled job that
--    mails partners is precisely the thing §6.3 forbids.
--  · NOTHING HERE MOVES THE PARTNER. status and next_follow_up stay exactly
--    as 0017 left them — "read-only to agents, always". Sending a letter is
--    not the same as deciding the relationship changed, and the founder makes
--    that call in /admin/partners as before.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. The outbound log
-- ---------------------------------------------------------------------------
create table if not exists public.partner_messages (
  id           uuid primary key default gen_random_uuid(),

  partner_id   uuid not null references public.wholesale_partners(id) on delete cascade,

  -- The address as it was at send time. The partner's email may be corrected
  -- later; this says where the letter actually went.
  to_email     text not null,
  locale       text not null check (locale in ('en', 'uk')),

  subject      text not null,
  body         text not null,

  -- Only one kind exists. Named rather than assumed so a second kind (terms,
  -- a price list) has somewhere to go without a migration that rewrites rows.
  kind         text not null default 'followup' check (kind in ('followup')),

  -- 'failed' rows are kept deliberately: they are the evidence for why a
  -- second attempt is allowed, and the reason a silent retry loop can't form.
  status       text not null check (status in ('sent', 'failed')),
  error        text,

  -- The admin email that pressed send. Not nullable, no default — a row that
  -- cannot name its human has no business existing.
  sent_by      text not null,

  created_at   timestamptz not null default now()
);

create index if not exists partner_messages_partner_idx
  on public.partner_messages (partner_id, created_at desc);

comment on table public.partner_messages is
  'Every follow-up send ATTEMPT, successful or not. Written only by an admin action; no cron path reaches this table.';
comment on column public.partner_messages.body is
  'What was actually sent, after the founder''s edits. A snapshot — the template cannot reproduce it.';
comment on column public.partner_messages.sent_by is
  'The admin who approved this send. Never ''system'' — §6.3 forbids sending a partner anything unattended.';

-- ---------------------------------------------------------------------------
-- 2. Access — the standing posture: RLS on with no policies, so the table is
--    unreachable through the anon and authenticated keys. Service role only;
--    the page 404s for non-admins and the action re-checks isAdminEmail().
-- ---------------------------------------------------------------------------
alter table public.partner_messages enable row level security;

grant all privileges on public.partner_messages to service_role;

-- =============================================================================
--  VERIFY — empty but answerable:
--
--    select p.company, m.to_email, m.status, m.sent_by, m.created_at
--      from public.partner_messages m
--      join public.wholesale_partners p on p.id = m.partner_id
--     order by m.created_at desc;
--
--    -- nothing may be attributed to the machine
--    select count(*) from public.partner_messages where sent_by = 'system';
--    -- expect 0, now and forever
-- =============================================================================
