-- =============================================================================
--  FIX — voucher codes used gen_random_bytes() (pgcrypto). That extension lives
--  in Supabase's `extensions` schema, and this function pins
--  `search_path = public`, so the call failed with:
--      ERROR: 42883: function gen_random_bytes(integer) does not exist
--  ...but only once a spend milestone was crossed and a voucher was minted.
--
--  Fix: build the code from gen_random_uuid(), which is core Postgres and
--  always resolvable — no extension dependency.
--
--  Run this in the Supabase SQL editor BEFORE re-running the seed.
--  Expected result: "Success. No rows returned."
-- =============================================================================

create or replace function public.handle_new_order()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  cfg         public.loyalty_config;
  total_spend numeric;
  prev_spend  numeric;
  m           jsonb;
begin
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
