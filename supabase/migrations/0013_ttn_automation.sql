-- =============================================================================
--  Automatic Nova Poshta waybill (ТТН) creation — stage 2.
--
--  Run this in the Supabase SQL editor. Expected: "Success. No rows returned."
--
--  1. STRUCTURED COURIER ADDRESS
--     np_address holds the courier address as one readable line, which is right
--     for a packing slip but unusable as an API input: Nova Poshta needs a
--     resolved street reference plus the building and flat as separate fields.
--     Splitting that line back apart is guesswork — Ukrainian street names carry
--     prefixes and commas of their own — so the parts are stored as they were
--     entered. np_address stays exactly as it is; nothing reads it differently.
--
--     Warehouse orders leave these null (the branch ref is the address).
--     Orders placed before this migration also leave them null, so a courier
--     order from before today falls back to manual TTN creation rather than
--     guessing an address and shipping a parcel to the wrong door.
--
--  2. np_ttn_ref — the InternetDocument reference Nova Poshta returns alongside
--     the printable number. The number is what a human quotes; the ref is what
--     the API needs to print, track or cancel the waybill later, and it cannot
--     be derived from the number.
--
--  3. 'processing' status — set once a waybill exists but the parcel has not
--     yet been handed over. A failed TTN creation deliberately leaves the order
--     'paid', which is the queue of things needing a waybill made by hand.
-- =============================================================================

alter table public.payments
  add column if not exists np_street   text,
  add column if not exists np_building text,
  add column if not exists np_flat     text;

alter table public.orders
  add column if not exists np_street   text,
  add column if not exists np_building text,
  add column if not exists np_flat     text,
  add column if not exists np_ttn_ref  text;

-- Widen the status check to admit 'processing'. Dropping and recreating rather
-- than adding a second constraint, so the allowed set stays described in one
-- place instead of being the intersection of two rules.
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders
  add constraint orders_status_check
  check (status in ('paid', 'processing', 'shipped', 'delivered', 'cancelled'));

comment on column public.orders.np_street is
  'Courier street name as entered, kept apart from np_address so it can be resolved against Nova Poshta''s street directory.';
comment on column public.orders.np_ttn_ref is
  'Nova Poshta InternetDocument Ref. Needed to print/track/cancel; not derivable from the printed number.';
comment on column public.orders.status is
  'Fulfilment state: paid (webhook-confirmed, no waybill yet) | processing (waybill created) | shipped | delivered | cancelled.';
