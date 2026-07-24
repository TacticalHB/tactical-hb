-- =============================================================================
--  Order status + Nova Poshta tracking number (admin orders, stage 1).
--
--  Run this in the Supabase SQL editor. Expected: "Success. No rows returned."
--
--  status — where the order is in fulfilment.
--    Orders are only ever inserted AFTER the Monobank webhook has confirmed the
--    payment (see lib/fulfilment.ts), so 'paid' is the correct state for every
--    row that exists — including the ones already in the table. That's why the
--    default backfills rather than a NULL "unknown" state: there is no such
--    thing here as an order we hold that wasn't paid for.
--
--    'shipped' is set by hand once a parcel goes out; Stage 2 will drive it
--    from Nova Poshta instead.
--
--  np_ttn — the Nova Poshta consignment number (ТТН), pasted by the admin.
--    Deliberately free text: it is typed/copied from Nova Poshta's own UI, and
--    refusing a slightly odd value would block a real dispatch. Stage 2 adds
--    automatic creation and status polling.
-- =============================================================================

alter table public.orders
  add column if not exists status text not null default 'paid',
  add column if not exists np_ttn text;

-- Constrain separately so re-running the file can't fail on an existing check.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'orders_status_check'
  ) then
    alter table public.orders
      add constraint orders_status_check
      check (status in ('paid', 'shipped', 'delivered', 'cancelled'));
  end if;
end $$;

-- The admin list is ordered newest-first, so give it an index to read.
create index if not exists orders_created_idx on public.orders (created_at desc);

comment on column public.orders.status is
  'Fulfilment state: paid (webhook-confirmed) | shipped | delivered | cancelled. Every order is paid on insert.';
comment on column public.orders.np_ttn is
  'Nova Poshta consignment number (ТТН), entered by an admin. Null until the parcel is booked.';
