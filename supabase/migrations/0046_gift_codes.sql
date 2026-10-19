-- ============================================================================
--  0046 — Gift promo codes (Mario, 19 Oct 2026)
--
--  Twenty single-use gift codes: ten at 20 % off, ten at 15 % off. Unlike the
--  loyalty vouchers (public.vouchers — a fixed euro amount, owned by one
--  account) a gift code belongs to nobody: anyone with it can use it once,
--  guests included. The discount comes off the GOODS; delivery is added after.
--
--  A code is spent when its order is PAID (lib/fulfilment calls
--  mark_gift_code_used), not when it is typed in — a customer who abandons the
--  Monobank page has not used it. Admin › Vouchers lists every code and strikes
--  through the used ones.
--
--  Codes look like GIFT20-7F3A9C / GIFT15-0B12E4: the percentage is readable in
--  the code, and the six hex characters avoid O/0 and I/1 confusion.
--
--  Run once in the Supabase SQL editor. Safe to re-run: the table and function
--  are create-if-missing, and the seed only fills a batch that is still empty.
-- ============================================================================

create table if not exists public.gift_codes (
  code           text primary key,
  percent        integer not null check (percent between 1 and 90),
  created_at     timestamptz not null default now(),
  used_at        timestamptz,
  used_reference text          -- the order reference (TCT-XXXXXX) it was spent on
);

alter table public.gift_codes enable row level security;
-- No policies: only the service role (server code) reads or writes it. A
-- browser can never list the codes.
revoke all on public.gift_codes from anon, authenticated;
grant select, insert, update on public.gift_codes to service_role;

-- Spend a code, atomically. Returns the row if THIS call spent it, nothing if
-- it was already used (or does not exist) — so two payments racing for one
-- code cannot both record it.
create or replace function public.mark_gift_code_used(p_code text, p_reference text)
returns public.gift_codes
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.gift_codes;
begin
  update public.gift_codes
     set used_at = now(),
         used_reference = p_reference
   where code = upper(trim(p_code))
     and used_at is null
  returning * into g;
  return g;
end;
$$;

revoke all on function public.mark_gift_code_used(text, text) from public, anon, authenticated;
grant execute on function public.mark_gift_code_used(text, text) to service_role;

-- The first batch: ten at 20 %, ten at 15 %.
do $$
declare
  i integer;
begin
  if not exists (select 1 from public.gift_codes where percent = 20) then
    for i in 1..10 loop
      insert into public.gift_codes (code, percent)
      values ('GIFT20-' || upper(substr(md5(gen_random_uuid()::text), 1, 6)), 20)
      on conflict do nothing;
    end loop;
  end if;
  if not exists (select 1 from public.gift_codes where percent = 15) then
    for i in 1..10 loop
      insert into public.gift_codes (code, percent)
      values ('GIFT15-' || upper(substr(md5(gen_random_uuid()::text), 1, 6)), 15)
      on conflict do nothing;
    end loop;
  end if;
end $$;

-- Check: should return 10 / 10.
select percent, count(*) from public.gift_codes group by percent order by percent desc;
