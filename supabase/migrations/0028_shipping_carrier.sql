-- =============================================================================
--  Which carrier is moving the parcel, and Ukrposhta's identifiers for it.
--
--  Run this in the Supabase SQL editor. Expected: "Success. No rows returned."
--  Safe to re-run.
--
--  WHY A NEW COLUMN RATHER THAN REUSING shipping_method. That column already
--  exists and holds 'nova_poshta' | 'international' — which reads like a
--  carrier and is not one. It is the DESTINATION MODE: whether this order goes
--  to a Nova Poshta branch inside Ukraine or to an address abroad. Both of its
--  values were true when one company carried everything.
--
--  Now that international can go by either Nova Post or Ukrposhta, the two
--  questions have come apart: "where is it going" and "who is carrying it" are
--  no longer the same question with one answer. Overloading the old column
--  would have meant a third value, 'international_ukrposhta', and every
--  existing query that tests for 'international' silently missing half the
--  export orders. The old column keeps its meaning untouched; the new one
--  answers the new question.
--
--  BACKFILLED, NOT DEFAULTED. Every order placed before today went by Nova
--  Poshta — domestic and cross-border alike — so the historical value is known
--  rather than assumed, and the update below states it. New rows are written
--  explicitly by the invoice route. No column default: a default would let a
--  future insert that forgets the field look like a deliberate Nova Poshta
--  choice, which is exactly the kind of quiet wrong answer this table should
--  not be able to hold.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. The carrier, on both tables.
--
--    payments and orders have mirrored their shipping columns since 0010 and
--    continue to here. payments is written at invoice time; orders is the
--    fulfilment record.
-- ---------------------------------------------------------------------------
alter table public.payments
  add column if not exists shipping_carrier text;

alter table public.orders
  add column if not exists shipping_carrier text;

-- Constrained to the two carriers the code knows about. lib/shipping-carriers.ts
-- holds the same pair — these strings ARE that union, so a change there is a
-- migration here.
alter table public.payments drop constraint if exists payments_shipping_carrier_check;
alter table public.payments
  add constraint payments_shipping_carrier_check
  check (shipping_carrier is null or shipping_carrier in ('nova_poshta', 'ukrposhta'));

alter table public.orders drop constraint if exists orders_shipping_carrier_check;
alter table public.orders
  add constraint orders_shipping_carrier_check
  check (shipping_carrier is null or shipping_carrier in ('nova_poshta', 'ukrposhta'));

-- ---------------------------------------------------------------------------
-- 2. Ukrposhta's own identifiers for a shipment.
--
--    Deliberately NOT reusing np_ttn. A Nova Poshta waybill number and an
--    Ukrposhta barcode are different things issued by different companies with
--    different formats, and one column holding either would need the carrier
--    column consulted before it could be read — including by the tracking cron,
--    which would then be one forgotten check away from asking Nova Poshta about
--    an Ukrposhta barcode.
--
--    Two identifiers because the API returns two: a UUID that addresses the
--    shipment in the eCom API, and a barcode that is what the customer tracks
--    and what is printed on the label.
-- ---------------------------------------------------------------------------
alter table public.orders
  add column if not exists ukrposhta_uuid    text,
  add column if not exists ukrposhta_barcode text;

-- The barcode is what a customer quotes when they ask where their parcel is,
-- so it has to be findable on its own. Partial: only a minority of orders are
-- international, and an index over mostly-nulls is mostly waste.
create index if not exists orders_ukrposhta_barcode_idx
  on public.orders (ukrposhta_barcode)
  where ukrposhta_barcode is not null;

-- ---------------------------------------------------------------------------
-- 3. Backfill history.
--
--    Only rows that actually have a shipping method — an order with none never
--    reached a carrier, and writing one in would invent a fact.
-- ---------------------------------------------------------------------------
update public.payments
   set shipping_carrier = 'nova_poshta'
 where shipping_carrier is null
   and shipping_method is not null;

update public.orders
   set shipping_carrier = 'nova_poshta'
 where shipping_carrier is null
   and shipping_method is not null;

comment on column public.orders.shipping_carrier is
  'Who carries the parcel: nova_poshta | ukrposhta. NOT the same question as shipping_method, which is the destination mode (branch in Ukraine vs address abroad).';

comment on column public.orders.ukrposhta_barcode is
  'Ukrposhta tracking barcode. Separate from np_ttn on purpose — different carrier, different format, and the tracking cron must never confuse them.';

-- =============================================================================
--  VERIFY — read-only. Nothing below writes a row.
--
--    select column_name, data_type, is_nullable
--      from information_schema.columns
--     where table_schema = 'public'
--       and table_name in ('orders', 'payments')
--       and column_name in ('shipping_carrier', 'ukrposhta_uuid', 'ukrposhta_barcode')
--     order by table_name, column_name;
--
--  Expected: shipping_carrier on both, the two ukrposhta_* on orders, all text
--  and all nullable.
--
--    select conname, pg_get_constraintdef(oid)
--      from pg_constraint
--     where conname in ('payments_shipping_carrier_check', 'orders_shipping_carrier_check');
--
--  Expected, and the null branch matters — it is what lets a pre-existing row
--  with no shipping method stay as it is:
--
--    CHECK (shipping_carrier IS NULL OR shipping_carrier = ANY (ARRAY['nova_poshta', 'ukrposhta']))
--
--  And that the backfill did what it says, without naming a single customer:
--
--    select shipping_method, shipping_carrier, count(*)
--      from public.orders
--     group by 1, 2
--     order by 1, 2;
--
--  Expected: every row with a shipping_method has carrier 'nova_poshta'; any
--  row with a null method still has a null carrier.
-- =============================================================================
