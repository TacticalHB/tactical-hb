-- =============================================================================
--  0044 — "Tell me when it's back" (Mario, 15 Oct 2026).
--
--  Run this in the Supabase SQL editor. Expected: "Success. No rows returned."
--  Safe to re-run.
--
--  One row per (email, product) a visitor asked to hear about. The daily
--  email cron (/api/cron/email-queue) mails every waiting row whose product is
--  on sale again and stamps notified_at, so nobody hears twice about the same
--  return. A notified row stays as the record of what was sent.
--
--  THE EMAIL IS STORED LOWERCASED, at the call site, so the unique index below
--  cannot be beaten with a capital letter. Nothing else is kept about the
--  person: no account link, no IP — this is a single-purpose notice, not a
--  marketing list, and it is used for nothing else.
-- =============================================================================

create table if not exists public.back_in_stock_requests (
  id           uuid primary key default gen_random_uuid(),
  email        text not null,
  product_slug text not null,
  locale       text not null default 'en',
  created_at   timestamptz not null default now(),
  notified_at  timestamptz
);

-- One WAITING request per address per product: asking twice is a no-op, and
-- asking again after being told starts a fresh wait.
create unique index if not exists back_in_stock_waiting_once
  on public.back_in_stock_requests (email, product_slug)
  where notified_at is null;

-- The cron's only question: which rows are still waiting?
create index if not exists back_in_stock_waiting_idx
  on public.back_in_stock_requests (product_slug)
  where notified_at is null;

-- RLS on, no policies: reachable only through the service-role module
-- (lib/back-in-stock), never from the browser's keys.
alter table public.back_in_stock_requests enable row level security;

comment on table public.back_in_stock_requests is
  'Back-in-stock notices. One waiting row per (email, product); notified_at is stamped when the return email goes out.';
