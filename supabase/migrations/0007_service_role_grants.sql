-- =============================================================================
--  Grants for service_role — the piece 0002 missed.
--  Run in the Supabase SQL editor. Safe to re-run.
--  Expected result: "Success. No rows returned."
--
--  WHY THIS IS NEEDED
--  Supabase normally grants service_role full access to public tables via
--  default privileges. Our tables were created by raw SQL, so they never
--  picked those up — 0002 fixed it for anon/authenticated but not for
--  service_role. Result: the service key (which is supposed to bypass
--  everything) got "42501 permission denied" on every loyalty table.
--
--  It was masked because mark_voucher_used() is SECURITY DEFINER and runs as
--  its owner, so redemption worked while direct reads/writes did not.
--
--  service_role is server-only (never NEXT_PUBLIC_), so full access here is
--  the intended Supabase design, not a loosening of security. RLS still
--  governs anon/authenticated exactly as before — none of those change.
-- =============================================================================

grant usage on schema public to service_role;

grant all privileges on public.profiles            to service_role;
grant all privileges on public.loyalty_config      to service_role;
grant all privileges on public.orders              to service_role;
grant all privileges on public.order_items         to service_role;
grant all privileges on public.points_transactions to service_role;
grant all privileges on public.vouchers            to service_role;
grant all privileges on public.favourites          to service_role;

-- Any future table in public should behave the same way, so we don't rediscover
-- this bug on the next raw-SQL migration.
alter default privileges in schema public
  grant all privileges on tables to service_role;

-- =============================================================================
--  VERIFY — should return one row per table, all with has_access = true:
--
--    select table_name,
--           has_table_privilege('service_role', 'public.' || table_name, 'select')
--             as has_access
--      from information_schema.tables
--     where table_schema = 'public'
--       and table_name in ('profiles','loyalty_config','orders','order_items',
--                          'points_transactions','vouchers','favourites')
--     order by table_name;
-- =============================================================================
