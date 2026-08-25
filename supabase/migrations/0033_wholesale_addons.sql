-- =============================================================================
--  Wholesale request lines learn about add-ons.
--
--  Run this in the Supabase SQL editor. Expected: "Success. No rows returned."
--  Safe to re-run. Requires 0030 and 0031.
--
--  THE SHAPE IS COPIED FROM order_items ON PURPOSE
--
--  Retail has modelled these three the same way since 0015: the line keeps the
--  PRODUCT sku and carries boolean flags, and the parts are counted separately
--  as `part__lid`, `part__rubber` and `part__timer` in stock_items. A wholesale
--  line that invented its own shape — a compound sku, say, or a JSON blob —
--  would be a second answer to a question retail already answered, and the
--  stock ledger only understands the first one.
--
--  So: same column names as order_items, same meaning, and a wholesale line is
--  countable against stock by the same rule as a retail one.
--
--  WHICH PRODUCTS MAY CARRY WHICH is not a constraint here. Retail decides it
--  by category — HMDs take a lid and a FEAR 9E418, wind covers take a timer —
--  and the catalogue that defines those categories is a TypeScript file, not a
--  table. Encoding it in SQL would put half the rule somewhere the other half
--  cannot see it. The application refuses invalid combinations before they
--  reach here (lib/wholesale-portal), which is where the catalogue actually
--  lives.
-- =============================================================================

alter table public.wholesale_request_items
  add column if not exists addon_lid boolean not null default false,
  add column if not exists addon_rubber boolean not null default false,
  add column if not exists addon_timer boolean not null default false,
  -- The options as they READ at submit time — "With Lid + With FEAR 9E418".
  -- The booleans are the machine copy; this is the one a human checks a
  -- packing list against, and it survives the catalogue being reworded or a
  -- product being renamed the way the three flags on their own would not.
  add column if not exists options_label text;

comment on column public.wholesale_request_items.addon_rubber is
  'The FEAR 9E418 ring. Column named addon_rubber to match order_items and the part__rubber sku — the product was renamed in 0029, the key was deliberately not.';
comment on column public.wholesale_request_items.options_label is
  'Human-readable snapshot of the chosen add-ons at submit time. Null when the line has none.';

-- =============================================================================
--  VERIFY — read-only, safe to run:
--
--    select column_name, data_type, column_default
--      from information_schema.columns
--     where table_name = 'wholesale_request_items'
--       and column_name like 'addon_%' or column_name = 'options_label'
--     order by column_name;
--
--    -- after a test request: flags and label must agree
--    select name, variant, addon_lid, addon_rubber, addon_timer, options_label, qty
--      from public.wholesale_request_items
--     order by created_at desc limit 10;
-- =============================================================================
