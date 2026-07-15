-- =============================================================================
--  Run this in the Supabase SQL editor (fixes "permission denied for table…").
--  RLS controls WHICH ROWS; these GRANTs allow the API roles to touch the table.
--  Safe to re-run.
-- =============================================================================
grant usage on schema public to anon, authenticated;

grant select on public.loyalty_config      to anon, authenticated;
grant select, insert, update on public.profiles            to authenticated;
grant select on public.orders              to authenticated;
grant select on public.points_transactions to authenticated;
grant select on public.vouchers            to authenticated;
grant select, insert, update, delete on public.favourites  to authenticated;
