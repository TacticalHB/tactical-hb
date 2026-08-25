-- =============================================================================
--  Which price book a partner buys from.
--
--  Run this in the Supabase SQL editor. Expected: "Success. No rows returned."
--  Safe to re-run. Requires 0030.
--
--  THERE ARE TWO BOOKS AND THEY ARE NOT CLOSE TOGETHER
--
--  The wholesale list prices HMD TCT Classic at €12.00 for a shop and €19.50
--  for a lounge — a lounge pays roughly 60% more, and on some lines more than
--  that. Serving the wrong book is not a cosmetic mistake; it is quoting a
--  lounge shop margin, in writing, to someone who will hold you to it.
--
--  NULLABLE, AND NULL MEANS NO PRICES AT ALL. There is deliberately no default
--  and no fallback book. A partner approved before this column existed, or
--  approved by someone who skipped the field, sees "—" against every line and
--  cannot submit — which is loud, recoverable and cheap. A default of 'shop'
--  would have been silent, unrecoverable and expensive.
--
--  `business_type` (0032) is what the APPLICANT said they were; this is what
--  STAFF decided to sell them at. They usually agree, and the admin form
--  suggests the mapping — but a distributor who is really a lounge chain is a
--  judgement, and the judgement belongs on its own column.
-- =============================================================================

alter table public.wholesale_partners
  add column if not exists partner_type text;

alter table public.wholesale_partners
  drop constraint if exists wholesale_partners_partner_type_check;
alter table public.wholesale_partners
  add constraint wholesale_partners_partner_type_check
  check (partner_type is null or partner_type in ('shop', 'lounge'));

comment on column public.wholesale_partners.partner_type is
  'Price book: shop | lounge. Null = no book, no prices, cannot submit. Shops and distributors share the shop book. Set by staff at approval — distinct from business_type, which is what the applicant claimed.';

-- The snapshot of what was actually quoted, on the request itself. A book can
-- be repriced or a partner moved between books; a request that has been sent
-- must still say what it said on the day.
alter table public.wholesale_requests
  add column if not exists partner_type text,
  add column if not exists currency text;

comment on column public.wholesale_requests.partner_type is
  'The book this request was priced from, snapshotted at submit.';
comment on column public.wholesale_requests.currency is
  'UAH or EUR — the storefront the partner submitted from, snapshotted so the totals can never be re-read in the other currency.';

-- =============================================================================
--  VERIFY — read-only, safe to run:
--
--    select company, account_status, business_type, partner_type
--      from public.wholesale_partners order by company;
--
--    -- everyone approved before this migration: expect partner_type null,
--    -- which is why they see no prices until you set one
--    select count(*) from public.wholesale_partners
--     where account_status = 'approved' and partner_type is null;
-- =============================================================================
