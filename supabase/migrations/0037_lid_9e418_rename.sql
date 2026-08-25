-- =============================================================================
--  The lid is now Lid 9E418 — the shelf label follows the shop.
--
--  Run this in the Supabase SQL editor. Expected: "Success. No rows returned."
--  Safe to re-run.
--
--  The same change 0029 made for the rubber ring, for the same reason. The
--  add-on the shop called "Lid" / «Кришка» is now sold as Lid 9E418. Every
--  customer-facing name lives in code and shipped with this change, but one
--  pair lives in the DATABASE: stock_items.name_en / name_uk, seeded by 0015
--  as 'HMD lid' / «Кришка HMD».
--
--  Those are not decorative. /admin/stock lists parts by name, lib/margin-admin
--  joins on them for the cost table, and lib/stock-alert puts name_en straight
--  into the low-stock email. Left alone, the shelf, the margin report and the
--  alerts would go on calling it a lid after the shop stopped — which is
--  precisely how somebody counts the wrong bin.
--
--  THE SKU DOES NOT CHANGE. `part__lid` is written into stock_movements, is
--  matched by lib/advisor-admin when it expands an order's add-ons into parts,
--  and is selected by name in 0018_finance_views to price the add-on's cost.
--  It is an internal identifier, not a label. Same reasoning as
--  order_items.addon_lid and wholesale_request_items.addon_lid, which also
--  stay — and the same call 0029 made for part__rubber.
-- =============================================================================

-- Matched on the sku rather than the old name, so a re-run after someone has
-- hand-edited the row still lands on the right one. Both languages get the
-- same string: it is a product name, not a word to translate.
update public.stock_items
   set name_en = 'Lid 9E418',
       name_uk = 'Lid 9E418'
 where sku = 'part__lid';

-- =============================================================================
--  VERIFY — read-only, safe to run:
--
--    select sku, name_en, name_uk from public.stock_items
--     where sku in ('part__lid', 'part__rubber', 'part__timer');
--
--    -- expect: Lid 9E418 / FEAR 9E418 / the timer's own name, skus unchanged
-- =============================================================================
