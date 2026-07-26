-- =============================================================================
--  THB-OS Phase B, part 2 — the finance read layer.
--
--  Run this AFTER 0017_wholesale.sql (order_line_finance passes through
--  orders.wholesale_partner_id). Expected: "Success. No rows returned."
--  Safe to re-run — everything here is CREATE OR REPLACE VIEW.
--
--  NO NEW TABLES. Finance is a reading of what already exists: orders and
--  order_items carry the revenue, product_costs and cost_entries (0016) carry
--  the spend. These views only join and group — nothing here can mutate a
--  record, which is the whole point: the snapshot page cannot lie about
--  having changed something.
--
--  THE CONVENTIONS, decided once, here:
--
--  · UAH is the base currency, inheriting 0016's asymmetry. Orders without an
--    amount_uah (pre-0008 rows) are COUNTED but not summed, and surfaced as
--    unpriced_orders — converting them at today's rate would restate last
--    year's revenue every time lib/currency.ts moved.
--
--  · Months are Kyiv months. created_at is timestamptz; an order placed at
--    01:30 on the 1st, Kyiv time, is 22:30 UTC on the previous month's last
--    day, and the founder's month should not disagree with the founder's
--    clock.
--
--  · Revenue counts status in (paid, processing, shipped, delivered) — an
--    explicit allowlist, not `<> 'cancelled'`, so that any future status
--    (say, refunded) stays OUT of the money until someone decides otherwise.
--    Every order exists only after Monobank confirmed the money (see
--    lib/fulfilment.ts), so there is no pending state to exclude.
--
--  · Unknown costs are NULL, never zero. A margin computed over a silent zero
--    is flattery; uncosted_lines says exactly how much of the month is still
--    a guess.
--
--  · Margin = revenue − cogs − opex trusts 0016's bookkeeping split: what is
--    inside a unit cost (product_costs) must not ALSO be logged in
--    cost_entries, or that hryvnia is subtracted twice. The views cannot
--    enforce discipline; they can only make its absence visible.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. One row per order line, priced and costed
--
--    The line's unit price already CONTAINS the add-on upcharge — pricing.ts
--    folds the lid and rubber into `unit` before the order is written. So the
--    line's cost must fold the parts in too, or every HMD sold with a lid
--    would look more profitable by exactly the lid's cost.
--
--    The cost is the one in force on the order date: latest effective_from at
--    or before it. This DISTINCT-ON-shaped lookup is why product_costs is
--    dated (0016) and why this lives in SQL — the Supabase client cannot
--    express the lateral join.
--
--    If ANY component of a line's cost is unknown (no unit cost yet, or an
--    add-on part without one), line_cost_uah is null — a partial sum would
--    read as a real figure and quietly overstate the margin.
-- ---------------------------------------------------------------------------
create or replace view public.order_line_finance
with (security_invoker = true) as
select
  o.id                                                        as order_id,
  (o.created_at at time zone 'Europe/Kyiv')::date             as ordered_on,
  to_char(o.created_at at time zone 'Europe/Kyiv', 'YYYY-MM') as month,
  o.status,
  o.wholesale_partner_id,

  -- Same sku resolution as apply_order_stock (0015): slug plus lowercased
  -- variant. Pre-0015 orders have no variant and resolve to the bare slug —
  -- the best that can honestly be said about them.
  oi.product_id || coalesce('__' || lower(oi.variant), '')    as sku,
  oi.product_name,
  oi.variant,
  oi.addon_lid,
  oi.addon_rubber,
  oi.quantity                                                 as qty,

  oi.price_uah                                                as unit_price_uah,
  oi.price_uah * oi.quantity                                  as line_revenue_uah,

  item_cost.unit_cost_uah,
  case
    when item_cost.unit_cost_uah is null
      or (oi.addon_lid    and lid_cost.unit_cost_uah    is null)
      or (oi.addon_rubber and rubber_cost.unit_cost_uah is null)
    then null
    else ( item_cost.unit_cost_uah
         + case when oi.addon_lid    then lid_cost.unit_cost_uah    else 0 end
         + case when oi.addon_rubber then rubber_cost.unit_cost_uah else 0 end
         ) * oi.quantity
  end                                                         as line_cost_uah

from public.order_items oi
join public.orders o on o.id = oi.order_id

left join lateral (
  select pc.unit_cost_uah
    from public.product_costs pc
   where pc.sku = oi.product_id || coalesce('__' || lower(oi.variant), '')
     and pc.effective_from <= (o.created_at at time zone 'Europe/Kyiv')::date
   order by pc.effective_from desc
   limit 1
) item_cost on true

left join lateral (
  select pc.unit_cost_uah
    from public.product_costs pc
   where pc.sku = 'part__lid'
     and pc.effective_from <= (o.created_at at time zone 'Europe/Kyiv')::date
   order by pc.effective_from desc
   limit 1
) lid_cost on oi.addon_lid

left join lateral (
  select pc.unit_cost_uah
    from public.product_costs pc
   where pc.sku = 'part__rubber'
     and pc.effective_from <= (o.created_at at time zone 'Europe/Kyiv')::date
   order by pc.effective_from desc
   limit 1
) rubber_cost on oi.addon_rubber

where o.status in ('paid', 'processing', 'shipped', 'delivered');

comment on view public.order_line_finance is
  'Every countable order line with its revenue and its all-in cost (add-on parts folded in) as of the order date.';

-- ---------------------------------------------------------------------------
-- 2. Operating costs by month and category
--
--    Each entry lands in exactly ONE month: its stated period when it has one
--    (rent belongs to the month it pays for), otherwise the month it was
--    incurred. Note this is stricter than the /admin/costs listing filter,
--    which shows an entry under both months when they differ — a listing can
--    afford to be generous, a total cannot count anything twice.
-- ---------------------------------------------------------------------------
create or replace view public.cost_entries_monthly
with (security_invoker = true) as
select
  coalesce(period, to_char(incurred_on, 'YYYY-MM')) as month,
  category,
  sum(amount_uah)                                   as total_uah,
  count(*)                                          as entries
from public.cost_entries
group by 1, 2;

comment on view public.cost_entries_monthly is
  'cost_entries grouped so each entry counts once: by period when set, else by incurred month.';

-- ---------------------------------------------------------------------------
-- 3. The month, in one row
--
--    Revenue comes from orders.amount_uah — the money that actually moved,
--    shipping and discounts included. It will not equal the sum of line
--    revenue in view 4, and should not: "what did customers pay us" and
--    "what did the products sell for" are different questions with different
--    true answers.
--
--    FULL OUTER JOINs so a month of pure spend (a fair, a machine, no sales)
--    still appears — as a negative margin, which is what it was.
-- ---------------------------------------------------------------------------
create or replace view public.finance_monthly
with (security_invoker = true) as
with revenue as (
  select to_char(created_at at time zone 'Europe/Kyiv', 'YYYY-MM') as month,
         count(*)                                    as orders_count,
         sum(amount_uah)                             as revenue_uah,
         count(*) filter (where amount_uah is null)  as unpriced_orders
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
  -- Nulls become zero HERE and only here, so the arithmetic works; the
  -- columns above keep their honest nulls for the page to flag.
  coalesce(r.revenue_uah, 0)
    - coalesce(c.cogs_uah, 0)
    - coalesce(x.opex_uah, 0)          as margin_uah
from revenue r
full outer join cogs c on c.month = r.month
full outer join opex x on x.month = coalesce(r.month, c.month);

comment on view public.finance_monthly is
  'One row per Kyiv month: revenue (money in), cogs (unit costs of what sold), opex, simple margin.';

-- ---------------------------------------------------------------------------
-- 4. What each product did, by month
--
--    Merchandise view: line revenue (unit price × qty, add-ons included in
--    the price) against line cost. sum() skips nulls, so the totals cover
--    only the KNOWN lines — uncosted_lines / unpriced_lines say how many
--    were left out, and the page must show that, not bury it.
-- ---------------------------------------------------------------------------
create or replace view public.finance_products_monthly
with (security_invoker = true) as
select
  month,
  sku,
  -- Names are snapshots and can drift across catalogue rewordings; any one of
  -- them is fine for display.
  max(product_name)                                  as product_name,
  sum(qty)                                           as units,
  sum(line_revenue_uah)                              as revenue_uah,
  sum(line_cost_uah)                                 as cogs_uah,
  count(*) filter (where line_cost_uah    is null)   as uncosted_lines,
  count(*) filter (where line_revenue_uah is null)   as unpriced_lines
from public.order_line_finance
group by month, sku;

comment on view public.finance_products_monthly is
  'Units, revenue and cost per sku per Kyiv month. Totals cover known lines only — check the *_lines counts.';

-- ---------------------------------------------------------------------------
-- 5. Access
--
--    security_invoker throughout, as 0016 established. But one step stricter
--    on grants: these views sit over `orders`, which — unlike stock and costs
--    — HAS policies letting a customer read their own rows. Through an
--    invoker view a signed-in customer would see their own slice (with null
--    costs, since product_costs shows them nothing). Not a leak, but finance
--    is an admin surface and no browser key has any business reaching it, so
--    the revoke is explicit rather than left to defaults.
-- ---------------------------------------------------------------------------
revoke all on public.order_line_finance        from public, anon, authenticated;
revoke all on public.cost_entries_monthly      from public, anon, authenticated;
revoke all on public.finance_monthly           from public, anon, authenticated;
revoke all on public.finance_products_monthly  from public, anon, authenticated;

grant select on public.order_line_finance        to service_role;
grant select on public.cost_entries_monthly      to service_role;
grant select on public.finance_monthly           to service_role;
grant select on public.finance_products_monthly  to service_role;

-- =============================================================================
--  VERIFY — with one live order and no unit costs yet, expect:
--
--    select * from public.finance_monthly;
--    -- one row: this month, orders_count 1, revenue_uah set,
--    -- cogs_uah null, uncosted_lines > 0
--
--    select * from public.order_line_finance;
--    -- that order's lines, line_cost_uah null until unit costs are entered
--
--  Then enter a unit cost dated on or before the order in /admin/costs and
--  re-run: line_cost_uah fills in, uncosted_lines falls.
-- =============================================================================
