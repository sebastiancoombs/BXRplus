-- ============================================================
-- TEMPORARY: pre-launch comp for everyone while Stripe billing
-- is being configured.
--
-- Until the Stripe products are created, the Edge Functions are
-- deployed, and the webhook is connected, we don't want new
-- signups to hit a paywall they can't actually pay through. Two
-- changes:
--
-- 1) The ensure_subscription_row trigger now writes
--    comped_until = 'infinity' for every new profile, so anyone
--    who signs up during the soft-launch window has full Pro
--    access automatically.
-- 2) Backfill: any free row that doesn't already have a comp
--    timestamp gets one too, so users who registered after the
--    Stripe rollout but before this migration aren't stranded.
--
-- WHEN STRIPE IS LIVE: replace ensure_subscription_row's body to
-- stop setting comped_until, and optionally revoke comps for
-- accounts created after the launch date that haven't paid.
-- ============================================================

create or replace function public.ensure_subscription_row()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.subscriptions (owner_id, status, plan, comped_until, comped_reason)
  values (
    new.id,
    'free',
    'free',
    'infinity'::timestamptz,
    'Pre-launch comp — billing not yet enabled'
  )
  on conflict (owner_id) do nothing;
  return new;
end;
$$;

-- Backfill any free, un-comped rows.
update public.subscriptions
set comped_until = 'infinity'::timestamptz,
    comped_reason = coalesce(comped_reason, 'Pre-launch comp — billing not yet enabled'),
    updated_at = now()
where comped_until is null
  and status = 'free';
