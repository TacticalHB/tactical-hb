-- =============================================================================
--  Voucher lifecycle — used_at / used_order_id + a safe "mark used" function.
--  Run in the Supabase SQL editor. Safe to re-run.
--  Expected result: "Success. No rows returned."
-- =============================================================================

-- Columns (no-ops if you already added them by hand).
alter table public.vouchers add column if not exists used_at       timestamptz;
alter table public.vouchers add column if not exists used_order_id text;

comment on column public.vouchers.used_at is
  'When the voucher was actually redeemed. NULL = still available. This is the source of truth for "used".';
comment on column public.vouchers.used_order_id is
  'The order the voucher was spent on. Text so it can hold a Shopify order id later.';

-- Find unused vouchers fast (the account page''s main query).
create index if not exists vouchers_user_unused_idx
  on public.vouchers (user_id)
  where used_at is null;

-- =============================================================================
--  mark_voucher_used(code, order_id)
--
--  Deliberately NOT callable by end users: they only have SELECT on vouchers.
--  If a customer could write this column they could also clear it and re-spend
--  a voucher. So this is SECURITY DEFINER and granted to service_role only —
--  i.e. our server action today, and the Shopify webhook later.
--
--  IDEMPOTENT: re-running keeps the ORIGINAL used_at. Webhooks retry, and a
--  retry must not move the timestamp or silently re-redeem.
-- =============================================================================
create or replace function public.mark_voucher_used(
  p_code     text,
  p_order_id text default null
)
returns public.vouchers
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.vouchers;
begin
  update public.vouchers
     set used_at       = coalesce(used_at, now()),          -- keep first redemption
         used_order_id = coalesce(used_order_id, p_order_id),
         -- keep the legacy columns consistent so nothing contradicts used_at
         status        = 'redeemed',
         redeemed_at   = coalesce(redeemed_at, now())
   where code = p_code
   returning * into v;

  if v.id is null then
    raise exception 'Voucher % not found', p_code;
  end if;

  return v;
end;
$$;

-- Lock it down: nobody but the service role may call this.
revoke all on function public.mark_voucher_used(text, text) from public;
revoke all on function public.mark_voucher_used(text, text) from anon, authenticated;
grant execute on function public.mark_voucher_used(text, text) to service_role;

-- =============================================================================
--  MANUAL USE (until the Shopify webhook exists) — run in this SQL editor:
--    select * from public.mark_voucher_used('TCT-XXXXXXXX', 'test-order-1');
--  To undo while testing:
--    update public.vouchers
--       set used_at = null, used_order_id = null, redeemed_at = null,
--           status = 'active'
--     where code = 'TCT-XXXXXXXX';
-- =============================================================================
