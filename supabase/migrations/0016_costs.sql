-- =============================================================================
--  THB-OS Phase A, part 2 — costs.
--
--  Run this AFTER 0015_stock.sql (product_costs points at stock_items.sku).
--  Expected: "Success. No rows returned." Safe to re-run.
--
--  UAH IS THE BASE CURRENCY HERE, and that is a deliberate asymmetry with the
--  rest of the schema. Orders carry both amounts because loyalty is
--  denominated in EUR and Monobank settles in UAH. Costs have no such pull:
--  manufacture, materials, the workshop and salaries are all paid in hryvnia,
--  so a EUR figure would be a conversion of a UAH fact, taken at whatever rate
--  happened to be in lib/currency.ts that week. amount_eur exists only for the
--  bills that genuinely arrive in euro (imports, ad platforms) — it records
--  what was invoiced, it is not a mirror of amount_uah.
--
--  Phase A only CAPTURES costs. Margin, channel profitability and the
--  accountant's export are Phase B, and they read these tables — which is why
--  unit costs are dated rather than overwritten.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. What one unit costs us
--
--    EFFECTIVE-DATED, not editable in place. If a new aluminium price simply
--    overwrote the old one, every margin ever calculated would silently
--    restate itself — last quarter would get more or less profitable because
--    of something that happened this morning. Same reasoning that made
--    order_items snapshot product_name and price_eur in 0003.
--
--    Phase B reads "the cost whose effective_from is the latest one on or
--    before the order date". Today, /admin/costs shows the current one.
-- ---------------------------------------------------------------------------
create table if not exists public.product_costs (
  id             uuid primary key default gen_random_uuid(),
  sku            text not null references public.stock_items(sku) on update cascade on delete cascade,

  -- Landed cost of one unit: manufacture plus anything needed to have it on
  -- the shelf. Overheads that cannot be attributed to a single unit belong in
  -- cost_entries, not smeared in here.
  unit_cost_uah  numeric(12,2) not null check (unit_cost_uah >= 0),

  effective_from date not null default current_date,
  note           text,
  created_by     text,
  created_at     timestamptz not null default now()
);

-- One cost per sku per day — correcting today's figure updates it rather than
-- stacking a second row nobody can choose between.
create unique index if not exists product_costs_sku_from_idx
  on public.product_costs (sku, effective_from);

comment on table public.product_costs is
  'Unit cost by sku, effective-dated so past margins never restate themselves when a price changes.';
comment on column public.product_costs.unit_cost_uah is
  'Landed cost of one unit in UAH. Unattributable overheads belong in cost_entries.';

-- ---------------------------------------------------------------------------
-- 2. Everything that is not a unit cost
--
--    The categories are the master plan's list (§4.2) and nothing more.
--    supplier is free text in Phase A on purpose: a suppliers table with one
--    column and no records would be ceremony, and Phase F builds the real one.
--
--    period — 'YYYY-MM' for a recurring monthly cost (rent, salaries), null for
--    a one-off (a machine, a fair stand). It is what makes "what does a month
--    cost us" answerable without guessing which rows repeat.
-- ---------------------------------------------------------------------------
create table if not exists public.cost_entries (
  id          uuid primary key default gen_random_uuid(),

  category    text not null check (category in (
                'manufacturing', 'materials', 'logistics', 'tax', 'shop',
                'salaries', 'rnd', 'exhibition', 'ads', 'other')),

  amount_uah  numeric(12,2) not null check (amount_uah >= 0),
  -- Only when the bill itself was in euro. Null is the normal case.
  amount_eur  numeric(12,2) check (amount_eur is null or amount_eur >= 0),

  incurred_on date not null default current_date,
  -- Spelled [0-9] rather than \d so the pattern cannot change meaning under a
  -- session with standard_conforming_strings off.
  period      text check (period is null or period ~ '^[0-9]{4}-[0-9]{2}$'),

  supplier    text,
  -- Set when a cost belongs to one product; null for general overhead.
  sku         text references public.stock_items(sku) on update cascade on delete set null,

  note        text,
  created_by  text,
  created_at  timestamptz not null default now()
);

create index if not exists cost_entries_incurred_idx on public.cost_entries (incurred_on desc);
create index if not exists cost_entries_period_idx   on public.cost_entries (period);
create index if not exists cost_entries_category_idx on public.cost_entries (category);

comment on table public.cost_entries is
  'Dated operating costs by category. Unit costs live in product_costs; this is everything else.';
comment on column public.cost_entries.period is
  'YYYY-MM for a recurring monthly cost, null for a one-off. Distinguishes rent from a machine purchase.';
comment on column public.cost_entries.amount_eur is
  'What was invoiced, when the bill was in euro. Not a conversion of amount_uah — never write one here.';

-- ---------------------------------------------------------------------------
-- 3. The current unit cost, one row per sku
--
--    DISTINCT ON is the right tool and the Supabase client cannot express it,
--    so it lives here rather than being approximated in TypeScript.
--
--    security_invoker so the view is read with the CALLER's rights, not the
--    owner's. Without it a view over an RLS-protected table is a hole with a
--    nice name — this one is reachable only by the service role either way,
--    but the default is worth refusing on principle.
-- ---------------------------------------------------------------------------
create or replace view public.product_costs_current
with (security_invoker = true) as
  select distinct on (sku)
         sku, unit_cost_uah, effective_from, note
    from public.product_costs
   where effective_from <= current_date
   order by sku, effective_from desc;

comment on view public.product_costs_current is
  'Latest unit cost in force per sku. Future-dated rows are excluded until their date arrives.';

-- ---------------------------------------------------------------------------
-- 4. Access — admin-only, same posture as stock and payments.
--    RLS on, no policies, service role only.
-- ---------------------------------------------------------------------------
alter table public.product_costs enable row level security;
alter table public.cost_entries  enable row level security;

grant all privileges on public.product_costs to service_role;
grant all privileges on public.cost_entries  to service_role;
grant select        on public.product_costs_current to service_role;

-- =============================================================================
--  VERIFY — empty, but the shapes should answer:
--
--    select * from public.product_costs_current;
--    select category, sum(amount_uah) from public.cost_entries
--     where period = to_char(now(), 'YYYY-MM') group by category;
-- =============================================================================
