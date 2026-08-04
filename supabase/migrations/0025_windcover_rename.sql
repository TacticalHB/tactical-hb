-- =============================================================================
--  Wind covers — the rename, carried into stock.
--
--  Run this in the Supabase SQL editor. Expected: "Success. No rows returned."
--  Safe to re-run.
--
--  WHY THIS EXISTS
--
--  0015 seeded one wind cover, `windcover-bomb-cap`. The catalogue now carries
--  two — Detonator and KH — and lib/products.ts is the source of truth for the
--  slug. Leaving the seed alone would strand the shelf: the old row would point
--  at a slug the shop no longer serves, and neither new cover would have a row
--  to count against, so /admin/stock would show a product nobody sells and miss
--  two that we do.
--
--  A RENAME, NOT A DELETE AND RE-INSERT. stock_movements.sku carries
--  `on update cascade`, so updating the key takes the movement history with it.
--  Dropping the row and inserting a fresh one would either be refused by the
--  `on delete restrict` or throw away the history it protects. At the time of
--  writing both are moot — the row is at 0 with no movements — but this file
--  may well be run after a first shelf count, and it should still be the right
--  thing to do then.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Bomb Cap becomes Detonator.
--
--    Guarded on the destination being free, so a re-run is a no-op rather than
--    a unique-violation on `sku`.
-- ---------------------------------------------------------------------------
update public.stock_items
   set sku          = 'windcover-detonator',
       product_slug = 'windcover-detonator',
       name_en      = 'Windcover Detonator',
       name_uk      = 'Windcover Detonator'
 where sku = 'windcover-bomb-cap'
   and not exists (
     select 1 from public.stock_items where sku = 'windcover-detonator'
   );

-- ---------------------------------------------------------------------------
-- 2. The second cover, and a safety net for the first.
--
--    Detonator is repeated here for a database that never held the 0015 seed —
--    a fresh environment restored from a later dump, say. Where step 1 already
--    did the work, ON CONFLICT makes this line nothing at all.
--
--    Zero on_hand and the seeded 3 / 10 thresholds, for the reason 0015 gives:
--    the first real number should come from counting the shelf.
-- ---------------------------------------------------------------------------
insert into public.stock_items (sku, kind, product_slug, variant, name_en, name_uk) values
  ('windcover-detonator', 'product', 'windcover-detonator', null, 'Windcover Detonator', 'Windcover Detonator'),
  ('windcover-kh',        'product', 'windcover-kh',        null, 'Windcover KH',        'Windcover KH')
on conflict (sku) do nothing;

-- ---------------------------------------------------------------------------
-- 3. The timer, as a part.
--
--    Lids and rubbers have rows because they are add-ons a customer pays for —
--    running out of them stops dispatch even when every device is in stock. The
--    timer became exactly that kind of thing when the wind covers shipped as
--    "base or with timer", so it belongs on the same shelf. Without this row a
--    timer can be sold and never counted.
--
--    kind = 'part', so product_slug stays null: it is fitted to either cover
--    and belongs to neither.
-- ---------------------------------------------------------------------------
insert into public.stock_items (sku, kind, product_slug, variant, name_en, name_uk) values
  ('part__timer', 'part', null, null, 'Wind cover timer', 'Таймер для вітрозахисту')
on conflict (sku) do nothing;

-- =============================================================================
--  VERIFY — no 'bomb-cap' anywhere, both covers present, timer on the shelf:
--
--    select sku, kind, product_slug, on_hand from public.stock_items
--     where sku like '%windcover%' or sku = 'part__timer'
--     order by kind, sku;
--
--  Expected: part__timer, windcover-detonator, windcover-kh — all on_hand 0.
-- =============================================================================
