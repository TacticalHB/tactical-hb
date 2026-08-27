-- =============================================================================
--  FEAR 9E418 and LID 9E418 sold alone come off the SAME shelf as fitted ones
--
--  Run this in the Supabase SQL editor. Expected: "Success. No rows returned."
--  Safe to re-run.
--
--  WHAT CHANGED ABOVE THIS. The lid and the ring used to be options only: the
--  sole way to buy one was to tick it while configuring a heat device, and 0015
--  handled that by adding a `part__lid` / `part__rubber` line for every
--  order_item carrying the flag. They are catalogue products now, with their own
--  routes, because they ship as packaged goods with a QR code on the pouch.
--
--  SO THERE ARE TWO WAYS TO SELL ONE PART, AND ONE BIN IT COMES OUT OF. A
--  standalone line arrives as product_id 'lid-9e418', which is not a stock sku
--  and never should be — the shelf holds lids, not two kinds of lid told apart
--  by how they were ordered. Left alone, apply_order_stock would report it as
--  unmatched and the bin would quietly over-count: safe, because 0015 refuses to
--  invent a row, but wrong.
--
--  DELIBERATELY NOT NEW STOCK ROWS. Adding 'lid-9e418' to stock_items would
--  split one physical bin across two counts, and every number downstream — the
--  advisor's velocity, the low-stock alert, the margin view — would then read
--  half the truth. One part, one sku, two ways in.
--
--  A CASE ON THE WAY IN, NOT A UNION BESIDE IT. The translation replaces the sku
--  the line resolves to, so the outer aggregation is untouched and a sku that
--  arrives twice still sums. An order for a Classic with a lid PLUS a loose lid
--  decrements part__lid by two, which is what left the building.
--
--  THE ADD-ON PATH IS UNTOUCHED, and so is everything else in both functions:
--  the bodies below are 0015's and 0036's, with only the item select changed.
-- =============================================================================

-- ---------------------------------------------------------------------------
--  Retail (0015)
-- ---------------------------------------------------------------------------
create or replace function public.apply_order_stock(p_order_id uuid)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  rec         record;
  v_rows      integer;
  v_applied   integer := 0;
  v_replayed  integer := 0;
  v_unmatched text[]  := '{}';
begin
  -- Everything this order consumes, aggregated by sku. Aggregating matters:
  -- the same product can appear on two lines, and the unique index allows only
  -- one movement per (order, sku) — so they must be summed, not raced.
  for rec in
    select sku, sum(qty)::integer as qty
      from (
        -- the item itself. The two accessories that are really parts resolve to
        -- the part's own sku; everything else keeps slug[__variant].
        select case product_id
                 when 'lid-9e418'  then 'part__lid'
                 when 'fear-9e418' then 'part__rubber'
                 else product_id || coalesce('__' || lower(variant), '')
               end      as sku,
               quantity as qty
          from public.order_items
         where order_id = p_order_id
        union all
        -- a lid fitted to it
        select 'part__lid'::text, quantity
          from public.order_items
         where order_id = p_order_id and addon_lid
        union all
        -- a rubber ring fitted to it
        select 'part__rubber'::text, quantity
          from public.order_items
         where order_id = p_order_id and addon_rubber
      ) t
     group by sku
  loop
    -- An unknown sku is reported, never invented. A new product that nobody
    -- has added to stock yet must not quietly create a row with a made-up
    -- name and a negative balance.
    if not exists (select 1 from public.stock_items s where s.sku = rec.sku) then
      v_unmatched := v_unmatched || rec.sku;
      continue;
    end if;

    insert into public.stock_movements (sku, delta, reason, order_id, created_by)
    values (rec.sku, -rec.qty, 'order', p_order_id, 'system')
    on conflict do nothing;

    get diagnostics v_rows = row_count;

    if v_rows > 0 then
      update public.stock_items
         set on_hand = on_hand - rec.qty
       where sku = rec.sku;
      v_applied := v_applied + 1;
    else
      -- Already counted on an earlier delivery of the same webhook.
      v_replayed := v_replayed + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'applied',   v_applied,
    'replayed',  v_replayed,
    'unmatched', to_jsonb(v_unmatched)
  );
end;
$$;

comment on function public.apply_order_stock(uuid) is
  'Decrements stock for a paid order. Idempotent — a replayed webhook reports replayed>0 and changes nothing. Standalone lid-9e418 / fear-9e418 lines resolve to part__lid / part__rubber (0038).';

-- ---------------------------------------------------------------------------
--  Wholesale (0036)
--
--  A partner can put FEAR 9E418 or LID 9E418 on a request as its own row, the
--  same as a retail customer can buy one loose, so marking that request paid has
--  to reach the same bin. The return shape is 0036's exactly — the caller reads
--  ok / replayed / applied / unmatched and must keep finding all four.
-- ---------------------------------------------------------------------------
create or replace function public.apply_wholesale_stock(p_request_id uuid)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  rec         record;
  v_applied   integer := 0;
  v_unmatched text[]  := '{}';
  v_already   timestamptz;
begin
  -- Lock the request for the duration: two admins pressing Paid at the same
  -- moment must not both pass the flag check.
  select stock_applied_at into v_already
    from public.wholesale_requests
   where id = p_request_id
     for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if v_already is not null then
    return jsonb_build_object('ok', true, 'replayed', true, 'applied', 0);
  end if;

  -- Aggregated by sku: the same product can appear twice in one request (two
  -- configurations of the same HMD), and those must sum rather than collide.
  for rec in
    select sku, sum(qty)::integer as qty
      from (
        select case i.sku
                 when 'lid-9e418'  then 'part__lid'
                 when 'fear-9e418' then 'part__rubber'
                 else i.sku
               end   as sku,
               i.qty as qty
          from public.wholesale_request_items i
         where i.request_id = p_request_id and i.sku is not null
        union all
        select 'part__lid'::text, i.qty from public.wholesale_request_items i
         where i.request_id = p_request_id and i.addon_lid
        union all
        select 'part__rubber'::text, i.qty from public.wholesale_request_items i
         where i.request_id = p_request_id and i.addon_rubber
        union all
        select 'part__timer'::text, i.qty from public.wholesale_request_items i
         where i.request_id = p_request_id and i.addon_timer
      ) t
     group by sku
  loop
    if not exists (select 1 from public.stock_items s where s.sku = rec.sku) then
      v_unmatched := v_unmatched || rec.sku;
      continue;
    end if;

    insert into public.stock_movements (sku, delta, reason, wholesale_request_id, created_by)
    values (rec.sku, -rec.qty, 'wholesale', p_request_id, 'system');

    update public.stock_items
       set on_hand = on_hand - rec.qty
     where sku = rec.sku;

    v_applied := v_applied + 1;
  end loop;

  update public.wholesale_requests
     set stock_applied_at = now()
   where id = p_request_id;

  return jsonb_build_object(
    'ok', true, 'replayed', false,
    'applied', v_applied, 'unmatched', to_jsonb(v_unmatched)
  );
end;
$$;

comment on function public.apply_wholesale_stock(uuid) is
  'Decrements stock for a paid wholesale request, once, under a row lock. Standalone lid-9e418 / fear-9e418 rows resolve to part__lid / part__rubber (0038).';

-- =============================================================================
--  reverse_wholesale_stock is NOT redefined here. It reads stock_movements back
--  by request id and negates what is recorded, so it reverses whatever sku was
--  actually written — including a translated one — with no knowledge of slugs.
-- =============================================================================

-- =============================================================================
--  VERIFY — read-only, safe to run:
--
--    -- 1. Two part rows, and no accessory rows invented beside them:
--    select sku, name_en, on_hand from public.stock_items
--     where sku in ('part__lid','part__rubber','lid-9e418','fear-9e418');
--    -- expect: exactly two rows — part__lid (Lid 9E418), part__rubber (FEAR 9E418)
--
--    -- 2. Both functions carry the translation:
--    select proname, prosrc like '%lid-9e418%' as maps_accessories
--      from pg_proc
--     where proname in ('apply_order_stock','apply_wholesale_stock');
--    -- expect: true for both
-- =============================================================================
