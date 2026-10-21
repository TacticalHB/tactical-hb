-- ============================================================================
--  0047 — Order progress line (Mario, 21 Oct 2026)
--
--  Admin › Orders draws every order as Paid → Packed → Shipped → Delivered,
--  each finished step green with the moment it happened under it. Paid already
--  has its moment (an order row is only created once Monobank confirms the
--  payment, so created_at IS the paid time); the other three get one column
--  each here.
--
--    packed_at     a waybill or barcode was first put on the order
--    shipped_at    the carrier scanned it, or Mario pressed "Mark as shipped"
--    delivered_at  the carrier reports it collected, or "Mark as delivered"
--
--  The code works WITHOUT this migration — the line just has no dates — so the
--  deploy and the migration can land in either order.
--
--  Also fixes the one kind of row the old admin could create wrongly: an order
--  that still says Nova Poshta, has no Nova Poshta waybill, but carries an
--  Ukrposhta barcode (TCT-BCWJ4J). It went by Ukrposhta, so its shipping email
--  must name Ukrposhta and its barcode. From now on saving a barcode does this
--  switch itself.
--
--  Run once in the Supabase SQL editor. Safe to re-run.
-- ============================================================================

alter table public.orders
  add column if not exists packed_at    timestamptz,
  add column if not exists shipped_at   timestamptz,
  add column if not exists delivered_at timestamptz;

-- Best-known moments for orders that already moved. The shipping email goes
-- out on the same run that marks an order shipped, so its time is the ship
-- time. Nothing honest exists for packed or delivered on old rows; those stay
-- empty and the line simply shows no date under them.
update public.orders
   set shipped_at = shipped_email_at
 where shipped_at is null
   and shipped_email_at is not null
   and status in ('shipped', 'delivered');

-- The carrier fix described above.
update public.orders
   set shipping_carrier = 'ukrposhta'
 where shipping_carrier = 'nova_poshta'
   and np_ttn is null
   and ukrposhta_barcode is not null;

-- Check: the three columns exist, and no order is left on Nova Poshta with
-- only an Ukrposhta barcode (expect 0).
select count(*) as nova_poshta_rows_with_only_a_barcode
  from public.orders
 where shipping_carrier = 'nova_poshta' and np_ttn is null and ukrposhta_barcode is not null;
