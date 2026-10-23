-- ============================================================================
--  0048 — Wholesale application online (Mario, 23 Oct 2026)
--
--  Applicants kept missing the PDF form attached to the registration email
--  and waited to be approved without ever sending it. The PDF is retired: the
--  same questions are asked on the site, straight after registering, and the
--  trade documents are uploaded there too. Everything lands on the partner's
--  own row, so Admin › Partners shows the whole application in one place.
--
--  1. Application fields on wholesale_partners (the registration form already
--     collects company, contact name, phone, country, city and business type).
--  2. wholesale_documents — one row per uploaded file.
--  3. A PRIVATE storage bucket for the files. No storage policies at all: the
--     browser uploads through a one-time signed URL the server hands out, and
--     only the server (service role) can read a file back — Admin opens one
--     through a link that expires after five minutes.
--
--  The code reads all of this defensively, so the site keeps working before
--  this is run (the application step just cannot save until it is).
--  Run once in the Supabase SQL editor. Safe to re-run.
-- ============================================================================

-- 1. The application ---------------------------------------------------------
alter table public.wholesale_partners
  add column if not exists legal_name               text,
  add column if not exists address                  text,
  -- "Tax or company registration number": formats differ by country, so free text.
  add column if not exists tax_id                   text,
  add column if not exists years_in_business        text,
  add column if not exists website                  text,
  add column if not exists expected_volume          text,
  add column if not exists products_interest        text[],
  add column if not exists referral_source          text,
  add column if not exists application_comments     text,
  -- The typed name + tick box that replaced the PDF's signature line.
  add column if not exists confirmed_name           text,
  add column if not exists confirmed_at             timestamptz,
  -- Set when every required answer and at least one proof document is in:
  -- this is what turns "Waiting for application" into "Ready to review".
  add column if not exists application_completed_at timestamptz,
  -- The one automatic "finish your application" reminder, sent once.
  add column if not exists application_reminded_at  timestamptz;

alter table public.wholesale_partners
  drop constraint if exists wholesale_partners_expected_volume_check;
alter table public.wholesale_partners
  add constraint wholesale_partners_expected_volume_check
  check (expected_volume is null or expected_volume in ('under_10', '10_30', '30_100', '100_plus'));

-- 2. The documents -----------------------------------------------------------
create table if not exists public.wholesale_documents (
  id            uuid primary key default gen_random_uuid(),
  partner_id    uuid not null references public.wholesale_partners(id) on delete cascade,
  kind          text not null check (kind in ('registration', 'tax', 'premises', 'other')),
  -- Path inside the wholesale-documents bucket: <partner id>/<kind>-<uuid>.<ext>
  storage_path  text not null unique,
  filename      text not null,
  content_type  text,
  size_bytes    bigint,
  uploaded_at   timestamptz not null default now()
);
create index if not exists wholesale_documents_partner_idx on public.wholesale_documents (partner_id);

alter table public.wholesale_documents enable row level security;
-- No policies: only the server reads or writes it.
revoke all on public.wholesale_documents from anon, authenticated;
grant select, insert, delete on public.wholesale_documents to service_role;

-- 3. The private bucket ------------------------------------------------------
-- 15 MB a file; PDFs and photos (HEIC included — iPhones shoot it by default).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'wholesale-documents', 'wholesale-documents', false, 15728640,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp']
)
on conflict (id) do nothing;

-- Check: expect 1 bucket, not public.
select id, public, file_size_limit from storage.buckets where id = 'wholesale-documents';
