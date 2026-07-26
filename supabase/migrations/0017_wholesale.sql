-- =============================================================================
--  THB-OS Phase B, part 1 — wholesale partners.
--
--  Run this in the Supabase SQL editor. Expected: "Success. No rows returned."
--  Safe to re-run. 0018_finance_views.sql depends on the column added here,
--  so this file runs FIRST.
--
--  THE SHAPE OF THE PROBLEM
--
--  Wholesale enquiries arrive through /api/wholesale, get an auto-reply with
--  the application form attached, and then live nowhere. Whether anyone wrote
--  back, ordered, or went quiet exists only in the founder's inbox and memory.
--  This table is that memory, made shared: one row per company, a status that
--  says where the relationship stands, and a follow-up date so "who needs a
--  nudge" is a query instead of a feeling.
--
--  THE PIPELINE
--
--    lead              enquiry received, nothing sent yet
--    contacted         we replied / the application form went out
--    application_sent  their completed application is in hand
--    active            has ordered; a live relationship
--    dormant           was active, has gone quiet — follow-up material
--    rejected          declined, by them or by us
--
--  Statuses are set by a human in /admin/partners. No agent moves a partner
--  through the pipeline, and nothing in this phase sends email of any kind.
--  The Wholesale Follow-up Agent (Phase C) will READ next_follow_up and
--  status; it will never write them.
--
--  "Last order" is deliberately NOT a column. It is derived from the orders
--  a partner is linked to — a stored copy would need maintaining and would
--  drift the first time someone forgot.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. The partner register
-- ---------------------------------------------------------------------------
create table if not exists public.wholesale_partners (
  id             uuid primary key default gen_random_uuid(),

  company        text not null,
  contact_name   text,
  -- Nullable: an enquiry can arrive through Instagram with no email at all.
  -- When present it is the key order-linking suggestions match against.
  email          text,
  phone          text,
  country        text,

  -- Which language future correspondence should use. The enquiry form already
  -- knows the locale it was submitted in; Phase C's draft emails will need it.
  locale         text not null default 'en' check (locale in ('en', 'uk')),

  status         text not null default 'lead' check (status in (
                   'lead', 'contacted', 'application_sent',
                   'active', 'dormant', 'rejected')),

  -- Set by the founder, read by the founder (and by Phase C's agent, later).
  -- Null means "no nudge planned", which is a valid state, not a gap.
  next_follow_up date,

  notes          text,
  created_by     text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- One partner per email address. Two rows sharing an email would make the
-- order-matching suggestion ambiguous — and in practice it means someone
-- entered the same company twice.
create unique index if not exists wholesale_partners_email_idx
  on public.wholesale_partners (lower(btrim(email)))
  where email is not null;

comment on table public.wholesale_partners is
  'Wholesale CRM: one row per company. Statuses move only by admin action in /admin/partners.';
comment on column public.wholesale_partners.status is
  'Pipeline: lead | contacted | application_sent | active | dormant | rejected.';
comment on column public.wholesale_partners.next_follow_up is
  'When the founder intends to nudge this partner. Read-only to agents, always.';

drop trigger if exists wholesale_partners_touch on public.wholesale_partners;
create trigger wholesale_partners_touch before update on public.wholesale_partners
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Linking orders to partners
--
--    "Link partners to orders where possible" (plan §7, Phase B). The link is
--    ALWAYS set by an explicit admin action — the UI may suggest a match when
--    the order email equals the partner email, but nothing writes this column
--    automatically. A guessed link would silently misfile retail revenue as
--    wholesale.
--
--    on delete set null: removing a partner must never take orders with it.
--    The order is a financial record; the link is only an annotation on it.
-- ---------------------------------------------------------------------------
alter table public.orders
  add column if not exists wholesale_partner_id uuid
    references public.wholesale_partners(id) on delete set null;

create index if not exists orders_wholesale_partner_idx
  on public.orders (wholesale_partner_id)
  where wholesale_partner_id is not null;

comment on column public.orders.wholesale_partner_id is
  'Set by explicit admin action in /admin/partners, never inferred. Null = retail.';

-- ---------------------------------------------------------------------------
-- 3. Access — same posture as stock and costs: RLS on, no policies, so the
--    table is unreachable through the anon and authenticated keys. Reads and
--    writes go through the service role; every admin page 404s for non-admins
--    and every server action re-checks isAdminEmail() for itself.
-- ---------------------------------------------------------------------------
alter table public.wholesale_partners enable row level security;

grant all privileges on public.wholesale_partners to service_role;

-- =============================================================================
--  VERIFY — empty, but the shapes should answer:
--
--    select company, status, next_follow_up from public.wholesale_partners
--     order by status, company;
--
--    select column_name from information_schema.columns
--     where table_name = 'orders' and column_name = 'wholesale_partner_id';
-- =============================================================================
