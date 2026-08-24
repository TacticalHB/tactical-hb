-- =============================================================================
--  Wholesale request lines learn about colour.
--
--  Run this in the Supabase SQL editor. Expected: "Success. No rows returned."
--  Safe to re-run. Requires 0030.
--
--  WHY THIS IS A SECOND MIGRATION and not an edit to 0030: 0030 has been
--  applied. An applied migration is a record of what the database was asked to
--  do, and rewriting one makes that record a lie for anybody who ran the
--  earlier version.
--
--  THE PROBLEM
--
--  0030 stored a request line as (product_slug, qty). That is one row per
--  PRODUCT, and HMD TCT OP is sold in Black and Purple at different prices. A
--  partner ordering fifty of them had nowhere to say the split except the free
--  text note — so the one number staff needed to pick and pack was the one
--  number the form would not take.
--
--  Stock has always keyed colour separately: `<slug>__<variant>` (0015), e.g.
--  hmd-tct-op__black. This column lets a request line resolve to that same key
--  instead of to the bare product, which is what makes a wholesale line
--  countable against stock at all.
--
--  NULL IS THE ORDINARY CASE. Most products have no colours, and their lines
--  keep a null variant and a bare-slug sku exactly as before. Null means "this
--  product has no colours", never "colour not chosen" — the portal will not
--  submit a variant product without one.
-- =============================================================================

alter table public.wholesale_request_items
  -- The variant's DISPLAY name as the catalogue spells it ("Black"), not the
  -- lowercased sku fragment. The sku column already carries the machine form;
  -- this is the one a human reads on the packing list, and the two are derived
  -- from the same source at submit time.
  add column if not exists variant text;

comment on column public.wholesale_request_items.variant is
  'Colour as named in the catalogue, e.g. "Black". Null = the product has no colours. The sku column carries the matching <slug>__<variant> key.';

-- =============================================================================
--  VERIFY — read-only, safe to run:
--
--    select column_name, data_type, is_nullable
--      from information_schema.columns
--     where table_name = 'wholesale_request_items' and column_name = 'variant';
--
--    -- after a test request: sku and variant must agree
--    select name, variant, sku, qty
--      from public.wholesale_request_items
--     order by created_at desc limit 10;
-- =============================================================================
