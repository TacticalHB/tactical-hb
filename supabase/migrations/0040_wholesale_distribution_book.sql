-- =============================================================================
--  Distribution becomes its own price book.
--
--  Run this in the Supabase SQL editor. Expected: "Success. No rows returned."
--  Safe to re-run.
--
--  WHAT CHANGES, AND WHAT DELIBERATELY DOES NOT. 0034 created partner_type with
--  two values and said so in its own comment: "Shops and distributors share the
--  shop book." That was true of the printed price list, which puts them on one
--  page. It stops being true the moment distributors are quoted differently,
--  and that is planned — so the COLUMN learns the third value now, before the
--  NUMBERS diverge.
--
--  Splitting the type first and the prices later is the safe order. A partner
--  can be moved onto the distribution book today and be quoted exactly what
--  they are quoted now, because lib/wholesale-prices gives that book the shop
--  figures until somebody sets different ones. Doing it the other way round —
--  new prices and no way to record who gets them — would mean quoting from a
--  spreadsheet in the meantime.
--
--  NOBODY IS RECLASSIFIED. Every existing 'shop' row stays 'shop'. Some of them
--  are distributors, and which ones is a commercial judgement this migration
--  has no business making — staff move them on the partner card. That is the
--  same reasoning 0034 used to keep partner_type apart from business_type.
-- =============================================================================

alter table public.wholesale_partners
  drop constraint if exists wholesale_partners_partner_type_check;
alter table public.wholesale_partners
  add constraint wholesale_partners_partner_type_check
  check (partner_type is null or partner_type in ('shop', 'distribution', 'lounge'));

comment on column public.wholesale_partners.partner_type is
  'Price book: shop | distribution | lounge. Null = no book, no prices, cannot submit. Distribution carries the shop figures today and exists so it can be repriced without touching shops. Set by staff at approval — distinct from business_type, which is what the applicant claimed.';

-- ---------------------------------------------------------------------------
--  The same value has to be storable on the request snapshot.
--
--  0034 added wholesale_requests.partner_type WITHOUT a check constraint, so
--  this is a comment change only — but the value is about to start appearing
--  there, and a column whose comment lists two of its three possible values is
--  a column that will be misread.
-- ---------------------------------------------------------------------------
comment on column public.wholesale_requests.partner_type is
  'The book this request was priced from (shop | distribution | lounge), snapshotted at submit.';

-- =============================================================================
--  VERIFY — read-only. Nothing below writes a row.
--
--    select conname, pg_get_constraintdef(oid) like '%distribution%' as admits_distribution
--      from pg_constraint
--     where conname = 'wholesale_partners_partner_type_check';
--
--  Expected: true. Probe with a BOOLEAN, never by eyeballing the definition —
--  Supabase's result grid truncates pg_get_constraintdef and an unwidened
--  constraint looks identical to a widened one.
--
--    select partner_type, count(*) from public.wholesale_partners group by 1;
--
--  Expected: exactly the counts you had before. This migration moves nobody.
-- =============================================================================
