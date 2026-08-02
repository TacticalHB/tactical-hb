-- Checkbox PRRO: what happened when we tried to fiscalise an order.
--
-- Three columns rather than one status enum, because the useful question in
-- admin is never "what state is this in" but "is there a fiscal receipt, and if
-- not, why not". A row with receipt_id set is done; a row with error set needs a
-- human; a row with neither was never attempted.
--
-- checkbox_receipt_id is the id Checkbox assigns AND the id we send: the receipt
-- UUID is derived deterministically from the order, so a webhook retry re-sends
-- the same id and cannot mint a second fiscal document. Unique index enforces
-- the same rule on our side.

alter table public.orders
  add column if not exists checkbox_receipt_id   uuid,
  add column if not exists checkbox_fiscalised_at timestamptz,
  add column if not exists checkbox_error         text;

-- One fiscal receipt per order, at most. A partial index so the many NULLs
-- (orders never fiscalised) don't collide with each other.
create unique index if not exists orders_checkbox_receipt_id_key
  on public.orders (checkbox_receipt_id)
  where checkbox_receipt_id is not null;

-- The admin queue: paid orders still missing a receipt, newest first.
create index if not exists orders_awaiting_fiscalisation_idx
  on public.orders (created_at desc)
  where checkbox_receipt_id is null;

comment on column public.orders.checkbox_receipt_id is
  'Checkbox fiscal receipt UUID. Derived deterministically from the order so retries are idempotent.';
comment on column public.orders.checkbox_fiscalised_at is
  'When Checkbox confirmed the fiscal receipt. NULL means no fiscal document exists for this order.';
comment on column public.orders.checkbox_error is
  'Last fiscalisation failure, for the admin queue. Cleared on success.';
