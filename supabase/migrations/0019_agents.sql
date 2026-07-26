-- =============================================================================
--  THB-OS Phase C — the agents' notebook.
--
--  Run this in the Supabase SQL editor. Expected: "Success. No rows returned."
--  Safe to re-run.
--
--  THE SHAPE OF THE PROBLEM
--
--  Phase C adds the first agents: the Stock Advisor, the Wholesale Follow-up
--  drafts, and the Weekly Commander Brief. All three are readers — they look
--  at stock, orders, partners and finance, and they say things. The plan
--  (§6.7) requires every run to be auditable: "what did the advisor say last
--  Monday" must be a query, not a memory. agent_runs is that record.
--
--  WHAT THIS TABLE IS NOT. It is not a queue, not an approval inbox, and not
--  a channel through which agents affect anything. Nothing reads agent_runs
--  to decide an action. A row here is a photograph of advice already shown to
--  the founder; deleting every row would lose history and change no behaviour.
--
--  Agents in this phase write NOTHING else. Stock moves only on paid orders
--  and manual batches (0015). Partner statuses move only by admin action in
--  /admin/partners (0017). No email leaves the system except the internal
--  Monday brief to the shop's own address — the same channel as the low-stock
--  alert, approved by the same reasoning: it talks to the founder, not to a
--  customer or partner.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. The run log
-- ---------------------------------------------------------------------------
create table if not exists public.agent_runs (
  id          uuid primary key default gen_random_uuid(),

  agent       text not null check (agent in (
                'stock_advisor', 'wholesale_followup', 'weekly_brief')),

  -- 'cron' for the Monday run, 'manual' for the button in /admin/brief.
  trigger     text not null check (trigger in ('cron', 'manual')),

  -- The full output as shown, language-neutral (names, numbers, dates).
  -- Labels are applied at render time in the reader's locale, so one stored
  -- run serves both languages without storing either.
  output      jsonb not null,

  -- Admin email for manual runs, 'system' for cron.
  created_by  text not null default 'system',
  created_at  timestamptz not null default now()
);

create index if not exists agent_runs_agent_idx
  on public.agent_runs (agent, created_at desc);

comment on table public.agent_runs is
  'Audit log of agent outputs (plan §6.7). Insert-only in practice; nothing reads it to act.';
comment on column public.agent_runs.output is
  'The run''s full output, language-neutral JSON. Rendered with locale labels at read time.';

-- ---------------------------------------------------------------------------
-- 2. Practical batch sizes
--
--    The Stock Advisor rounds its suggestions to how things are actually made
--    (plan §6.1) — "produce 23 bowls" is a spreadsheet answer when the kiln
--    load is 10. Null means "no practical constraint", and suggestions stay
--    exact. Lives on stock_items beside lead_time_days, which 0015 already
--    reserved for this phase.
-- ---------------------------------------------------------------------------
alter table public.stock_items
  add column if not exists batch_size integer
    check (batch_size is null or batch_size >= 1);

comment on column public.stock_items.batch_size is
  'Practical production/order multiple. Advisor suggestions round UP to it. Null = no rounding.';

-- ---------------------------------------------------------------------------
-- 3. Access — the standing posture: RLS on with no policies, so the table is
--    unreachable through the anon and authenticated keys. Reads and writes go
--    through the service role; pages 404 for non-admins and actions re-check
--    isAdminEmail() for themselves.
-- ---------------------------------------------------------------------------
alter table public.agent_runs enable row level security;

grant all privileges on public.agent_runs to service_role;

-- =============================================================================
--  VERIFY — empty but answerable:
--
--    select agent, trigger, created_by, created_at from public.agent_runs
--     order by created_at desc;
--
--    select column_name from information_schema.columns
--     where table_name = 'stock_items' and column_name = 'batch_size';
-- =============================================================================
