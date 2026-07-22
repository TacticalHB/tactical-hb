-- =============================================================================
--  Nova Poshta shipping.
--
--  Run this in the Supabase SQL editor. Expected: "Success. No rows returned."
--
--  SHIPPING IS STORED SEPARATELY FROM THE GOODS, on purpose:
--
--    amount_eur   — merchandise only, after any discount. Still the loyalty
--                   basis, unchanged. Customers should not earn XP on postage.
--    amount_uah   — the same merchandise value in UAH.
--    shipping_uah — delivery, quoted by Nova Poshta at invoice time.
--
--  What the customer is actually charged = amount_uah + shipping_uah, and that
--  is what amount_kop on the payment reflects. Keeping them apart also makes
--  reconciliation and refunds sane: postage and goods are different money.
-- =============================================================================

alter table public.payments
  add column if not exists shipping_method    text,   -- 'nova_poshta' | 'international'
  add column if not exists shipping_uah       numeric not null default 0 check (shipping_uah >= 0),
  add column if not exists np_city_ref        text,
  add column if not exists np_city_name       text,
  add column if not exists np_warehouse_ref   text,
  add column if not exists np_warehouse_name  text;

alter table public.orders
  add column if not exists shipping_method    text,
  add column if not exists shipping_uah       numeric not null default 0 check (shipping_uah >= 0),
  add column if not exists np_city_ref        text,
  add column if not exists np_city_name       text,
  add column if not exists np_warehouse_ref   text,
  add column if not exists np_warehouse_name  text;

comment on column public.orders.shipping_uah is
  'Delivery cost in UAH, quoted by Nova Poshta. Separate from amount_eur/amount_uah so postage never earns loyalty XP.';
comment on column public.orders.np_warehouse_name is
  'Full Nova Poshta branch description, stored so the order can be fulfilled without another API call.';
comment on column public.orders.shipping_method is
  'nova_poshta = branch delivery within Ukraine. international = address delivery, shipping invoiced separately after the order.';
