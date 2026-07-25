-- =============================================================================
--  Automatic Nova Poshta status tracking + the shipping email — stage 3.
--
--  Run this in the Supabase SQL editor. Expected: "Success. No rows returned."
--
--  1. locale — which language the customer bought in.
--     Until now only `payments` carried it, because only the confirmation email
--     (sent from the webhook, which holds the payment row) needed it. The
--     shipping email is sent later by a cron job that has the ORDER and nothing
--     else, so the order has to carry its own language. Backfilled from
--     payments below; anything unmatched falls back to 'uk', the site default.
--
--  2. shipped_email_at — when the "your order has shipped" email went out.
--     THIS IS THE IDEMPOTENCY GUARD, not a log. The tracking job claims it with
--     a conditional update, so two overlapping runs (or a retry) cannot email
--     the same customer twice.
--
--  3. np_status_code / np_status_checked_at — what Nova Poshta last reported and
--     when. Bookkeeping: it makes a wrong status diagnosable after the fact,
--     and shows at a glance whether tracking is actually running.
-- =============================================================================

alter table public.orders
  add column if not exists locale                text,
  add column if not exists shipped_email_at      timestamptz,
  add column if not exists np_status_code        text,
  add column if not exists np_status_checked_at  timestamptz;

-- Backfill the language from the payment that created each order.
update public.orders o
   set locale = p.locale
  from public.payments p
 where p.order_id = o.id
   and o.locale is null
   and p.locale is not null;

-- Anything still unset (legacy rows with no payment) gets the site default.
update public.orders set locale = 'uk' where locale is null;

-- The tracking job selects on exactly this: has a waybill, still in flight.
create index if not exists orders_tracking_idx
  on public.orders (status)
  where np_ttn is not null;

comment on column public.orders.locale is
  'Language the customer checked out in (uk|en). Drives the shipping email, which is sent long after the request that created the order.';
comment on column public.orders.shipped_email_at is
  'Set when the shipping notification is sent. Claimed conditionally, so the customer cannot be emailed twice.';
comment on column public.orders.np_status_code is
  'Last StatusCode reported by Nova Poshta tracking, kept for diagnosis.';
