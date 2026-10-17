-- =============================================================================
--  Tactical Mouthpiece gets a stock row
--
--  Run this in the Supabase SQL editor. Expected: "Success. No rows returned."
--  Safe to re-run.
--
--  The mouthpiece went on sale on 17 Oct 2026 as its own catalogue product
--  (slug tactical-mouthpiece, no colours). Without a row here an order for it
--  is still taken — apply_order_stock reports the sku as unmatched and moves
--  nothing — but the shelf cannot be counted, alerted on or seen in
--  /admin/stock. Same shape as the wind covers in 0025.
--
--  Starts at on_hand = 0, as every row does: set the real count in
--  /admin/stock after running this.
-- =============================================================================

insert into public.stock_items (sku, kind, product_slug, variant, name_en, name_uk) values
  ('tactical-mouthpiece', 'product', 'tactical-mouthpiece', null, 'Tactical Mouthpiece', 'Tactical Mouthpiece')
on conflict (sku) do nothing;

-- =============================================================================
--  VERIFY — should return one row, on_hand = 0:
--
--    select sku, kind, product_slug, on_hand
--      from public.stock_items where sku = 'tactical-mouthpiece';
-- =============================================================================
