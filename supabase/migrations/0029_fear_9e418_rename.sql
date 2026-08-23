-- =============================================================================
--  The rubber ring is now FEAR 9E418 — the shelf label follows the shop.
--
--  Run this in the Supabase SQL editor. Expected: "Success. No rows returned."
--  Safe to re-run.
--
--  WHY THIS EXISTS
--
--  The add-on the shop used to call "Rubber" / «Гумка» is now sold as
--  FEAR 9E418. The customer-facing names all live in code and shipped with the
--  same change, but one pair of names lives in the DATABASE: stock_items has
--  name_en / name_uk, seeded by 0015 as 'HMD rubber ring' / «Гумове кільце HMD».
--
--  Those are not decorative. /admin/stock lists parts by name, lib/margin-admin
--  joins on them for the cost table, and lib/stock-alert puts name_en straight
--  into the low-stock email. Left alone, the shelf, the margin report and the
--  alerts would go on calling it a rubber ring after the shop stopped, which is
--  precisely how someone counts the wrong bin.
--
--  THE SKU DOES NOT CHANGE, and that is deliberate. `part__rubber` is written
--  into stock_movements (on update cascade would carry it, but nothing else
--  would), it is matched by lib/advisor-admin when it expands an order's
--  add-ons into parts, and 0018_finance_views selects it by name to price the
--  add-on's cost. It is an internal identifier, not a label — renaming it would
--  buy nothing and would have to be chased through three more places. Same
--  reasoning as order_items.addon_rubber, which also stays.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. The part's display names.
--
--    Matched on the sku rather than on the old name, so a re-run after someone
--    has hand-edited the row still lands on the right one. Both languages get
--    the same string: it is a product name, not a word to translate.
-- ---------------------------------------------------------------------------
update public.stock_items
   set name_en = 'FEAR 9E418',
       name_uk = 'FEAR 9E418'
 where sku = 'part__rubber';

-- =============================================================================
--  VERIFY — should return exactly one row, both names reading FEAR 9E418:
--
--    select sku, kind, name_en, name_uk
--      from public.stock_items
--     where sku = 'part__rubber';
--
--  And this should return NOTHING, i.e. no shelf label still says rubber:
--
--    select sku, name_en, name_uk
--      from public.stock_items
--     where name_en ilike '%rubber%' or name_uk ilike '%гумов%';
-- =============================================================================
