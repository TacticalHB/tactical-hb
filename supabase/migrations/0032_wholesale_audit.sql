-- =============================================================================
--  Wholesale account status becomes attributable, and registration catches
--  up with the two contact fields the enquiry form already collected.
--
--  Run this in the Supabase SQL editor. Expected: "Success. No rows returned."
--  Safe to re-run. Requires 0030.
--
--  TWO PROBLEMS, ONE OF THEM MINE
--
--  1. `approved_at` / `approved_by` were written on approval and CLEARED on
--     any other status. So approving a partner and later suspending them threw
--     away the record that they had ever been approved, by whom, and when —
--     which is exactly the fact you want when a suspended partner emails
--     asking what happened. Those two columns now mean "the first time this
--     partner was let in", and nothing clears them.
--
--  2. Nothing recorded a rejection or a suspension at all. Approve was
--     attributable; the two decisions with the most explaining to do later
--     were not. The new pair records EVERY status change, whichever direction
--     it goes.
--
--  Deliberately not an event table. One row per partner carrying "who last
--  changed this and when" answers the question that actually gets asked, and a
--  full history table would need a UI nobody has asked for to be worth
--  reading. If a real audit log is ever needed, this is the column set it
--  would be built from.
-- =============================================================================

alter table public.wholesale_partners
  add column if not exists account_status_changed_at timestamptz,
  add column if not exists account_status_changed_by text;

-- ---------------------------------------------------------------------------
--  ...and the two contact fields the enquiry form has always collected.
--
--  /api/wholesale asks for city and business type and emails them to sales.
--  Self-registration asked for neither, so a partner who came in through the
--  new door arrived with less information attached than one who used the old
--  one — and "which kind of business is this" is the first thing a reviewer
--  wants before opening a trade account. Both nullable: the CRM has rows that
--  predate them, and an enquiry can still arrive by Instagram with neither.
-- ---------------------------------------------------------------------------
alter table public.wholesale_partners
  add column if not exists city text,
  add column if not exists business_type text;

comment on column public.wholesale_partners.business_type is
  'Free text as the applicant selected it, e.g. "Shop / Online Retailer". Not an enum: the enquiry form sends the label, not a key, and the two paths must agree.';

comment on column public.wholesale_partners.approved_at is
  'When this partner was FIRST approved. Never cleared — a later suspension must not erase the fact that access was once granted.';
comment on column public.wholesale_partners.approved_by is
  'The admin who first approved. Never cleared, same reasoning as approved_at.';
comment on column public.wholesale_partners.account_status_changed_at is
  'When account_status last changed, in any direction.';
comment on column public.wholesale_partners.account_status_changed_by is
  'The admin email behind the last account_status change.';

-- Existing rows: anything already approved gets its stamp treated as the
-- change stamp too, so the column is not null for partners who predate it.
update public.wholesale_partners
   set account_status_changed_at = coalesce(account_status_changed_at, approved_at),
       account_status_changed_by = coalesce(account_status_changed_by, approved_by)
 where approved_at is not null
   and account_status_changed_at is null;

-- =============================================================================
--  VERIFY — read-only, safe to run:
--
--    select column_name from information_schema.columns
--     where table_name = 'wholesale_partners'
--       and (column_name like 'account_status_%'
--            or column_name in ('city','business_type'))
--     order by column_name;
--
--    select company, account_status, approved_at, approved_by,
--           account_status_changed_at, account_status_changed_by
--      from public.wholesale_partners
--     order by account_status_changed_at desc nulls last;
-- =============================================================================
