-- ============================================================
-- Grandfather every user who was onboarded before paid plans.
--
-- All profiles existing at this moment are flipped to a permanent
-- comp via subscriptions.comped_until = 'infinity'. is_pro() and
-- can_add_client() already respect comped_until, so they get the
-- full Pro experience (unlimited clients, no upgrade modal) with
-- zero notice of the new tier system.
--
-- Anyone who signs up AFTER this migration runs lands on the
-- normal Free plan (1 client cap) — the trigger from migration
-- 016 inserts a non-comped free row for them.
-- ============================================================

update public.subscriptions s
set
  comped_until = 'infinity'::timestamptz,
  comped_reason = 'Early supporter — grandfathered',
  updated_at = now()
from public.profiles p
where p.id = s.owner_id
  and (s.comped_until is null or s.comped_until < now());
