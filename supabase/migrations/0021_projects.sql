-- =============================================================================
--  THB-OS Phase D, part 2 — future products, fairs, and the money to fund them.
--
--  Run this in the Supabase SQL editor. Expected: "Success. No rows returned."
--  Safe to re-run. Run 0020_marketing.sql too — it widens the agent_runs
--  check that the Savings Coach writes under.
--
--  THE SHAPE OF THE PROBLEM
--
--  Tech Bowl and the next product lines will be funded from real profits or
--  not at all, and "we should be putting money aside" is not a plan — it is
--  a feeling (§3.1). These tables turn it into arithmetic the Savings Coach
--  (§6.6) can do: a project with a target and a deadline, a ledger of what
--  has actually been set aside, and the fairs whose costs punctuate the year.
--
--  THE LEDGER, NOT A NUMBER. Progress is the SUM of project_savings rows,
--  never a mutable saved_so_far column — the same discipline as
--  stock_movements (0015): a total you can interrogate row by row, with a
--  date and a name on every change. A withdrawal is a negative row, recorded
--  as honestly as a deposit; funds get raided in real life, and a ledger that
--  cannot say so would drift into fiction.
--
--  NO MONEY MOVES HERE. These are records of intent and of decisions already
--  taken by the founder. The Savings Coach reads them and suggests a monthly
--  set-aside; it writes nothing but its own agent_runs row. There is no bank
--  integration, no transfer, no automation — advisory only (§6.6).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. The projects register
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id                  uuid primary key default gen_random_uuid(),

  name                text not null,

  --  idea         written down, not yet funded or scheduled
  --  saving       actively putting money aside for it
  --  in_progress  being built / ordered / prototyped
  --  done         shipped into the world
  --  parked       deliberately on hold — kept, not deleted
  status              text not null default 'idea' check (status in (
                        'idea', 'saving', 'in_progress', 'done', 'parked')),

  -- What it will take, in hryvnia, founder's estimate. Null = not yet costed,
  -- which is honest and common for an idea; the coach says so instead of
  -- inventing a target.
  target_budget_uah   numeric check (target_budget_uah is null or target_budget_uah > 0),

  -- The founder's CHOSEN monthly set-aside (plan §4.2 "monthly savings
  -- target"). The coach compares its own suggestion against this; it never
  -- writes it.
  monthly_saving_uah  numeric check (monthly_saving_uah is null or monthly_saving_uah > 0),

  -- When the project should be funded/launched. Null = no date pressure,
  -- and the coach then paces by the chosen set-aside alone.
  deadline            date,

  notes               text,
  created_by          text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.projects is
  'Future products and lines (plan §4.2). The Savings Coach reads; only the founder writes.';
comment on column public.projects.monthly_saving_uah is
  'The founder''s chosen set-aside. The coach suggests, compares, and never writes it.';

drop trigger if exists projects_touch on public.projects;
create trigger projects_touch before update on public.projects
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 2. The savings ledger
--
--    Append-only in practice: a wrong entry is corrected by a compensating
--    row, the way a paper ledger would do it. on delete cascade — the ledger
--    is meaningless without its project, and deleting a project is already a
--    confirmed, destructive admin act.
-- ---------------------------------------------------------------------------
create table if not exists public.project_savings (
  id          uuid primary key default gen_random_uuid(),

  project_id  uuid not null references public.projects(id) on delete cascade,

  -- Positive = set aside, negative = taken back out. Zero says nothing.
  amount_uah  numeric not null check (amount_uah <> 0),

  -- The founder's date for the entry, not the row's timestamp — money put
  -- aside "for July" can be recorded in August without lying about July.
  saved_on    date not null default (now() at time zone 'utc')::date,

  note        text,
  created_by  text,
  created_at  timestamptz not null default now()
);

create index if not exists project_savings_project_idx
  on public.project_savings (project_id, saved_on desc);

comment on table public.project_savings is
  'Set-aside ledger. Progress = sum(amount_uah); no mutable total exists to drift.';

-- ---------------------------------------------------------------------------
-- 3. The exhibitions calendar
--
--    PLANNED money lives here (budget_uah); SPENT money belongs in
--    cost_entries with category ''exhibition'' (0016), where finance already
--    counts it. One ledger per fact — a duplicate "actual cost" column here
--    would disagree with finance within a month.
-- ---------------------------------------------------------------------------
create table if not exists public.exhibitions (
  id          uuid primary key default gen_random_uuid(),

  name        text not null,
  location    text,

  starts_on   date,
  ends_on     date,

  budget_uah  numeric check (budget_uah is null or budget_uah >= 0),

  --  considering  seen it, thinking about it
  --  applied      application sent, waiting
  --  confirmed    booth booked — costs are now real
  --  attended     been, done — the retrospective state
  --  skipped      decided against, or missed it
  status      text not null default 'considering' check (status in (
                'considering', 'applied', 'confirmed', 'attended', 'skipped')),

  notes       text,
  created_by  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint exhibitions_dates_order check (
    starts_on is null or ends_on is null or ends_on >= starts_on)
);

create index if not exists exhibitions_starts_idx
  on public.exhibitions (starts_on desc nulls last);

comment on table public.exhibitions is
  'Fair calendar (plan §4.2). budget_uah is the plan; actual spend lives in cost_entries.';

drop trigger if exists exhibitions_touch on public.exhibitions;
create trigger exhibitions_touch before update on public.exhibitions
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Access — the standing posture: RLS on with no policies, unreachable
--    through the anon and authenticated keys. Service role only; pages 404
--    for non-admins and every server action re-checks isAdminEmail().
-- ---------------------------------------------------------------------------
alter table public.projects enable row level security;
alter table public.project_savings enable row level security;
alter table public.exhibitions enable row level security;

grant all privileges on public.projects to service_role;
grant all privileges on public.project_savings to service_role;
grant all privileges on public.exhibitions to service_role;

-- =============================================================================
--  VERIFY — empty but answerable:
--
--    select name, status, target_budget_uah, deadline from public.projects
--     order by created_at desc;
--
--    select p.name, coalesce(sum(s.amount_uah), 0) as saved_uah
--      from public.projects p
--      left join public.project_savings s on s.project_id = p.id
--     group by p.name;
--
--    select name, status, starts_on, budget_uah from public.exhibitions
--     order by starts_on desc nulls last;
-- =============================================================================
