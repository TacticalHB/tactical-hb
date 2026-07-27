-- =============================================================================
--  THB-OS Phase F, part 1 — suppliers, machines, and a seat for the Margin Guard.
--
--  Run this in the Supabase SQL editor AFTER 0021_projects.sql.
--  Expected: "Success. No rows returned." Safe to re-run.
--
--  WHAT THIS CLOSES. suppliers and machines are the last two entities in the
--  plan's §4.2 list with no table behind them. 0016 said so in its own
--  comments — cost_entries.supplier is free text "on purpose ... Phase F
--  builds the real one" — and this is that. Nothing else in §4.2 is missing
--  after this migration.
--
--  THE ONE RULE THAT GOVERNS THE WHOLE FILE: a hryvnia is counted once.
--  0018 already warned that what sits inside a unit cost (product_costs) must
--  not ALSO be logged in cost_entries, or margin subtracts it twice. Machines
--  make that trap larger, because a printer is simultaneously (a) money that
--  left the account in one month and (b) a cost that every part it prints
--  should carry a slice of. This file's answer:
--
--    · The PURCHASE stays where it already is — a one-off row in cost_entries.
--      That is the real money, in the real month.
--    · The HOURLY RATE computed here is a PLANNING figure. It is shown on the
--      workshop page, it is never added to a margin, and nothing in this file
--      or in the app writes it into product_costs.
--    · If the founder decides a unit cost should include machine time, he
--      enters that unit cost himself, dated, in /admin/costs — and then the
--      purchase must come OUT of cost_entries, or it is counted twice. That
--      is a bookkeeping decision, so it stays a human one.
--
--  NO AGENT WRITES ANYTHING HERE. The Cost & Margin Guard (§6.2) reads the
--  finance views and logs one agent_runs row. It does not change a price, a
--  cost, a supplier or a machine — §6.2 is explicit that it "flags issues for
--  human decision".
--
--  ONE NUMBER CHANGES WHEN YOU RUN THIS. Section 8 corrects finance_monthly:
--  every margin the module has ever shown was understated by the shipping
--  customers paid. Read that section before running the file — the finance
--  page and the ops map's margin stat will move the moment it lands.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Who we buy from
--
--    §4.2 asks for name, contacts, lead time, notes; the rest here earns its
--    place by being asked of every supplier eventually anyway.
--
--    lead_time_days is the supplier's OWN quoted lead time and is deliberately
--    NOT wired to stock_items.lead_time_days, which the Stock Advisor reads
--    (0019). Those are two different facts — "what this workshop promises"
--    versus "how long it actually takes this sku to reach the shelf" — and
--    collapsing them would let a salesman's optimism move a Critical
--    threshold. The workshop page may show them side by side; nothing syncs.
--
--    currency records what their invoices arrive in, so a euro bill in
--    cost_entries.amount_eur stops looking like a data-entry slip.
-- ---------------------------------------------------------------------------
create table if not exists public.suppliers (
  id             uuid primary key default gen_random_uuid(),

  name           text not null,
  status         text not null default 'active'
                   check (status in ('active', 'dormant', 'archived')),

  contact_name   text,
  email          text,
  phone          text,
  website        text,
  country        text,

  lead_time_days integer check (lead_time_days is null or lead_time_days >= 0),
  currency       text check (currency is null or currency in ('UAH', 'EUR', 'USD')),

  notes          text,
  created_by     text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Case-insensitive: "Vertex" and "vertex" are one supplier, and letting both
-- exist would split their spend across two rows on the costs page.
create unique index if not exists suppliers_name_idx
  on public.suppliers (lower(name));

create index if not exists suppliers_status_idx on public.suppliers (status);

comment on table public.suppliers is
  'Supplier records (plan §4.2). Replaces cost_entries.supplier free text, which stays for one-off vendors.';
comment on column public.suppliers.lead_time_days is
  'The supplier''s own quoted lead time. NOT the advisor''s input — stock_items.lead_time_days is separate on purpose.';

drop trigger if exists suppliers_touch on public.suppliers;
create trigger suppliers_touch before update on public.suppliers
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Pointing costs at them — WITHOUT a backfill
--
--    cost_entries.supplier (text) is NOT dropped and NOT migrated by matching
--    names. Two reasons. Historical rows say what was typed at the time, and a
--    fuzzy match would silently rewrite the record they exist to preserve; and
--    a one-off vendor — a courier, a stand builder, someone used once — should
--    not need a supplier record before a cost can be entered.
--
--    So the pair reads: supplier_id when it is a supplier we know, supplier
--    text when it isn't, and the app displays coalesce(the record, the text).
--    on delete set null, because deleting a supplier must not delete the money.
-- ---------------------------------------------------------------------------
alter table public.cost_entries
  add column if not exists supplier_id uuid
    references public.suppliers(id) on delete set null;

create index if not exists cost_entries_supplier_id_idx
  on public.cost_entries (supplier_id);

comment on column public.cost_entries.supplier_id is
  'Set when the payee is a known supplier. The free-text supplier column remains for one-off vendors and legacy rows.';

--    Unit costs get the same link: "who quoted this, and when" is the question
--    /admin/costs cannot answer today. Dated rows already keep the history, so
--    this simply says which supplier the figure came from.
alter table public.product_costs
  add column if not exists supplier_id uuid
    references public.suppliers(id) on delete set null;

comment on column public.product_costs.supplier_id is
  'Which supplier quoted this unit cost. Advisory — nothing recalculates a cost when a supplier changes.';

-- ---------------------------------------------------------------------------
-- 3. A category for what the bank keeps
--
--    §6.2 names payment fees as an input to the Margin Guard, and there is
--    nowhere to put them: Monobank's invoice/status returns no commission
--    figure (lib/monobank.ts), payments has no fee column, and 0016's category
--    list has no home for one — so today a fee can only be buried in 'shop' or
--    'other'. This adds the line rather than inventing a rate to multiply by:
--    an acquiring percentage applied to every order would be a guess wearing a
--    number's clothes, and the plan is explicit (§6.4) about entered results
--    over invented metrics.
--
--    Consequence, stated plainly: until a fee is entered, per-product margin
--    is gross of acquiring, and the Guard says so on its own page.
-- ---------------------------------------------------------------------------
alter table public.cost_entries
  drop constraint if exists cost_entries_category_check;
alter table public.cost_entries
  add constraint cost_entries_category_check check (category in (
    'manufacturing', 'materials', 'logistics', 'tax', 'shop',
    'salaries', 'rnd', 'exhibition', 'ads', 'fees', 'other'));

-- ---------------------------------------------------------------------------
-- 4. The workshop floor
--
--    §4.2: "machines — printers, engravers, notes on cost contribution".
--    Everything money-shaped here is optional, because a machine is worth
--    registering the day it arrives and its lifetime hours are a guess that
--    firms up later. Unknown stays null; view 6 reports how much of the rate
--    is actually known rather than treating a blank as a zero.
--
--    hours_per_year exists only to spread maintenance. Without it a service
--    contract cannot become an hourly figure, and with it the arithmetic is
--    honest about being an estimate.
-- ---------------------------------------------------------------------------
create table if not exists public.machines (
  id                        uuid primary key default gen_random_uuid(),

  name                      text not null,
  kind                      text not null default 'other'
                              check (kind in ('printer_3d', 'laser', 'cnc', 'lathe', 'other')),
  status                    text not null default 'active'
                              check (status in ('active', 'idle', 'repair', 'retired')),

  purchased_on              date,
  purchase_cost_uah         numeric(12,2) check (purchase_cost_uah is null or purchase_cost_uah >= 0),

  -- Total productive hours expected from the machine, for straight-line
  -- depreciation per hour. Null = "don't depreciate this yet".
  expected_life_hours       integer check (expected_life_hours is null or expected_life_hours > 0),

  -- Power, consumables and wear that are not already inside a materials cost.
  running_cost_per_hour_uah numeric(10,2) check (running_cost_per_hour_uah is null or running_cost_per_hour_uah >= 0),

  maintenance_per_year_uah  numeric(12,2) check (maintenance_per_year_uah is null or maintenance_per_year_uah >= 0),
  hours_per_year            integer check (hours_per_year is null or hours_per_year > 0),

  supplier_id               uuid references public.suppliers(id) on delete set null,

  notes                     text,
  created_by                text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create unique index if not exists machines_name_idx on public.machines (lower(name));
create index if not exists machines_status_idx on public.machines (status);

comment on table public.machines is
  'Machine register (plan §4.2). Purchase cost is a REFERENCE for the hourly rate — the real money stays in cost_entries.';
comment on column public.machines.purchase_cost_uah is
  'What it cost. Log the purchase in cost_entries too; do NOT also fold depreciation into product_costs, or it counts twice.';
comment on column public.machines.hours_per_year is
  'Estimated productive hours a year. Only used to spread maintenance_per_year_uah into an hourly figure.';

drop trigger if exists machines_touch on public.machines;
create trigger machines_touch before update on public.machines
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 5. How long a thing takes to make
--
--    This is the "machine cost allocation" of §7's Phase F bullet. Without it
--    an hourly rate is a number on a card that allocates to nothing.
--
--    Minutes, not hours: nobody times a print in decimal hours. One row per
--    (sku, machine) so a part that is printed and then engraved carries both.
-- ---------------------------------------------------------------------------
create table if not exists public.product_machine_time (
  id               uuid primary key default gen_random_uuid(),

  sku              text not null references public.stock_items(sku)
                     on update cascade on delete cascade,
  machine_id       uuid not null references public.machines(id) on delete cascade,

  minutes_per_unit numeric(10,2) not null check (minutes_per_unit > 0),

  note             text,
  created_by       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create unique index if not exists product_machine_time_sku_machine_idx
  on public.product_machine_time (sku, machine_id);

comment on table public.product_machine_time is
  'Minutes of each machine per unit of a sku. Feeds the planning figure in machine_unit_cost; never written into product_costs.';

drop trigger if exists product_machine_time_touch on public.product_machine_time;
create trigger product_machine_time_touch before update on public.product_machine_time
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 6. What an hour on each machine costs
--
--    Three components, each null when its inputs are missing, following the
--    house rule that an unknown is never a zero (0018). components_known is
--    the machine equivalent of uncosted_lines: it lets the page say "2 of 3"
--    instead of presenting a partial rate as a complete one.
--
--    hourly_cost_uah is the sum of what IS known — null only when nothing is.
--    That is deliberately softer than order_line_finance's all-or-nothing,
--    because a running cost alone is still a useful floor, whereas a half-
--    known unit cost silently overstates margin on a real order.
--
--    The components are built in a CTE so the null test can name them instead
--    of re-deriving them. Written as nullif(sum, 0) it would be subtly wrong:
--    a machine that genuinely costs nothing per hour would report "rate
--    unknown", which is the same lie as a zero standing in for an unknown,
--    told in the other direction.
-- ---------------------------------------------------------------------------
create or replace view public.machine_hourly_cost
with (security_invoker = true) as
with parts as (
  select
    m.id,
    m.name,
    m.kind,
    m.status,
    case when m.purchase_cost_uah is not null and m.expected_life_hours is not null
         then round(m.purchase_cost_uah / m.expected_life_hours, 2) end   as depreciation_per_hour_uah,
    m.running_cost_per_hour_uah,
    case when m.maintenance_per_year_uah is not null and m.hours_per_year is not null
         then round(m.maintenance_per_year_uah / m.hours_per_year, 2) end as maintenance_per_hour_uah
  from public.machines m
)
select
  id,
  name,
  kind,
  status,
  depreciation_per_hour_uah,
  running_cost_per_hour_uah,
  maintenance_per_hour_uah,

  case when depreciation_per_hour_uah  is null
        and running_cost_per_hour_uah  is null
        and maintenance_per_hour_uah   is null
       then null
       else coalesce(depreciation_per_hour_uah, 0)
          + coalesce(running_cost_per_hour_uah, 0)
          + coalesce(maintenance_per_hour_uah, 0)
  end                                                                     as hourly_cost_uah,

  (case when depreciation_per_hour_uah  is not null then 1 else 0 end)
  + (case when running_cost_per_hour_uah is not null then 1 else 0 end)
  + (case when maintenance_per_hour_uah  is not null then 1 else 0 end)   as components_known
from parts;

comment on view public.machine_hourly_cost is
  'Planning rate per machine hour: depreciation + running + maintenance. components_known says how much of it is real.';

-- ---------------------------------------------------------------------------
-- 7. The allocation, per sku
--
--    A PLANNING FIGURE AND NOTHING ELSE. Read it beside the entered unit cost
--    to see whether machine time is being carried; it is never added to one.
--    machines_missing_rate counts the machines in a sku's routing whose hourly
--    cost is unknown, so a suspiciously cheap total explains itself.
-- ---------------------------------------------------------------------------
create or replace view public.machine_unit_cost
with (security_invoker = true) as
select
  t.sku,
  sum(t.minutes_per_unit)                                        as minutes_per_unit,
  round(sum(t.minutes_per_unit / 60.0 * h.hourly_cost_uah)::numeric, 2) as machine_cost_per_unit_uah,
  count(*)                                                       as machines_used,
  count(*) filter (where h.hourly_cost_uah is null)              as machines_missing_rate
from public.product_machine_time t
join public.machine_hourly_cost h on h.id = t.machine_id
group by t.sku;

comment on view public.machine_unit_cost is
  'Estimated machine cost per unit by sku. Planning only — compare with product_costs, never substitute for it.';

-- ---------------------------------------------------------------------------
-- 8. THE CORRECTION — shipping was never counted as revenue
--
--    orders.amount_uah is GOODS ONLY. The invoice is composed as
--    `goods.uah + shippingUah` (app/api/checkout/create-invoice/route.ts) and
--    the confirmation email adds them back for the "Paid" line
--    (lib/fulfilment.ts). Shipping is charged on top and stored in its own
--    column; it has never been inside amount_uah.
--
--    finance_monthly sums amount_uah and calls it revenue, while Nova Poshta's
--    invoices land in cost_entries under 'logistics' and are subtracted as
--    opex. One side of the delivery trade was counted and the other was not,
--    so every margin this module has shown is understated by roughly the
--    shipping charged that month. 0018's own comment claims "shipping and
--    discounts included" — true of discounts, wrong about shipping.
--
--    This is the number the Cost & Margin Guard exists to tell the truth
--    about, so it is fixed before the agent is built rather than after.
--
--    revenue_uah KEEPS ITS MEANING — goods, as the page has always shown it —
--    because silently restating a column the founder reads weekly is how you
--    lose trust in the whole module. Shipping arrives as its own column and
--    enters margin_uah explicitly. CREATE OR REPLACE allows appending a
--    column at the end; the eight existing ones keep their names, types and
--    positions, so nothing that selects from this view breaks.
--
--    The finance page must now show a shipping column, or its row stops adding
--    up: Revenue − COGS − Opex will no longer equal Margin.
-- ---------------------------------------------------------------------------
create or replace view public.finance_monthly
with (security_invoker = true) as
with revenue as (
  select to_char(created_at at time zone 'Europe/Kyiv', 'YYYY-MM') as month,
         count(*)                                    as orders_count,
         sum(amount_uah)                             as revenue_uah,
         count(*) filter (where amount_uah is null)  as unpriced_orders,
         -- not null since 0010, but coalesced anyway: a sum that silently
         -- becomes null would take the whole month's margin with it.
         sum(coalesce(shipping_uah, 0))              as shipping_charged_uah
    from public.orders
   where status in ('paid', 'processing', 'shipped', 'delivered')
   group by 1
),
cogs as (
  select month,
         sum(line_cost_uah)                             as cogs_uah,
         count(*) filter (where line_cost_uah is null)  as uncosted_lines
    from public.order_line_finance
   group by month
),
opex as (
  select month, sum(total_uah) as opex_uah
    from public.cost_entries_monthly
   group by month
)
select
  coalesce(r.month, c.month, x.month)  as month,
  coalesce(r.orders_count, 0)          as orders_count,
  r.revenue_uah,
  coalesce(r.unpriced_orders, 0)       as unpriced_orders,
  c.cogs_uah,
  coalesce(c.uncosted_lines, 0)        as uncosted_lines,
  x.opex_uah,
  coalesce(r.revenue_uah, 0)
    + coalesce(r.shipping_charged_uah, 0)
    - coalesce(c.cogs_uah, 0)
    - coalesce(x.opex_uah, 0)          as margin_uah,
  coalesce(r.shipping_charged_uah, 0)  as shipping_charged_uah
from revenue r
full outer join cogs c on c.month = r.month
full outer join opex x on x.month = coalesce(r.month, c.month);

comment on view public.finance_monthly is
  'One row per Kyiv month. revenue_uah is goods; shipping_charged_uah is delivery billed to customers; margin_uah counts both.';
comment on column public.finance_monthly.shipping_charged_uah is
  'Delivery charged to customers. Never inside revenue_uah — orders.amount_uah is goods only.';

-- ---------------------------------------------------------------------------
-- 9. Retail against wholesale
--
--    §6.2 asks for "margin by channel (retail vs wholesale)", and the split is
--    already recorded: orders.wholesale_partner_id, set only by admin action
--    (0017). This could be assembled in TypeScript from two reads — but then
--    the status allowlist and the Kyiv-month boundary would be re-derived by
--    hand, which is exactly how a second "revenue" figure starts disagreeing
--    with the first. It belongs beside the view it must agree with.
--
--    GROSS MARGIN ONLY — revenue plus shipping, minus cogs. Opex is absent on
--    purpose: rent, salaries and ad spend are not attributable to retail or
--    wholesale without an allocation key, and any key we picked would be
--    invented. A net-looking figure resting on a guess is the flattery 0018
--    refuses; the month's true net stays in finance_monthly, undivided.
-- ---------------------------------------------------------------------------
create or replace view public.finance_channel_monthly
with (security_invoker = true) as
with orders_by_channel as (
  select to_char(o.created_at at time zone 'Europe/Kyiv', 'YYYY-MM')          as month,
         case when o.wholesale_partner_id is null then 'retail'
              else 'wholesale' end                                            as channel,
         count(*)                                       as orders_count,
         sum(o.amount_uah)                              as revenue_uah,
         count(*) filter (where o.amount_uah is null)   as unpriced_orders,
         sum(coalesce(o.shipping_uah, 0))               as shipping_charged_uah
    from public.orders o
   where o.status in ('paid', 'processing', 'shipped', 'delivered')
   group by 1, 2
),
lines_by_channel as (
  select month,
         case when wholesale_partner_id is null then 'retail'
              else 'wholesale' end                      as channel,
         sum(qty)                                       as units,
         sum(line_revenue_uah)                          as line_revenue_uah,
         sum(line_cost_uah)                             as cogs_uah,
         count(*) filter (where line_cost_uah is null)  as uncosted_lines
    from public.order_line_finance
   group by 1, 2
)
select
  coalesce(o.month, l.month)             as month,
  coalesce(o.channel, l.channel)         as channel,
  coalesce(o.orders_count, 0)            as orders_count,
  o.revenue_uah,
  coalesce(o.unpriced_orders, 0)         as unpriced_orders,
  coalesce(o.shipping_charged_uah, 0)    as shipping_charged_uah,
  coalesce(l.units, 0)                   as units,
  l.line_revenue_uah,
  l.cogs_uah,
  coalesce(l.uncosted_lines, 0)          as uncosted_lines,
  coalesce(o.revenue_uah, 0)
    + coalesce(o.shipping_charged_uah, 0)
    - coalesce(l.cogs_uah, 0)            as gross_margin_uah
from orders_by_channel o
full outer join lines_by_channel l
  on l.month = o.month and l.channel = o.channel;

comment on view public.finance_channel_monthly is
  'Retail vs wholesale per Kyiv month. GROSS margin only — opex is not attributable to a channel and is never split here.';

-- ---------------------------------------------------------------------------
-- 10. A sixth voice in the run log
--
--    The Cost & Margin Guard (§6.2) stores its output like every other agent.
--    Same one-line widening 0020 did for the Phase D pair.
-- ---------------------------------------------------------------------------
alter table public.agent_runs
  drop constraint if exists agent_runs_agent_check;
alter table public.agent_runs
  add constraint agent_runs_agent_check check (agent in (
    'stock_advisor', 'wholesale_followup', 'weekly_brief',
    'marketing_strategist', 'savings_coach', 'cost_margin_guard'));

-- ---------------------------------------------------------------------------
-- 11. Access — the standing posture: RLS on with no policies, so the tables are
--    unreachable through the anon and authenticated keys. Service role only;
--    pages 404 for non-admins and every server action re-checks isAdminEmail().
--
--    The views are revoked explicitly rather than left to defaults, as 0018
--    established: security_invoker views over admin tables have no business
--    being reachable by a browser key even when the underlying RLS would stop
--    them anyway.
-- ---------------------------------------------------------------------------
alter table public.suppliers            enable row level security;
alter table public.machines             enable row level security;
alter table public.product_machine_time enable row level security;

grant all privileges on public.suppliers            to service_role;
grant all privileges on public.machines             to service_role;
grant all privileges on public.product_machine_time to service_role;

revoke all on public.machine_hourly_cost       from public, anon, authenticated;
revoke all on public.machine_unit_cost         from public, anon, authenticated;
revoke all on public.finance_channel_monthly   from public, anon, authenticated;

grant select on public.machine_hourly_cost     to service_role;
grant select on public.machine_unit_cost       to service_role;
grant select on public.finance_channel_monthly to service_role;

-- finance_monthly was replaced, not created — CREATE OR REPLACE keeps the
-- grants and the revokes 0018 set on it, so it is deliberately not re-stated
-- here. The VERIFY block below checks that, rather than assuming it.

-- =============================================================================
--  VERIFY — empty but answerable:
--
--    select name, status, lead_time_days, currency from public.suppliers
--     order by name;
--
--    select name, kind, status, hourly_cost_uah, components_known
--      from public.machine_hourly_cost order by name;
--
--    select * from public.machine_unit_cost order by sku;
--
--    -- the two widened constraints
--    select conname, pg_get_constraintdef(oid) from pg_constraint
--     where conrelid in ('public.cost_entries'::regclass, 'public.agent_runs'::regclass)
--       and conname in ('cost_entries_category_check', 'agent_runs_agent_check');
--
--    -- the two new links
--    select column_name from information_schema.columns
--     where table_schema = 'public'
--       and ((table_name = 'cost_entries'  and column_name = 'supplier_id')
--         or (table_name = 'product_costs' and column_name = 'supplier_id'));
--
--  AND THE CORRECTION — this one has real rows behind it, so check it:
--
--    select month, revenue_uah, shipping_charged_uah, cogs_uah, opex_uah, margin_uah
--      from public.finance_monthly order by month desc;
--    -- shipping_charged_uah should equal the delivery you have billed, and
--    -- margin_uah should now be HIGHER than the figure /admin/finance showed
--    -- before, by exactly that amount.
--
--    select month, channel, orders_count, revenue_uah, shipping_charged_uah,
--           cogs_uah, uncosted_lines, gross_margin_uah
--      from public.finance_channel_monthly order by month desc, channel;
--    -- retail and wholesale orders_count must add up to finance_monthly's.
--
--    -- the browser keys must still be locked out of the replaced view
--    select grantee, privilege_type from information_schema.role_table_grants
--     where table_name = 'finance_monthly';
--    -- expect service_role only; no anon, no authenticated.
-- =============================================================================
