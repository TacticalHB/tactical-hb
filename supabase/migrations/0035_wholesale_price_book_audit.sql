-- =============================================================================
--  Price book changes become attributable.
--
--  Run this in the Supabase SQL editor. Expected: "Success. No rows returned."
--  Safe to re-run. Requires 0034.
--
--  0032 made ACCESS attributable — who approved, rejected or suspended, and
--  when. It did not cover the book, on the reasoning that the book is not an
--  access decision. That reasoning was wrong in the way that matters: which
--  book a partner is on decides what we quote them, and the two lists differ
--  by roughly 60%. "Who put this lounge on shop pricing, and when" is exactly
--  the question that gets asked after a disputed invoice, and until now the
--  answer was nowhere.
--
--  So the same pair, for the same reason, on the other decision.
-- =============================================================================

alter table public.wholesale_partners
  add column if not exists partner_type_changed_at timestamptz,
  add column if not exists partner_type_changed_by text;

comment on column public.wholesale_partners.partner_type_changed_at is
  'When partner_type last changed, in any direction including being cleared.';
comment on column public.wholesale_partners.partner_type_changed_by is
  'The admin email behind the last partner_type change. Non-email markers follow the created_by convention (e.g. "self-registration") for changes no person made through the console.';

-- =============================================================================
--  VERIFY — read-only, safe to run:
--
--    select company, partner_type,
--           partner_type_changed_by, partner_type_changed_at
--      from public.wholesale_partners
--     order by partner_type_changed_at desc nulls last;
--
--    -- a partner on a book with no attribution predates this migration
--    select count(*) from public.wholesale_partners
--     where partner_type is not null and partner_type_changed_at is null;
-- =============================================================================
