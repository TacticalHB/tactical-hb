-- =============================================================================
--  What Ukrposhta last said about a parcel, and when we last asked.
--
--  Run this in the Supabase SQL editor. Expected: "Success. No rows returned."
--  Safe to re-run.
--
--  WHY NOT np_status_code. Migration 0014 added np_status_code /
--  np_status_checked_at for Nova Poshta, and the obvious economy would be to
--  let Ukrposhta write into the same two columns — one carrier per order, so
--  they can never collide.
--
--  They would still be wrong. The codes are not the same alphabet: Nova Poshta
--  reports StatusCode "7", Ukrposhta reports event "41000", and both are text.
--  A single column holding either cannot be read without first consulting
--  shipping_carrier — including by a human at 2am wondering why an order says
--  delivered — and a query that filters on a status code would quietly match
--  across carriers. Two columns cost two nullable fields and make every read
--  unambiguous.
--
--  0028 made the same call for the identifiers themselves, and for the same
--  reason: np_ttn and ukrposhta_barcode are separate columns because a waybill
--  number and a postal barcode are different things from different companies.
-- =============================================================================

alter table public.orders
  add column if not exists ukrposhta_status_code        text,
  add column if not exists ukrposhta_status_checked_at  timestamptz;

-- ---------------------------------------------------------------------------
--  The index the tracking pass actually uses.
--
--  Mirrors orders_tracking_idx from 0014 — same shape, other carrier. Partial
--  on the barcode because international is a minority of orders and an index
--  over mostly-nulls is mostly waste.
--
--  IT INCLUDES 'paid', WHICH THE NOVA POSHTA ONE DOES NOT NEED TO. A Nova
--  Poshta waybill is written in the same statement that moves the order to
--  'processing' (lib/order-ttn.ts), so 'paid' with a waybill cannot exist.
--  Ukrposhta bookings predate that rule and some rows carry a barcode while
--  still 'paid'; the pass has to be able to see them or those parcels are
--  never tracked at all.
-- ---------------------------------------------------------------------------
create index if not exists orders_ukrposhta_tracking_idx
  on public.orders (status)
  where ukrposhta_barcode is not null;

comment on column public.orders.ukrposhta_status_code is
  'Last event code Ukrposhta reported (e.g. 41000), kept for diagnosis. NOT interchangeable with np_status_code — different carrier, different code table. Ambiguous on its own for one case: 41000 means delivered to the RECIPIENT or returned to the SENDER depending on eventReason_id, which lib/ukrposhta-tracking.ts reads and this column does not store.';

comment on column public.orders.ukrposhta_status_checked_at is
  'When the tracking pass last asked about this parcel. Stamped even when Ukrposhta answers "not found" — a parcel booked but not yet lodged over a counter is invisible to tracking, and that is an answer, so this column moving while the code stays null is the normal early state rather than a stalled cron.';

-- =============================================================================
--  VERIFY — read-only. Nothing below writes a row.
--
--    select column_name, data_type, is_nullable
--      from information_schema.columns
--     where table_schema = 'public'
--       and table_name = 'orders'
--       and column_name like 'ukrposhta%'
--     order by column_name;
--
--  Expected four rows: ukrposhta_barcode, ukrposhta_status_checked_at,
--  ukrposhta_status_code, ukrposhta_uuid. The two new ones text + timestamptz,
--  all nullable.
--
--    select indexname from pg_indexes
--     where tablename = 'orders' and indexname like '%tracking%';
--
--  Expected both: orders_tracking_idx (0014, Nova Poshta) and
--  orders_ukrposhta_tracking_idx (this one).
--
--  And that nothing was touched — the new columns start empty on every row:
--
--    select count(*) filter (where ukrposhta_barcode is not null)      as booked,
--           count(*) filter (where ukrposhta_status_code is not null)  as tracked
--      from public.orders;
--
--  Expected: `tracked` = 0 immediately after this runs, whatever `booked` is.
-- =============================================================================
