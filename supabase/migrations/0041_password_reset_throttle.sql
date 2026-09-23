-- 0041 — password reset request throttle
--
-- WHY A TABLE AND NOT A COUNTER IN MEMORY. The reset endpoint runs on
-- serverless functions: every request may land on a fresh instance, so an
-- in-process counter protects nothing. The limit has to live where every
-- instance can see it, and that is here.
--
-- WHAT IT IS ACTUALLY PROTECTING. Supabase's own resetPasswordForEmail is rate
-- limited by Supabase. We are not using it — the branded letter goes out
-- through Resend — so the limit Supabase would have applied is ours to apply.
-- Without it, anyone who knows a customer's address can have us mail that
-- person a reset link on a loop, which is both a nuisance to them and our
-- Resend quota.
--
-- THE EMAIL IS STORED LOWERCASED, NEVER HASHED. It is already in auth.users in
-- the clear, and a hash here would only stop us reading our own throttle while
-- doing nothing an attacker cares about. Rows are disposable; see the prune
-- note below.

create table if not exists public.password_reset_requests (
  id          bigserial primary key,
  -- Lowercased at the call site, so the unique-ish lookups below can't miss a
  -- row because somebody typed their address with a capital letter.
  email       text        not null,
  -- Best effort. Behind a CDN this is the forwarded client address, and it is
  -- spoofable — which is why it is a SECOND limit and never the only one.
  ip          text,
  requested_at timestamptz not null default now()
);

-- The only two questions asked of this table: how many for this address
-- recently, and how many from this ip recently.
create index if not exists password_reset_requests_email_idx
  on public.password_reset_requests (email, requested_at desc);

create index if not exists password_reset_requests_ip_idx
  on public.password_reset_requests (ip, requested_at desc);

-- RLS on with no policies: the table is unreachable from the anon and
-- authenticated keys entirely, and only the service-role module that writes it
-- can read it. Same posture as every other internal table here.
alter table public.password_reset_requests enable row level security;

-- Rows older than a day answer no question this table is asked. Pruned
-- opportunistically by the action rather than by a scheduled job, because one
-- more cron to forget is worse than a delete that runs on a request already
-- doing IO.
