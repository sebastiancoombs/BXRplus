-- ============================================================
-- Subscriptions — Stripe-backed billing for BCBA owners
--
-- Plan shape:
--   Free Forever  → 1 client, all features
--   BXR+ Pro      → unlimited clients (gated only on creating client #2+)
--
-- RBTs and parents are NEVER gated. Only the BCBA owner of a client
-- has a subscription; team members just consume what the owner pays for.
-- ============================================================

create table public.subscriptions (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status text not null default 'free',
    -- free | active | trialing | past_due | canceled | incomplete | incomplete_expired | unpaid
  plan text not null default 'free',
    -- free | pro_monthly | pro_yearly
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  comped_until timestamptz,
    -- manual override: bypass Stripe and grant Pro until this timestamp (null = no comp)
  comped_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

-- Owner can read their own subscription. Nobody can write directly —
-- writes only happen via security-definer functions called by the webhook
-- (using the service-role key) and the admin grant_comp RPC.
create policy "Owner reads own subscription"
  on public.subscriptions for select
  using (owner_id = auth.uid());

create index idx_subscriptions_stripe_customer on public.subscriptions(stripe_customer_id);
create index idx_subscriptions_stripe_subscription on public.subscriptions(stripe_subscription_id);

-- ============================================================
-- is_pro: single source of truth for "does this owner have Pro access?"
--
-- Pro = active Stripe subscription OR comped_until in the future.
-- ============================================================
create or replace function public.is_pro(p_owner_id uuid)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.owner_id = p_owner_id
      and (
        s.status in ('active', 'trialing')
        or (s.comped_until is not null and s.comped_until > now())
      )
  );
$$;

-- ============================================================
-- can_add_client: enforces the free-tier 1-client cap.
--
-- Returns true if the owner is Pro OR currently owns < 1 client.
-- Used as both a frontend check and an RLS check on insert.
-- ============================================================
create or replace function public.can_add_client(p_owner_id uuid)
returns boolean
language sql
stable
security definer
as $$
  select
    public.is_pro(p_owner_id)
    or (
      select count(*) from public.clients
      where owner_id = p_owner_id
    ) < 1;
$$;

-- ============================================================
-- Tighten the clients insert policy with the gate.
--
-- Existing policy "Create clients" (from 006_owner_model.sql) only
-- requires auth.uid() is not null. Replace it with the cap check.
-- ============================================================
drop policy if exists "Create clients" on public.clients;

create policy "Create clients within plan limit"
  on public.clients for insert
  with check (
    auth.uid() is not null
    and public.can_add_client(auth.uid())
    -- new clients must be owned by the inserting user (no orphan/transfer-on-insert)
    and owner_id = auth.uid()
  );

-- ============================================================
-- grant_comp: admin-only RPC to grant or revoke a free Pro subscription.
--
-- Authorized callers: any user whose row is in public.app_admins.
-- Pass null `p_until` to revoke. Idempotent — upserts the row.
-- ============================================================
create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;

create policy "Admins read admins"
  on public.app_admins for select
  using (user_id = auth.uid());

create or replace function public.grant_comp(
  p_owner_id uuid,
  p_until timestamptz,
  p_reason text default null
)
returns public.subscriptions
language plpgsql
security definer
as $$
declare
  v_sub public.subscriptions;
begin
  if not exists (select 1 from public.app_admins where user_id = auth.uid()) then
    raise exception 'Only app admins can grant comps';
  end if;

  insert into public.subscriptions (owner_id, status, plan, comped_until, comped_reason)
  values (p_owner_id, 'free', 'free', p_until, p_reason)
  on conflict (owner_id) do update
    set comped_until = excluded.comped_until,
        comped_reason = excluded.comped_reason,
        updated_at = now()
  returning * into v_sub;

  return v_sub;
end;
$$;

-- ============================================================
-- Convenience: ensure every authed user has a (free) subscription row
-- so we never null-check on the frontend.
--
-- Trigger creates a free row when a profile is first created.
-- ============================================================
create or replace function public.ensure_subscription_row()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.subscriptions (owner_id, status, plan)
  values (new.id, 'free', 'free')
  on conflict (owner_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_profiles_ensure_subscription on public.profiles;
create trigger trg_profiles_ensure_subscription
  after insert on public.profiles
  for each row
  execute function public.ensure_subscription_row();

-- Backfill: every existing profile gets a free row.
insert into public.subscriptions (owner_id, status, plan)
select id, 'free', 'free' from public.profiles
on conflict (owner_id) do nothing;

-- ============================================================
-- updated_at touch trigger
-- ============================================================
create or replace function public.touch_subscriptions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_subscriptions_touch on public.subscriptions;
create trigger trg_subscriptions_touch
  before update on public.subscriptions
  for each row
  execute function public.touch_subscriptions_updated_at();
