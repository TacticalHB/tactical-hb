-- =============================================================================
--  THB-OS Phase A, part 1 — stock.
--
--  Run this in the Supabase SQL editor. Expected: "Success. No rows returned."
--  Safe to re-run.
--
--  THE SHAPE OF THE PROBLEM
--
--  A stock number that anyone can type over is a number nobody trusts. So the
--  levels here are never edited directly by a human: every change is a row in
--  stock_movements with a reason attached, and stock_items.on_hand is the
--  running total those movements maintain. "Why is this 4?" always has an
--  answer, which is the whole point of the shared-memory layer.
--
--  There are exactly two writers. The paid-order decrement below (automatic,
--  triggered from lib/fulfilment.ts once Monobank has confirmed the money) and
--  an admin logging a batch or a correction in /admin/stock. Nothing infers a
--  level, and no agent touches this table — agents recommend, humans move
--  stock.
--
--  WHAT COUNTS AS ONE THING (the sku)
--
--    <slug>                  a product with no variants   e.g. bowl-killer
--    <slug>__<variant>       one finish of a product      e.g. hmd-tct-op__black
--    part__<name>            a component, sold as an add-on or fitted
--
--  Black and Purple OPs are different objects on a shelf, so they are different
--  rows. Lids are stocked in their own right because they are both an add-on
--  the customer pays for and a part fitted to other devices — running out of
--  lids stops HMD dispatch even when every HMD is in stock.
--
--  product_slug is deliberately NOT a foreign key. The catalogue lives in
--  lib/products.ts, not in the database, and a constraint pointing at a table
--  that doesn't exist is a lie the schema would have to keep telling.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. What we hold
-- ---------------------------------------------------------------------------
create table if not exists public.stock_items (
  id             uuid primary key default gen_random_uuid(),
  sku            text not null unique,
  kind           text not null default 'product' check (kind in ('product', 'part')),

  -- Resolution back to the catalogue. Null on parts, which have no slug.
  product_slug   text,
  -- The variant name EXACTLY as it appears in lib/products.ts (English, e.g.
  -- 'Black'). Never the translated label — 'Чорний' would stop matching the
  -- moment the shop is read in the other language.
  variant        text,

  name_en        text not null,
  name_uk        text not null,

  -- May go negative, on purpose. Refusing to decrement below zero would throw
  -- away the record of a sale that really happened; a negative number is a
  -- visible, honest "the count was wrong" rather than a silent floor at 0.
  on_hand        integer not null default 0,

  -- Below reorder_level → Low. Below critical_level → Critical.
  reorder_level  integer not null default 10 check (reorder_level  >= 0),
  critical_level integer not null default 3  check (critical_level >= 0),

  -- Days from ordering a batch to having it on the shelf. Unused in Phase A;
  -- the Stock Advisor (Phase C) needs it to turn "weeks of cover" into a date.
  lead_time_days integer check (lead_time_days is null or lead_time_days >= 0),

  active         boolean not null default true,

  -- Alert bookkeeping, so the daily job can email on a change of state rather
  -- than repeating itself every morning until the shelf is refilled.
  alert_level    text check (alert_level is null or alert_level in ('low', 'critical')),
  alerted_at     timestamptz,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists stock_items_slug_idx on public.stock_items (product_slug);

comment on table public.stock_items is
  'One row per physically distinct thing held. Levels are maintained by stock_movements — never typed over by hand.';
comment on column public.stock_items.variant is
  'Variant name as written in lib/products.ts (English). Translated labels must never be stored here.';
comment on column public.stock_items.on_hand is
  'Running total of stock_movements. Allowed to go negative: a wrong count should be visible, not clamped away.';

drop trigger if exists stock_items_touch on public.stock_items;
create trigger stock_items_touch before update on public.stock_items
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Every change, with a reason
-- ---------------------------------------------------------------------------
create table if not exists public.stock_movements (
  id          uuid primary key default gen_random_uuid(),
  sku         text not null references public.stock_items(sku) on update cascade on delete restrict,

  -- Signed: negative takes stock away, positive puts it back. Zero is not a
  -- movement, it's a typo.
  delta       integer not null check (delta <> 0),

  reason      text not null check (reason in ('order', 'batch', 'correction', 'write_off', 'return')),
  order_id    uuid references public.orders(id) on delete set null,
  note        text,

  -- Admin email, or 'system' for the automatic order decrement.
  created_by  text not null default 'system',
  created_at  timestamptz not null default now()
);

create index if not exists stock_movements_sku_idx     on public.stock_movements (sku, created_at desc);
create index if not exists stock_movements_created_idx on public.stock_movements (created_at desc);

-- THE IDEMPOTENCY GUARD. Monobank delivers webhooks at least once, so
-- apply_order_stock() can be called several times for one order. One movement
-- per (order, sku) means a replay collides and does nothing, exactly as the
-- conditional claim in lib/fulfilment.ts protects the order itself.
create unique index if not exists stock_movements_order_sku_idx
  on public.stock_movements (order_id, sku)
  where reason = 'order';

comment on table public.stock_movements is
  'The audit trail behind stock_items.on_hand. Every level change lands here first.';

-- ---------------------------------------------------------------------------
-- 3. What the customer actually chose
--
--    order_items has carried only the slug, so an order for a Purple OP with a
--    lid was indistinguishable from a plain Black one. Nothing could decrement
--    the right shelf, and the packing email never mentioned the lid the
--    customer had paid €4 for. These three columns close that gap; they are
--    written at fulfilment from the priced line (see lib/fulfilment.ts).
--
--    Orders placed before this migration leave them null / false. Those rows
--    resolve to the bare slug, which is the best that can honestly be said
--    about them — guessing a finish after the fact would be worse than not
--    knowing.
-- ---------------------------------------------------------------------------
alter table public.order_items
  add column if not exists variant      text,
  add column if not exists addon_lid    boolean not null default false,
  add column if not exists addon_rubber boolean not null default false;

comment on column public.order_items.variant is
  'Catalogue variant name (English, e.g. Black). Null when the product has no variants, or on orders placed before 0015.';

-- ---------------------------------------------------------------------------
-- 4. Applying an order to stock
--
--    Called from lib/fulfilment.ts with the service-role key, AFTER the money
--    is confirmed. Never throws in a way that could undo a paid order — the
--    worst case is a summary saying nothing matched, which the caller logs.
--
--    SECURITY INVOKER, not DEFINER: the only caller is the service role, which
--    bypasses RLS anyway, so there is nothing to elevate. Execute rights are
--    revoked from anon/authenticated below, so this is unreachable from a
--    browser even though PostgREST exposes public functions by default.
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
        -- the item itself
        select product_id || coalesce('__' || lower(variant), '') as sku,
               quantity                                           as qty
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
  'Decrements stock for a paid order. Idempotent — a replayed webhook reports replayed>0 and changes nothing.';

-- ---------------------------------------------------------------------------
-- 4b. The human writer: log a movement and move the level with it
--
--     One function rather than two statements from the app, because the two
--     must not be able to drift. A movement with no level change is a lie; a
--     level change with no movement is worse — it is the untraceable number
--     this whole design exists to prevent.
--
--     It also settles the concurrency question: `on_hand = on_hand + delta` is
--     computed by the database, so two admins receiving batches in the same
--     second add up instead of overwriting one another. A read-then-write from
--     the app could not promise that.
--
--     'order' is deliberately NOT accepted. That reason belongs to
--     apply_order_stock(), whose idempotency rests on every such movement
--     carrying an order_id; a hand-made one with a null order_id would sit
--     outside the unique index and quietly break the guarantee.
-- ---------------------------------------------------------------------------
create or replace function public.record_stock_movement(
  p_sku        text,
  p_delta      integer,
  p_reason     text,
  p_note       text,
  p_created_by text
)
returns integer
language plpgsql
set search_path = public
as $$
declare
  v_on_hand integer;
begin
  if p_delta is null or p_delta = 0 then
    raise exception 'a movement needs a non-zero delta';
  end if;

  if p_reason not in ('batch', 'correction', 'write_off', 'return') then
    raise exception 'reason % cannot be recorded by hand', p_reason;
  end if;

  insert into public.stock_movements (sku, delta, reason, note, created_by)
  values (p_sku, p_delta, p_reason, nullif(btrim(p_note), ''), coalesce(nullif(btrim(p_created_by), ''), 'unknown'));

  update public.stock_items
     set on_hand = on_hand + p_delta
   where sku = p_sku
  returning on_hand into v_on_hand;

  return v_on_hand;
end;
$$;

comment on function public.record_stock_movement(text, integer, text, text, text) is
  'The manual stock writer: one movement plus the matching level change, atomically. Refuses reason=order.';

-- ---------------------------------------------------------------------------
-- 5. Access
--
--    Admin-only data, so: RLS on with NO policies at all, which makes both
--    tables unreachable through the anon and authenticated keys regardless of
--    who is signed in. The same posture as public.payments. Reads and writes
--    go through the service role, and authorisation is the app's job — every
--    admin page 404s for non-admins and every server action re-checks
--    isAdminEmail() for itself.
-- ---------------------------------------------------------------------------
alter table public.stock_items     enable row level security;
alter table public.stock_movements enable row level security;

grant all privileges on public.stock_items     to service_role;
grant all privileges on public.stock_movements to service_role;

-- PostgREST exposes every function in `public` as an RPC endpoint, so the
-- default "executable by all" would put this one behind the anon key. Take it
-- away first, then hand it back to the only role that should have it.
revoke all on function public.apply_order_stock(uuid) from public, anon, authenticated;
grant execute on function public.apply_order_stock(uuid) to service_role;

revoke all on function public.record_stock_movement(text, integer, text, text, text)
  from public, anon, authenticated;
grant execute on function public.record_stock_movement(text, integer, text, text, text)
  to service_role;

-- ---------------------------------------------------------------------------
-- 6. Seed — the catalogue as it stands, all at zero.
--
--    Zero, not a guess: the first real number should come from counting the
--    shelf and logging it as a batch, so the movement history starts truthful.
--
--    Thresholds are seeded at 3 / 10 rather than 0/0 because a zero threshold
--    can never be crossed — the low-stock alert would look broken on day one.
--    They are meant to be adjusted per item in /admin/stock.
--
--    ON CONFLICT DO NOTHING throughout: re-running this file must never reset
--    a level or a threshold you have since set.
-- ---------------------------------------------------------------------------
insert into public.stock_items (sku, kind, product_slug, variant, name_en, name_uk) values
  ('hmd-tct-classic',      'product', 'hmd-tct-classic',    null,     'HMD TCT Classic',                  'HMD TCT Classic'),
  ('hmd-a-craft',          'product', 'hmd-a-craft',        null,     'HMD A.Craft',                      'HMD A.Craft'),
  ('hmd-tct-op__black',    'product', 'hmd-tct-op',         'Black',  'HMD TCT OP — Black',               'HMD TCT OP — Чорний'),
  ('hmd-tct-op__purple',   'product', 'hmd-tct-op',         'Purple', 'HMD TCT OP — Purple',              'HMD TCT OP — Фіолетовий'),
  ('bowl-killer',          'product', 'bowl-killer',        null,     'Tactical Killer',                  'Tactical Killer'),
  ('bowl-livanka',         'product', 'bowl-livanka',       null,     'Tactical Livanka',                 'Tactical Livanka'),
  ('bowl-phunnel',         'product', 'bowl-phunnel',       null,     'Tactical 0.66 F.CK THE PHUNNEL',   'Tactical 0.66 F.CK THE PHUNNEL'),
  ('windcover-bomb-cap',   'product', 'windcover-bomb-cap', null,     'TCT Windcover «Bomb Cap»',         'TCT Windcover «Bomb Cap»'),
  ('part__lid',            'part',    null,                 null,     'HMD lid',                          'Кришка HMD'),
  ('part__rubber',         'part',    null,                 null,     'HMD rubber ring',                  'Гумове кільце HMD')
on conflict (sku) do nothing;

-- =============================================================================
--  VERIFY — should list ten rows, all on_hand = 0:
--
--    select sku, kind, on_hand, critical_level, reorder_level
--      from public.stock_items order by kind, sku;
--
--  And the guard should hold — running this twice must leave one movement:
--
--    select public.apply_order_stock('<some order id>');
--    select public.apply_order_stock('<the same order id>');
--    -- second call returns applied=0, replayed=N
-- =============================================================================
