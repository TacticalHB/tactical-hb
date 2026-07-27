-- =============================================================================
--  THB-OS Phase D, part 1 — the marketing memory.
--
--  Run this in the Supabase SQL editor. Expected: "Success. No rows returned."
--  Safe to re-run. Independent of 0021_projects.sql, but run both for Phase D.
--
--  THE SHAPE OF THE PROBLEM
--
--  Marketing today is reactive: ads are boosted from a phone, the results live
--  in Meta's dashboard, and the visuals that worked last winter are wherever
--  last winter's chat history is. The plan (§3.1) calls this "ad spend without
--  structure". These two tables are the structure — not a campaign engine,
--  just the shared memory the Marketing Strategist (§6.4) reads:
--
--    marketing_creatives  what assets exist, for which channel and product,
--                         and whether they are in play — so "which creatives
--                         to reuse" is a query, not an archaeology dig.
--    ad_spend             what was actually spent, where, in which month, and
--                         what it visibly returned — entered by the founder,
--                         because the founder is the only honest source.
--
--  WHAT THIS IS NOT. The creative library stores LINKS (Drive, Meta's asset
--  library, /images paths), not files — a URL register, not a CDN. Uploads
--  can join a later phase if linking proves insufficient. And ad_spend is a
--  ledger of the founder's own entries, not an API mirror: connecting Meta's
--  reporting API is exactly the kind of automation the plan defers (§7 F).
--
--  THE STRATEGIST SPENDS NOTHING. Nothing in this migration (or this phase)
--  can move a budget: there is no integration to any ad platform anywhere in
--  the codebase. The agent reads these tables and writes a PLAN into
--  agent_runs for the founder to read, edit, and act on elsewhere (§6.4).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. One channel vocabulary, shared by both tables
--
--    Creatives are tagged with the channels they suit; spend rows name the
--    channel the money went to. One list, not two that drift — 'organic' and
--    'email' are legitimate creative tags and legal (if unusual) spend rows:
--    boosting a newsletter tool subscription is spend like any other.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 2. The creative library
-- ---------------------------------------------------------------------------
create table if not exists public.marketing_creatives (
  id           uuid primary key default gen_random_uuid(),

  title        text not null,

  -- What the asset is, so the strategist can say "reuse the winter video"
  -- and mean it. 'copy' is a text asset: a caption, a hook, an email subject.
  kind         text not null default 'image' check (kind in (
                 'image', 'video', 'copy', 'other')),

  -- Where the asset lives. Nullable: a 'copy' creative can live entirely in
  -- the notes field below, and a physical prop has no URL at all.
  url          text,

  -- Channel tags (plan §4.2: "assets, channel tags, product links").
  -- Constrained as a set so a typo cannot invent a channel the strategist
  -- would then dutifully plan around.
  channels     text[] not null default '{}' check (
                 channels <@ array['meta','instagram','reddit','tiktok',
                                   'google','email','organic','other']::text[]),

  -- Which product the creative sells, when it sells one. The same loose
  -- annotation cost_entries.sku uses: renaming a sku follows, deleting a
  -- stock line orphans the creative rather than deleting it — the asset
  -- still exists even when the product is retired.
  product_sku  text references public.stock_items(sku)
                 on update cascade on delete set null,

  -- The only lifecycle the strategist may SUGGEST moving (it still never
  -- writes): active = in play, paused = benched, retired = history.
  status       text not null default 'active' check (status in (
                 'active', 'paused', 'retired')),

  notes        text,
  created_by   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists marketing_creatives_status_idx
  on public.marketing_creatives (status, created_at desc);

comment on table public.marketing_creatives is
  'Creative library (plan §4.2): links and tags, not files. Status moves only by admin action.';
comment on column public.marketing_creatives.channels is
  'Subset of meta|instagram|reddit|tiktok|google|email|organic|other.';
comment on column public.marketing_creatives.product_sku is
  'Loose product link, like cost_entries.sku. Null = brand-level creative.';

drop trigger if exists marketing_creatives_touch on public.marketing_creatives;
create trigger marketing_creatives_touch before update on public.marketing_creatives
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 3. The ad spend ledger
--
--    One row per campaign per month, or simply per month when the founder
--    doesn't split it — deliberately NOT unique on (channel, month), because
--    two Meta campaigns in one August are two truths, not a conflict.
--
--    Results are the founder's ENTERED numbers. The strategist's rule (§6.4)
--    is "optimises for output per spend using entered results, not invented
--    metrics" — so clicks and orders_attributed are nullable, and null means
--    "not measured", which the agent must repeat honestly, never guess.
-- ---------------------------------------------------------------------------
create table if not exists public.ad_spend (
  id                 uuid primary key default gen_random_uuid(),

  channel            text not null check (channel in (
                       'meta','instagram','reddit','tiktok',
                       'google','email','organic','other')),

  -- The month the spend belongs to, founder's judgement, YYYY-MM. Same shape
  -- as cost_entries.period (0016).
  month              text not null check (month ~ '^[0-9]{4}-[0-9]{2}$'),

  -- Optional label: "August bowls push", "retargeting". Free text.
  campaign           text,

  amount_uah         numeric not null check (amount_uah >= 0),
  -- Only when the invoice was actually in euro (Meta bills in EUR here) —
  -- a note of record, not a second accounting base. Mirrors cost_entries.
  amount_eur         numeric check (amount_eur is null or amount_eur >= 0),

  -- Entered results. Null = not measured. Zero = measured, and it was zero —
  -- the difference is the whole point.
  clicks             integer check (clicks is null or clicks >= 0),
  orders_attributed  integer check (orders_attributed is null or orders_attributed >= 0),

  note               text,
  created_by         text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists ad_spend_month_idx
  on public.ad_spend (month desc, channel);

comment on table public.ad_spend is
  'Ad spend ledger (plan §4.2): founder-entered, per channel and month. No platform API writes here.';
comment on column public.ad_spend.orders_attributed is
  'Founder-entered result. Null = not measured; 0 = measured and zero. Agents never invent this.';

drop trigger if exists ad_spend_touch on public.ad_spend;
create trigger ad_spend_touch before update on public.ad_spend
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Two new voices in the run log
--
--    Phase D's agents write their outputs to agent_runs like everyone else
--    (§6.7). The 0019 check named only the Phase C three, so it is rewritten
--    once, here, to admit BOTH Phase D agents — including the Savings Coach
--    from 0021_projects.sql, so the constraint isn't rebuilt twice.
-- ---------------------------------------------------------------------------
alter table public.agent_runs
  drop constraint if exists agent_runs_agent_check;
alter table public.agent_runs
  add constraint agent_runs_agent_check check (agent in (
    'stock_advisor', 'wholesale_followup', 'weekly_brief',
    'marketing_strategist', 'savings_coach'));

-- ---------------------------------------------------------------------------
-- 5. Access — the standing posture: RLS on with no policies, so the tables
--    are unreachable through the anon and authenticated keys. Reads and
--    writes go through the service role; pages 404 for non-admins and every
--    server action re-checks isAdminEmail() for itself.
-- ---------------------------------------------------------------------------
alter table public.marketing_creatives enable row level security;
alter table public.ad_spend enable row level security;

grant all privileges on public.marketing_creatives to service_role;
grant all privileges on public.ad_spend to service_role;

-- =============================================================================
--  VERIFY — empty but answerable:
--
--    select title, kind, channels, status from public.marketing_creatives
--     order by created_at desc;
--
--    select channel, month, amount_uah, orders_attributed from public.ad_spend
--     order by month desc, channel;
--
--    select conname from pg_constraint
--     where conrelid = 'public.agent_runs'::regclass and conname = 'agent_runs_agent_check';
-- =============================================================================
