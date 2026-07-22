-- =============================================================================
--  Monobank payments.
--
--  Run this in the Supabase SQL editor. Expected: "Success. No rows returned."
--
--  WHY A SEPARATE TABLE, rather than an `orders` row with a status column:
--  inserting into orders fires on_order_created, which awards XP and issues
--  milestone vouchers immediately. A pending payment must never do that —
--  someone who opens the Monobank page and walks away would earn loyalty for
--  an order they never paid for. So the intent lives here, and an `orders` row
--  is created only once payment is confirmed.
--
--  This table also carries everything needed to fulfil the order, because the
--  webhook tells us almost nothing: an invoice id, a reference, and a status.
-- =============================================================================

create table if not exists public.payments (
  id           uuid primary key default gen_random_uuid(),

  -- Our reference, sent to Monobank and echoed back on the webhook.
  reference    text not null unique,
  -- Monobank's id for the invoice. Unknown until they answer.
  invoice_id   text unique,

  -- pending → paid | failed | expired. Fulfilment is guarded on this.
  status       text not null default 'pending',

  -- EXACTLY what we asked Monobank to charge, in kopiyky. The webhook's
  -- amount is checked against this; a mismatch is refused.
  amount_kop   integer not null check (amount_kop > 0),
  ccy          integer not null default 980,

  -- Null for guest checkout, as on orders.
  user_id      uuid references auth.users(id) on delete set null,
  email        text not null,
  locale       text not null default 'uk',

  -- Both currencies, so the resulting order can be written correctly:
  -- amount_eur is the loyalty basis, amount_uah is what was charged.
  amount_eur   numeric not null check (amount_eur >= 0),
  amount_uah   numeric not null check (amount_uah >= 0),
  discount_eur numeric not null default 0 check (discount_eur >= 0),
  voucher_code text,

  delivery     jsonb not null,
  lines        jsonb not null,

  -- Set once fulfilled, so a replayed webhook can be recognised.
  order_id     uuid references public.orders(id) on delete set null,

  created_at   timestamptz not null default now(),
  paid_at      timestamptz
);

create index if not exists payments_status_idx    on public.payments (status);
create index if not exists payments_invoice_idx   on public.payments (invoice_id);
create index if not exists payments_created_idx   on public.payments (created_at desc);

-- Payments hold delivery addresses and are written by the webhook, which runs
-- as the service role. RLS on with NO policies = nothing reachable through the
-- anon or authenticated keys. Deliberate: no customer needs to read this table.
alter table public.payments enable row level security;

grant all on public.payments to service_role;

comment on table public.payments is
  'Monobank payment intents. An orders row is created only when a payment is confirmed — inserting one awards loyalty, so it must not happen before money moves.';
comment on column public.payments.amount_kop is
  'Amount in kopiyky sent to Monobank. The webhook amount is verified against this.';
