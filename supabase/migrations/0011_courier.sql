-- =============================================================================
--  Nova Poshta courier (address) delivery, alongside the existing warehouse
--  option.
--
--  Run this in the Supabase SQL editor. Expected: "Success. No rows returned."
--
--  Both options remain shipping_method = 'nova_poshta'. np_delivery_type tells
--  them apart, and defaults to NULL — which the code reads as 'warehouse', so
--  every existing order keeps its meaning without a backfill.
--
--    np_delivery_type — 'warehouse' | 'courier'
--    np_address       — courier street + building + apartment, one line
--    np_notes         — optional courier delivery notes
--
--  Warehouse orders leave np_address / np_notes null; courier orders leave
--  np_warehouse_ref / np_warehouse_name null. np_city_ref / np_city_name are
--  set for both (the city drives the Nova Poshta price either way).
-- =============================================================================

alter table public.payments
  add column if not exists np_delivery_type text,
  add column if not exists np_address       text,
  add column if not exists np_notes         text;

alter table public.orders
  add column if not exists np_delivery_type text,
  add column if not exists np_address       text,
  add column if not exists np_notes         text;

comment on column public.orders.np_delivery_type is
  'nova_poshta sub-type: warehouse = branch pickup, courier = address delivery. Null legacy rows are warehouse.';
comment on column public.orders.np_address is
  'Courier delivery address (street, building, apartment) as one line. Null for warehouse orders.';
