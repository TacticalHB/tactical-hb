-- =============================================================================
--  Each wholesale partner is quoted in ONE currency, whatever language they
--  browse the site in.
--
--  Run this in the Supabase SQL editor. Expected: "Success. No rows returned."
--  Safe to re-run.
--
--  WHY (Mario, 11 Oct 2026). The portal showed prices in the currency of the
--  storefront being browsed — a euro partner who switched to /uk saw hryvnia,
--  and a hryvnia partner on /en saw euro — while requests were priced in the
--  currency of the language the partner happened to REGISTER in. Two rules, and
--  a partner could read one figure and be quoted another. Now the partner card
--  carries the currency, staff set it, and the portal, the request, the history
--  and the product-sheet download all follow it.
--
--  NULL IS ALLOWED, and means "not set yet": the code falls back to the
--  partner's country (Ukraine → UAH, anywhere else → EUR), then to the
--  registration language. The backfill below applies that same rule to every
--  existing row, so nobody's quotes move when this runs.
-- =============================================================================

alter table public.wholesale_partners
  add column if not exists currency text;

alter table public.wholesale_partners
  drop constraint if exists wholesale_partners_currency_check;
alter table public.wholesale_partners
  add constraint wholesale_partners_currency_check
  check (currency is null or currency in ('EUR', 'UAH'));

update public.wholesale_partners
set currency = case
  when country ilike '%ukrain%' or country ilike '%україн%' or upper(trim(country)) in ('UA', 'UKR') then 'UAH'
  when coalesce(trim(country), '') = '' then case when locale = 'uk' then 'UAH' else 'EUR' end
  else 'EUR'
end
where currency is null;

comment on column public.wholesale_partners.currency is
  'EUR | UAH — the only currency this partner is shown and quoted in, on every storefront. Set by staff on the partner card; null falls back to country (Ukraine → UAH, else EUR), then registration locale.';
