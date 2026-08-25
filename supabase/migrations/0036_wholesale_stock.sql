-- =============================================================================
--  A paid wholesale request comes off the shelf.
--
--  Run this in the Supabase SQL editor. Expected: "Success. No rows returned."
--  Safe to re-run. Requires 0030, 0031 and 0033.
--
--  Retail has done this since 0015: a paid order calls apply_order_stock(),
--  which turns its lines into negative movements and decrements on_hand. A
--  wholesale request that has been paid for is the same event — twenty-five
--  wind covers leave the building either way — and until now it was the only
--  way stock could leave without the ledger noticing.
--
--  SAME SHAPE AS RETAIL, on purpose: the same stock_movements table, the same
--  part__lid / part__rubber / part__timer keys, the same refusal to invent a
--  stock_items row for an sku nobody has set up. Unmatched skus are REPORTED,
--  never created — a product that reaches the price list before it reaches the
--  shelf should surface as a gap, not as a silent negative balance.
--
--  ---- Why this one can be undone, and the retail one cannot ---------------
--
--  Retail's trigger is a payment webhook: it fires once, from Monobank, and
--  there is no "unpay". Wholesale's trigger is a human choosing "Paid" from a
--  dropdown next to four other options. A mis-click there would take
--  twenty-five units off the shelf with no way back except hand-written
--  corrections, so moving a request OFF paid puts them back.
--
--  That is why the guard is a flag on the request rather than retail's unique
--  index on (order_id, sku): an index that makes the second consume impossible
--  also makes consume → restore → consume impossible, and the whole point is
--  that a person can change their mind. The flag is read and written under a
--  row lock, so two clicks racing cannot both win.
--
--  Both directions leave a row in the ledger. Nothing is deleted — a restore
--  is a positive movement sitting next to the negative one, which is what an
--  audited ledger is for.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. The ledger learns where a wholesale movement came from
-- ---------------------------------------------------------------------------
alter table public.stock_movements
  add column if not exists wholesale_request_id uuid
    references public.wholesale_requests(id) on delete set null;

create index if not exists stock_movements_wholesale_idx
  on public.stock_movements (wholesale_request_id)
  where wholesale_request_id is not null;

-- 'wholesale' joins the existing reasons. Kept distinct from 'order' so the
-- finance views can tell trade movement from retail without a join.
alter table public.stock_movements
  drop constraint if exists stock_movements_reason_check;
alter table public.stock_movements
  add constraint stock_movements_reason_check
  check (reason in ('order', 'wholesale', 'batch', 'correction', 'write_off', 'return'));

comment on column public.stock_movements.wholesale_request_id is
  'Set on movements from a paid wholesale request. Null on retail and manual movements.';

-- ---------------------------------------------------------------------------
-- 2. The flag that makes it idempotent and reversible
-- ---------------------------------------------------------------------------
alter table public.wholesale_requests
  add column if not exists stock_applied_at timestamptz;

comment on column public.wholesale_requests.stock_applied_at is
  'When this request was taken off stock. Null = still on the shelf. The guard for both directions — see apply_wholesale_stock.';

-- ---------------------------------------------------------------------------
-- 3. Consume
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
        select i.sku, i.qty from public.wholesale_request_items i
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
  'Decrements stock for a wholesale request marked paid. Idempotent via wholesale_requests.stock_applied_at. Unmatched skus are reported, never created.';

-- ---------------------------------------------------------------------------
-- 4. Put it back
-- ---------------------------------------------------------------------------
create or replace function public.reverse_wholesale_stock(p_request_id uuid)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  rec        record;
  v_restored integer := 0;
  v_already  timestamptz;
begin
  select stock_applied_at into v_already
    from public.wholesale_requests
   where id = p_request_id
     for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if v_already is null then
    -- Never consumed, so there is nothing to give back. Not an error: a
    -- request that goes submitted → cancelled has simply never touched stock.
    return jsonb_build_object('ok', true, 'replayed', true, 'restored', 0);
  end if;

  /* Reversed from the LEDGER, not recomputed from the lines. If a line were
     edited between the two clicks, recomputing would put back a different
     quantity than was taken — the movements are the record of what actually
     left, so they are what comes back. */
  for rec in
    select sku, -sum(delta)::integer as qty
      from public.stock_movements
     where wholesale_request_id = p_request_id
       and reason = 'wholesale'
     group by sku
    having sum(delta) < 0
  loop
    insert into public.stock_movements (sku, delta, reason, wholesale_request_id, created_by, note)
    values (rec.sku, rec.qty, 'wholesale', p_request_id, 'system', 'reversed: request moved off paid');

    update public.stock_items
       set on_hand = on_hand + rec.qty
     where sku = rec.sku;

    v_restored := v_restored + 1;
  end loop;

  update public.wholesale_requests
     set stock_applied_at = null
   where id = p_request_id;

  return jsonb_build_object('ok', true, 'replayed', false, 'restored', v_restored);
end;
$$;

comment on function public.reverse_wholesale_stock(uuid) is
  'Puts a wholesale request back on the shelf when it moves off paid. Reverses the recorded movements rather than recomputing from the lines.';

-- Same posture as apply_order_stock: reachable by the service role only.
revoke all on function public.apply_wholesale_stock(uuid) from public, anon, authenticated;
revoke all on function public.reverse_wholesale_stock(uuid) from public, anon, authenticated;
grant execute on function public.apply_wholesale_stock(uuid) to service_role;
grant execute on function public.reverse_wholesale_stock(uuid) to service_role;

-- =============================================================================
--  VERIFY — read-only, safe to run:
--
--    select column_name from information_schema.columns
--     where table_name = 'stock_movements' and column_name = 'wholesale_request_id';
--
--    select reference, status, stock_applied_at
--      from public.wholesale_requests order by created_at desc;
--
--    -- after marking one paid: the movements it made
--    select m.sku, m.delta, m.reason, m.note, m.created_at
--      from public.stock_movements m
--      join public.wholesale_requests r on r.id = m.wholesale_request_id
--     order by m.created_at desc limit 20;
-- =============================================================================
