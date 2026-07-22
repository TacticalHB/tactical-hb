-- =============================================================================
--  Foundations for taking real payments: guest orders, dual-currency amounts.
--
--  Run this in the Supabase SQL editor BEFORE the Monobank integration.
--  Expected result: "Success. No rows returned."
--
--  Three problems, in the order they bite:
--
--  1. GUEST ORDERS. orders.user_id was NOT NULL, so a guest order could not be
--     inserted at all. Checkout offers guest checkout, so every guest purchase
--     would have failed after the customer had already paid.
--
--  2. THE TRIGGER WOULD THROW. handle_new_order() inserts new.user_id into
--     points_transactions, whose user_id is NOT NULL. Simply dropping the NOT
--     NULL above would turn the first guest order into a failed insert — money
--     taken, no order recorded. The trigger now returns early for guests.
--
--  3. CURRENCY. Monobank settles in UAH only, but loyalty XP and voucher
--     milestones are denominated in EUR. Writing a UAH figure into amount_eur
--     would silently inflate XP by ~51x and hand out vouchers at the wrong
--     thresholds. Orders now carry BOTH: amount_eur stays the loyalty basis,
--     amount_uah records what was actually charged.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Guest orders
-- ---------------------------------------------------------------------------
alter table public.orders alter column user_id drop not null;

-- ---------------------------------------------------------------------------
-- 2. Dual-currency amounts, guest contact details, voucher record
--
--    amount_eur (existing, NOT NULL) — the EUR value of the order. Loyalty
--    reads this and nothing else, so its meaning must never change.
--    amount_uah — what the customer was actually charged, when settled in UAH.
-- ---------------------------------------------------------------------------
alter table public.orders
  add column if not exists amount_uah   numeric      check (amount_uah >= 0),
  add column if not exists currency     text         not null default 'UAH',
  add column if not exists discount_eur numeric      not null default 0 check (discount_eur >= 0),
  add column if not exists voucher_code text,
  -- Guests have no auth.users row, so the order itself must carry who to
  -- contact and where to ship.
  add column if not exists email        text,
  add column if not exists delivery     jsonb;

alter table public.order_items
  add column if not exists price_uah numeric(10,2);

comment on column public.orders.amount_eur is
  'EUR value of the order. The basis for loyalty XP and voucher milestones — never store a UAH figure here.';
comment on column public.orders.amount_uah is
  'Amount actually charged in UAH (Monobank settles in UAH only).';
comment on column public.orders.user_id is
  'Null for guest checkout. Guests earn no loyalty — there is no account to credit.';

-- Reconciling a Monobank payment means finding the order by its reference.
create index if not exists orders_external_ref_idx on public.orders (external_ref);

-- ---------------------------------------------------------------------------
-- 3. Loyalty trigger: skip guests instead of throwing
--
--    Body is otherwise identical to 0005 — same XP maths, same milestone
--    logic, same core-Postgres code generator. The only change is the guard.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_order()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  cfg         public.loyalty_config;
  total_spend numeric;
  prev_spend  numeric;
  m           jsonb;
begin
  -- Guest order: nothing to credit. Returning early keeps the insert alive —
  -- points_transactions.user_id is NOT NULL and would otherwise reject it.
  if new.user_id is null then
    return new;
  end if;

  select * into cfg from public.loyalty_config where id = 1;

  -- XP for this order
  insert into public.points_transactions (user_id, xp, reason, order_id)
  values (new.user_id, floor(new.amount_eur * cfg.xp_per_eur)::int, 'order', new.id);

  -- spend before and after this order
  select coalesce(sum(amount_eur), 0) into total_spend
    from public.orders where user_id = new.user_id;
  prev_spend := total_spend - new.amount_eur;

  -- issue a voucher for each milestone this order crossed (once per milestone)
  for m in select * from jsonb_array_elements(cfg.milestones) loop
    if (m->>'spend_eur')::numeric >  prev_spend
   and (m->>'spend_eur')::numeric <= total_spend
   and not exists (
         select 1 from public.vouchers
         where user_id = new.user_id
           and milestone_eur = (m->>'spend_eur')::numeric
       )
    then
      insert into public.vouchers
        (user_id, code, milestone_eur, amount_eur, min_order_eur, expires_at)
      values (
        new.user_id,
        -- core-Postgres code generator, e.g. TCT-9F3A2B7C
        'TCT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
        (m->>'spend_eur')::numeric,
        (m->>'voucher_eur')::numeric,
        cfg.min_order_eur,
        now() + make_interval(months => cfg.voucher_expiry_months)
      );
    end if;
  end loop;

  return new;
end; $$;

-- ---------------------------------------------------------------------------
-- 4. Read access is unchanged and still safe.
--
--    "orders self read" is `auth.uid() = user_id`. For a guest order user_id
--    is NULL, and `auth.uid() = NULL` evaluates to NULL — never true — so no
--    signed-in customer can read anyone's guest orders. Guest orders are
--    reachable only through the service role.
-- ---------------------------------------------------------------------------
