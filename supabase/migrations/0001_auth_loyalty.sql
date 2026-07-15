-- =============================================================================
--  Tactical HB — auth + loyalty schema  (run once in Supabase SQL editor)
--  Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE / idempotent seeds.
-- =============================================================================

-- ---------- 1) PROFILES (1:1 with auth.users) --------------------------------
create table if not exists public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  first_name       text,
  surname          text,
  date_of_birth    date,
  marketing_opt_in boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ---------- 2) LOYALTY CONFIG (single editable row: id = 1) -------------------
-- Change any of these values anytime; accrual + UI read from here.
create table if not exists public.loyalty_config (
  id                    int primary key default 1 check (id = 1),
  xp_per_eur            numeric not null default 10,
  min_order_eur         numeric not null default 35,
  voucher_expiry_months int     not null default 3,
  uah_per_eur           numeric not null default 50,
  milestones            jsonb   not null default
    '[{"spend_eur":100,"voucher_eur":10},{"spend_eur":250,"voucher_eur":25}]'::jsonb
);
insert into public.loyalty_config (id) values (1) on conflict (id) do nothing;

-- ---------- 3) ORDERS (spend source) -----------------------------------------
-- For now insert manually (admin) via this editor; Shopify webhook later.
create table if not exists public.orders (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  amount_eur   numeric not null check (amount_eur >= 0),
  source       text not null default 'manual',
  external_ref text,
  created_at   timestamptz not null default now()
);
create index if not exists orders_user_idx on public.orders(user_id);

-- ---------- 4) POINTS LEDGER (history) ---------------------------------------
create table if not exists public.points_transactions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  xp         integer not null,
  reason     text not null default 'order',
  order_id   uuid references public.orders(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists points_user_idx on public.points_transactions(user_id);

-- ---------- 5) VOUCHERS ------------------------------------------------------
create table if not exists public.vouchers (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  code          text not null unique,
  milestone_eur numeric not null,
  amount_eur    numeric not null,
  min_order_eur numeric not null,
  status        text not null default 'active',  -- active | redeemed | expired
  issued_at     timestamptz not null default now(),
  expires_at    timestamptz not null,
  redeemed_at   timestamptz
);
create index if not exists vouchers_user_idx on public.vouchers(user_id);

-- ---------- 6) FAVOURITES ----------------------------------------------------
create table if not exists public.favourites (
  user_id      uuid not null references auth.users(id) on delete cascade,
  product_slug text not null,
  created_at   timestamptz not null default now(),
  primary key (user_id, product_slug)
);

-- =============================================================================
--  TRIGGERS
-- =============================================================================

-- On signup: create a profile row from the user's sign-up metadata.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, first_name, surname, date_of_birth, marketing_opt_in)
  values (
    new.id,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'surname',
    nullif(new.raw_user_meta_data->>'date_of_birth','')::date,
    coalesce((new.raw_user_meta_data->>'marketing_opt_in')::boolean, false)
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- On new order: award XP and issue any newly-reached milestone vouchers.
-- Runs as SECURITY DEFINER so points/vouchers are trusted (users can't self-grant).
create or replace function public.handle_new_order()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  cfg         public.loyalty_config;
  total_spend numeric;
  prev_spend  numeric;
  m           jsonb;
begin
  select * into cfg from public.loyalty_config where id = 1;

  insert into public.points_transactions (user_id, xp, reason, order_id)
  values (new.user_id, floor(new.amount_eur * cfg.xp_per_eur)::int, 'order', new.id);

  select coalesce(sum(amount_eur), 0) into total_spend
    from public.orders where user_id = new.user_id;
  prev_spend := total_spend - new.amount_eur;

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
        'TCT-' || upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 8)),
        (m->>'spend_eur')::numeric,
        (m->>'voucher_eur')::numeric,
        cfg.min_order_eur,
        now() + make_interval(months => cfg.voucher_expiry_months)
      );
    end if;
  end loop;

  return new;
end; $$;

drop trigger if exists on_order_created on public.orders;
create trigger on_order_created
  after insert on public.orders
  for each row execute function public.handle_new_order();

-- keep profiles.updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;
drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- =============================================================================
--  ROW LEVEL SECURITY   (service_role — used by the SQL editor — bypasses RLS)
-- =============================================================================
alter table public.profiles            enable row level security;
alter table public.loyalty_config      enable row level security;
alter table public.orders              enable row level security;
alter table public.points_transactions enable row level security;
alter table public.vouchers            enable row level security;
alter table public.favourites          enable row level security;

-- profiles: a user sees & edits only their own
drop policy if exists "profiles self read"   on public.profiles;
drop policy if exists "profiles self insert" on public.profiles;
drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self read"   on public.profiles for select using (auth.uid() = id);
create policy "profiles self insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles self update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- loyalty_config: world-readable, no client writes
drop policy if exists "loyalty_config read" on public.loyalty_config;
create policy "loyalty_config read" on public.loyalty_config for select using (true);

-- orders / points / vouchers: owner READ-only (writes come from triggers / admin)
drop policy if exists "orders self read" on public.orders;
create policy "orders self read" on public.orders for select using (auth.uid() = user_id);
drop policy if exists "points self read" on public.points_transactions;
create policy "points self read" on public.points_transactions for select using (auth.uid() = user_id);
drop policy if exists "vouchers self read" on public.vouchers;
create policy "vouchers self read" on public.vouchers for select using (auth.uid() = user_id);

-- favourites: owner full CRUD
drop policy if exists "favourites self all" on public.favourites;
create policy "favourites self all" on public.favourites for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =============================================================================
--  TABLE GRANTS for the API roles (RLS still restricts which rows are visible).
--  Raw-SQL-created tables don't auto-inherit these, so grant them explicitly.
-- =============================================================================
grant usage on schema public to anon, authenticated;

grant select on public.loyalty_config      to anon, authenticated;
grant select, insert, update on public.profiles            to authenticated;
grant select on public.orders              to authenticated;
grant select on public.points_transactions to authenticated;
grant select on public.vouchers            to authenticated;
grant select, insert, update, delete on public.favourites  to authenticated;

-- =============================================================================
--  DONE. Optional: expire past-due vouchers (also safe to run on a schedule)
--    update public.vouchers set status='expired'
--    where status='active' and expires_at < now();
-- =============================================================================
