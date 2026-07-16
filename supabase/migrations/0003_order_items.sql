-- =============================================================================
--  STEP 1 of 2 — order line items (SCHEMA ONLY — no seed data in this file).
--  Paste this whole file into the Supabase SQL editor and Run. Safe to re-run.
--  Expected result: "Success. No rows returned."
-- =============================================================================

create table if not exists public.order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders(id) on delete cascade,
  product_id   text not null,
  product_name text,
  quantity     integer not null default 1,
  price_eur    numeric(10,2) not null,
  created_at   timestamptz not null default now()
);

create index if not exists order_items_order_idx on public.order_items(order_id);

-- Why snapshots (product_name + price_eur) instead of joining live catalogue
-- data: products get renamed and prices change, so without a snapshot every
-- past receipt and total would silently rewrite itself. product_id is text so
-- it holds our slugs today and any Shopify id later.
comment on column public.order_items.product_name is 'Snapshot of the product name at purchase time.';
comment on column public.order_items.price_eur is 'Snapshot of the unit price actually paid.';
comment on column public.order_items.product_id is 'Text: our slug today, any external id later.';

-- ---------- RLS: an item is yours if its parent order is yours ---------------
alter table public.order_items enable row level security;

drop policy if exists "order_items self read" on public.order_items;

create policy "order_items self read"
  on public.order_items
  for select
  using (
    exists (
      select 1
      from public.orders o
      where o.id = order_items.order_id
        and o.user_id = auth.uid()
    )
  );

-- Read-only for users. Writes come from admin / service role (Shopify later).
grant select on public.order_items to authenticated;
