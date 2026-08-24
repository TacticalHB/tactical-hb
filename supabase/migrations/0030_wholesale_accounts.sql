-- =============================================================================
--  Wholesale partner accounts + order requests.
--
--  Run this in the Supabase SQL editor. Expected: "Success. No rows returned."
--  Safe to re-run.
--
--  WHAT THIS ADDS
--
--  0017 gave wholesale a CRM: one row per company, moved through a pipeline by
--  a human. That register is still the source of truth about a relationship.
--  What it could not do is let a partner IN — there was no account, so there
--  was no such thing as a partner signing in and asking for stock.
--
--  This migration adds the account and the ask:
--
--    wholesale_partners.user_id         the auth user that IS this partner
--    wholesale_partners.account_status  whether that user may do anything yet
--    wholesale_requests                 one submitted order request
--    wholesale_request_items            its lines
--
--  TWO STATUSES, AND THEY ARE NOT THE SAME THING
--
--  `status` (0017) is where the RELATIONSHIP stands — lead, contacted, active,
--  dormant. It is CRM history and a salesperson owns it.
--
--  `account_status` is whether this login WORKS — pending, approved, rejected,
--  suspended. It is an access control decision and it gates the portal.
--
--  They were deliberately not merged. A partner can be `active` commercially
--  and `suspended` on the website (a payment dispute), or `lead` commercially
--  and `approved` on the website (approved on the strength of the application,
--  no order yet). Collapsing them would make one of those two states
--  unrepresentable, and both are real.
--
--  APPROVAL IS THE DEFAULT-DENY. account_status defaults to 'pending' and
--  nothing in the application path can set it to anything else — only an admin
--  action writes 'approved'. A registration that half-completes leaves a
--  pending row, which is a person waiting, not a person let in.
--
--  NO PAYMENT LIVES HERE. A request is an ASK, not an order: no shipping
--  method, no carrier, no invoice, no total the customer has agreed to pay.
--  Money moves after a human sends a payment link, and the retail `orders`
--  table remains the only thing Monobank ever touches.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. The partner register learns about accounts
-- ---------------------------------------------------------------------------

-- 0017 pinned locale to the two storefronts that existed. There are four now,
-- and a Japanese or Arabic applicant must not fail a check constraint.
alter table public.wholesale_partners
  drop constraint if exists wholesale_partners_locale_check;
alter table public.wholesale_partners
  add constraint wholesale_partners_locale_check
  check (locale in ('en', 'uk', 'ja', 'ar'));

alter table public.wholesale_partners
  -- on delete set null: deleting the login must not delete the company's
  -- history. The CRM row outlives the account, exactly as it outlives an
  -- order.
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists account_status text not null default 'pending',
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by text,
  -- What the applicant typed when they registered. Kept apart from the
  -- admin-owned `notes` column so a partner can never write into staff notes.
  add column if not exists application_note text;

alter table public.wholesale_partners
  drop constraint if exists wholesale_partners_account_status_check;
alter table public.wholesale_partners
  add constraint wholesale_partners_account_status_check
  check (account_status in ('pending', 'approved', 'rejected', 'suspended'));

-- One login per partner, and one partner per login. Without this a second
-- application from the same person would create a second company row that
-- also passes the portal's "is this user approved" lookup.
create unique index if not exists wholesale_partners_user_idx
  on public.wholesale_partners (user_id)
  where user_id is not null;

comment on column public.wholesale_partners.user_id is
  'The auth user that signs in as this partner. Null = CRM-only row, no portal account.';
comment on column public.wholesale_partners.account_status is
  'Portal access: pending | approved | rejected | suspended. Only approved may open the portal or submit. Distinct from status, which is CRM pipeline.';
comment on column public.wholesale_partners.application_note is
  'Free text from the applicant. Admin notes live in notes; these never mix.';

-- ---------------------------------------------------------------------------
-- 2. Order requests
--
--    A request is a snapshot, not a join. company/email/phone/locale are
--    copied in at submit time and never refreshed: the staff member reading
--    this in three months needs to see what the partner actually sent, not
--    what the CRM row says today. The same reasoning as order_items keeping
--    its own product names.
-- ---------------------------------------------------------------------------
create table if not exists public.wholesale_requests (
  id             uuid primary key default gen_random_uuid(),

  -- Human-quotable in an email: "about WH-4F2A". Generated in application
  -- code (lib/wholesale-portal) rather than by a sequence, so it carries no
  -- information about how many requests exist.
  reference      text not null unique,

  partner_id     uuid not null references public.wholesale_partners(id) on delete cascade,
  -- Who actually pressed submit. Same as the partner's user_id today; kept
  -- separately so a partner with two logins later does not lose the trail.
  user_id        uuid references auth.users(id) on delete set null,

  company        text not null,
  email          text,
  phone          text,
  locale         text not null default 'en' check (locale in ('en', 'uk', 'ja', 'ar')),

  note           text,

  status         text not null default 'submitted' check (status in (
                   'submitted', 'contacted', 'payment_sent', 'paid', 'cancelled')),

  -- NULLABLE ON PURPOSE. Dealer prices may not exist for a product yet, and
  -- the portal shows "quote on request" rather than inventing one. A request
  -- with no total is a valid, ordinary request — it is a quantity ask.
  subtotal_uah   numeric(12,2),
  subtotal_eur   numeric(12,2),
  item_count     integer not null default 0,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists wholesale_requests_partner_idx
  on public.wholesale_requests (partner_id, created_at desc);
create index if not exists wholesale_requests_status_idx
  on public.wholesale_requests (status, created_at desc);

comment on table public.wholesale_requests is
  'A submitted wholesale ask. Never a paid order: no carrier, no invoice, no Monobank. Payment is arranged by email.';
comment on column public.wholesale_requests.subtotal_uah is
  'Null when no dealer price exists for the lines. Not zero — zero would read as free.';

create table if not exists public.wholesale_request_items (
  id             uuid primary key default gen_random_uuid(),
  request_id     uuid not null references public.wholesale_requests(id) on delete cascade,

  -- The catalogue is a TypeScript file, not a table, so the slug is the key
  -- and the name is snapshotted beside it. If a product is renamed or
  -- withdrawn, this row still says what was asked for.
  product_slug   text not null,
  sku            text,
  name           text not null,

  qty            integer not null check (qty > 0),

  unit_price_uah numeric(12,2),
  unit_price_eur numeric(12,2),
  line_total_uah numeric(12,2),
  line_total_eur numeric(12,2),

  created_at     timestamptz not null default now()
);

create index if not exists wholesale_request_items_request_idx
  on public.wholesale_request_items (request_id);

comment on table public.wholesale_request_items is
  'Lines of a wholesale request. Product name and slug are snapshots; prices are null where no dealer price is set.';

drop trigger if exists wholesale_requests_touch on public.wholesale_requests;
create trigger wholesale_requests_touch before update on public.wholesale_requests
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Access
--
--    RLS ON, NO POLICIES — the same posture as stock, costs and the partner
--    register itself. Neither the anon key nor a signed-in user's key can
--    reach these tables at all.
--
--    That is stricter than "a partner may read their own requests", and it is
--    deliberate. A policy of `user_id = auth.uid()` would be correct today and
--    would silently become the whole security model the first time someone
--    queried these tables from the browser. Instead every read and write goes
--    through a server module that establishes who is asking and whether they
--    are approved, and a browser key that leaks grants nothing.
--
--    Partners still see their own request history — the portal fetches it
--    server-side, scoped to their partner_id.
-- ---------------------------------------------------------------------------
alter table public.wholesale_requests       enable row level security;
alter table public.wholesale_request_items  enable row level security;

grant all privileges on public.wholesale_requests      to service_role;
grant all privileges on public.wholesale_request_items to service_role;

-- =============================================================================
--  VERIFY — read-only, safe to run:
--
--    select column_name, data_type, column_default
--      from information_schema.columns
--     where table_name = 'wholesale_partners'
--       and column_name in ('user_id','account_status','approved_at','approved_by','application_note')
--     order by column_name;
--
--    -- must be exactly: pending
--    select distinct account_status from public.wholesale_partners;
--
--    -- must be two rows, rowsecurity = true, and no policies at all
--    select tablename, rowsecurity from pg_tables
--     where tablename in ('wholesale_requests','wholesale_request_items');
--    select count(*) as should_be_zero from pg_policies
--     where tablename in ('wholesale_requests','wholesale_request_items');
-- =============================================================================
