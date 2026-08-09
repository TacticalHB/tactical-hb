-- =============================================================================
--  Email flows — subscribers and a durable job queue.
--
--  Run this in the Supabase SQL editor. Expected: "Success. No rows returned."
--  Safe to re-run.
--
--  TWO TABLES, TWO JOBS.
--
--  `subscribers` is the marketing list: who asked for mail, in which language,
--  and whether they have since asked to stop. It is the consent record, so the
--  welcome flow reads it before every send rather than trusting a job that was
--  scheduled days ago.
--
--  `email_jobs` is the clock. A welcome series spans nine days and a cart
--  sequence three, and neither can be an awaited timer inside a request — the
--  function would be killed long before it fired. So each future send is a row
--  with a `send_after`, and a cron sweeps the ones that are due.
--
--  WHY A TABLE RATHER THAN RESEND'S OWN SCHEDULING: these sends have to be
--  CANCELLABLE, and cancelled by things that happen on our side — an order
--  being paid, a bag being emptied, someone unsubscribing. A row we own can be
--  cancelled by a single UPDATE inside the same transaction as the event that
--  causes it. A send already handed to the provider cannot.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. The list
-- ---------------------------------------------------------------------------
create table if not exists public.subscribers (
  email           text primary key,
  -- Which language every mail to this person is written in. Captured at
  -- signup and never inferred later: someone who signed up on /uk does not
  -- start receiving English because they happened to open a link on /en.
  locale          text not null default 'en' check (locale in ('en', 'uk')),

  -- Explicit marketing consent. The welcome flow REQUIRES it; without it a
  -- signup is stored but never mailed.
  marketing_opt_in boolean not null default false,

  -- 'footer' | 'newsletter_page' | 'notify' | 'checkout' — useful when a list
  -- misbehaves and you need to know which form produced it.
  source          text,

  -- Unguessable, per subscriber, and the whole of the unsubscribe link's
  -- security. An unsubscribe URL that took only an email address would let
  -- anyone unsubscribe anyone by editing the query string.
  token           uuid not null default gen_random_uuid(),

  -- NULL means subscribed. Set means they asked to stop, and nothing
  -- marketing-shaped may be sent again.
  unsubscribed_at timestamptz,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists subscribers_token_idx on public.subscribers (token);

comment on table public.subscribers is
  'Marketing list. marketing_opt_in is the consent gate; unsubscribed_at is the stop.';

drop trigger if exists subscribers_touch on public.subscribers;
create trigger subscribers_touch before update on public.subscribers
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 2. The queue
-- ---------------------------------------------------------------------------
create table if not exists public.email_jobs (
  id          uuid primary key default gen_random_uuid(),

  -- What this job belongs to, so a whole sequence can be cancelled at once:
  -- 'welcome:someone@example.com', 'cart:someone@example.com'.
  job_key     text not null,
  flow        text not null check (flow in ('welcome', 'cart')),
  -- 'W1'..'W4' | 'C1'..'C3'
  step        text not null,

  recipient   text not null,
  locale      text not null check (locale in ('en', 'uk')),

  -- When it becomes due. The cron sends everything with send_after <= now().
  send_after  timestamptz not null,

  -- Whatever a step needs at send time that cannot be recomputed. Empty for
  -- both of today's flows, and kept because the alternative to an unused jsonb
  -- column is a migration the first time one is needed.
  --
  -- Cart lines are deliberately NOT here: they live in `abandoned_carts` and
  -- are read fresh when the mail is built, so a bag edited after the job was
  -- scheduled is described as it is now, not as it was.
  payload     jsonb not null default '{}'::jsonb,

  -- Exactly one of these ends a job's life.
  sent_at     timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,

  -- Set while a runner is working on the row, so two overlapping cron
  -- invocations cannot both send it.
  claimed_at  timestamptz,
  attempts    int not null default 0,
  last_error  text,

  created_at  timestamptz not null default now()
);

create index if not exists email_jobs_due_idx
  on public.email_jobs (send_after)
  where sent_at is null and cancelled_at is null;

create index if not exists email_jobs_key_idx on public.email_jobs (job_key);

-- ONE PENDING JOB PER KEY AND STEP. This is what makes "sending C1 twice" a
-- database error rather than a defect discovered in someone's inbox: a second
-- attempt to schedule the same step for the same person, while the first is
-- still pending, cannot be inserted.
create unique index if not exists email_jobs_pending_uniq
  on public.email_jobs (job_key, step)
  where sent_at is null and cancelled_at is null;

comment on table public.email_jobs is
  'Durable schedule for multi-day email flows. Cancellable by job_key; one pending row per (job_key, step).';

-- ---------------------------------------------------------------------------
-- 2b. The bag, as the server last saw it.
--
--     The shop's cart is client state in localStorage — there is no server
--     cart to read at send time, so the browser posts a snapshot whenever the
--     bag changes and an abandoned-cart mail is built from this row.
--
--     ONLY SLUGS, OPTIONS AND QUANTITIES ARE KEPT. No prices: those are
--     recomputed from the catalogue when the mail is rendered, so a mail can
--     never quote a figure the checkout would disagree with. Storing a price
--     here would be storing a promise that goes stale.
-- ---------------------------------------------------------------------------
create table if not exists public.abandoned_carts (
  email       text primary key,
  locale      text not null default 'en' check (locale in ('en', 'uk')),
  -- [{ "slug": "...", "qty": 1, "options": { "lid": true } }, ...]
  lines       jsonb not null default '[]'::jsonb,
  -- THE ANCHOR. Every cart change moves it, and the three sends measure
  -- themselves against it: a job that wakes to find this newer than its own
  -- offset allows re-dates itself rather than sending. That is why a cart
  -- edit writes only this row and never touches email_jobs.
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

comment on table public.abandoned_carts is
  'Last known bag per email, for the recovery flow. Slugs and options only — prices are recomputed at send time.';

-- The recovery flow's hard requirement is "never send after payment", and the
-- way it proves payment is a lookup on orders by email. Cheap now with one
-- order in the table; this keeps it cheap later, and it is the query that must
-- never be the one that times out.
create index if not exists orders_email_idx on public.orders (email);

-- ---------------------------------------------------------------------------
-- 3. Claim the due jobs, atomically.
--
--    SKIP LOCKED is the point: if two cron runs overlap, the second steps over
--    the rows the first is holding instead of blocking on them or, worse,
--    reading them and sending a duplicate.
-- ---------------------------------------------------------------------------
create or replace function public.claim_email_jobs(batch int default 25)
returns setof public.email_jobs
language sql
as $$
  update public.email_jobs j
     set claimed_at = now(), attempts = j.attempts + 1
   where j.id in (
     select id from public.email_jobs
      where sent_at is null
        and cancelled_at is null
        and send_after <= now()
        -- Retry a job whose runner died mid-flight, but not immediately.
        and (claimed_at is null or claimed_at < now() - interval '15 minutes')
        and attempts < 5
      order by send_after
      limit batch
      for update skip locked
   )
  returning j.*;
$$;

-- ---------------------------------------------------------------------------
-- 4. Locked down.
--
--    Neither table is ever touched from a browser. The forms post to server
--    actions and the runner is a cron route, both of which use the service
--    role, so RLS is on with no policies at all: enabled and empty denies
--    anon and authenticated outright.
-- ---------------------------------------------------------------------------
alter table public.subscribers      enable row level security;
alter table public.email_jobs       enable row level security;
alter table public.abandoned_carts  enable row level security;

revoke all on public.subscribers     from anon, authenticated;
revoke all on public.email_jobs      from anon, authenticated;
revoke all on public.abandoned_carts from anon, authenticated;
grant all privileges on public.subscribers     to service_role;
grant all privileges on public.email_jobs      to service_role;
grant all privileges on public.abandoned_carts to service_role;

revoke all on function public.claim_email_jobs(int) from public, anon, authenticated;
grant execute on function public.claim_email_jobs(int) to service_role;

-- =============================================================================
--  VERIFY
--
--    select count(*) from public.subscribers;      -- 0
--    select count(*) from public.email_jobs;       -- 0
--    select count(*) from public.abandoned_carts;  -- 0
--
--  And the guard should hold — the second insert must fail:
--
--    insert into public.email_jobs (job_key, flow, step, recipient, locale, send_after)
--    values ('welcome:a@b.c','welcome','W1','a@b.c','en', now());
--    insert into public.email_jobs (job_key, flow, step, recipient, locale, send_after)
--    values ('welcome:a@b.c','welcome','W1','a@b.c','en', now());   -- duplicate key
--    delete from public.email_jobs where job_key = 'welcome:a@b.c';
-- =============================================================================
