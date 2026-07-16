-- =============================================================================
--  Tactical HB — order line items   (run in the Supabase SQL editor)
--  Safe to re-run.
-- =============================================================================

create table if not exists public.order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders(id) on delete cascade,
  product_id   text not null,
  product_name text,
  quantity     integer not null default 1 check (quantity > 0),
  price_eur    numeric(10,2) not null check (price_eur >= 0),
  created_at   timestamptz not null default now()
);
create index if not exists order_items_order_idx on public.order_items(order_id);

-- Why we snapshot instead of joining live catalogue data:
comment on column public.order_items.product_name is
  'Snapshot of the name AT PURCHASE TIME. Products get renamed, re-branded or '
  'retired — an order history must always show what the customer actually '
  'bought, not what that product happens to be called today.';
comment on column public.order_items.price_eur is
  'Snapshot of the unit price ACTUALLY PAID. Catalogue prices change and go on '
  'sale; without this, past orders and totals would silently rewrite '
  'themselves — breaking receipts, accounting and loyalty spend.';
comment on column public.order_items.product_id is
  'Text on purpose: holds our product slugs today (e.g. hmd-a-craft) and any '
  'external/Shopify id later, without a schema change.';

-- ---------- RLS: items inherit ownership from their parent order -------------
alter table public.order_items enable row level security;

drop policy if exists "order_items self read" on public.order_items;
create policy "order_items self read" on public.order_items for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and o.user_id = auth.uid()
    )
  );

-- Read-only for users; writes come from admin/service role (and Shopify later).
grant select on public.order_items to authenticated;

-- =============================================================================
--  EXAMPLE SEED DATA — put your email on the marked line, then run.
--  Inserting orders also fires the loyalty trigger, so this awards XP and
--  (crossing €100 total) issues a €10 voucher automatically.
mariokiki109@gmail.com 
do $$
declare
  uid uuid;
  o1 uuid; o2 uuid; o3 uuid;
begin
  select id into uid from auth.users
   where email = 'REPLACE-WITH-YOUR-EMAIL@example.com'   -- <<< YOUR EMAIL HERE
   limit 1;

  if uid is null then
    raise exception 'No user with that email — check the email on the line above.';
  end if;

  insert into public.orders (user_id, amount_eur, source, created_at)
  values (uid, 24.40, 'manual', now() - interval '30 days') returning id into o1;
  insert into public.order_items (order_id, product_id, product_name, quantity, price_eur) values
    (o1, 'hmd-a-craft', 'HMD A.Craft',      1, 12.00),
    (o1, 'bowl-killer', 'Tactical Killer',  2,  6.20);

  insert into public.orders (user_id, amount_eur, source, created_at)
  values (uid, 50.30, 'manual', now() - interval '10 days') returning id into o2;
  insert into public.order_items (order_id, product_id, product_name, quantity, price_eur) values
    (o2, 'hmd-tct-op',         'HMD TCT OP',                     1, 21.00),
    (o2, 'bowl-phunnel',       'Tactical 0.66 F.CK THE PHUNNEL', 1,  7.30),
    (o2, 'windcover-bomb-cap', 'TCT Windcover «Bomb Cap»',       1, 22.00);

  insert into public.orders (user_id, amount_eur, source, created_at)
  values (uid, 43.80, 'manual', now() - interval '2 days') returning id into o3;
  insert into public.order_items (order_id, product_id, product_name, quantity, price_eur) values
    (o3, 'hmd-tct-classic',    'HMD TCT Classic',                1, 14.50),
    (o3, 'windcover-bomb-cap', 'TCT Windcover «Bomb Cap»',       1, 22.00),
    (o3, 'bowl-phunnel',       'Tactical 0.66 F.CK THE PHUNNEL', 1,  7.30);
end $$;
