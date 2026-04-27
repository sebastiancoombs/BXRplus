-- ============================================================
-- Per-person visibility for behaviors and rewards.
--
-- Default behavior is unchanged: a behavior or reward with NO rows
-- in *_visible_to is visible to every staff member on the client
-- (and the client owner always sees everything).
--
-- A BCBA owner can restrict a goal/reward to a specific subset of
-- the team by listing those user_ids in the join table — useful for
-- separating clinic-only behaviors from at-home behaviors, or for
-- controlling what other BCBAs on the case can see.
-- ============================================================

create table public.behavior_visible_to (
  behavior_id uuid not null references public.behaviors(id) on delete cascade,
  user_id     uuid not null references public.profiles(id)  on delete cascade,
  primary key (behavior_id, user_id)
);

create table public.reward_visible_to (
  reward_id uuid not null references public.rewards(id)   on delete cascade,
  user_id   uuid not null references public.profiles(id)  on delete cascade,
  primary key (reward_id, user_id)
);

create index idx_behavior_visible_to_user on public.behavior_visible_to(user_id);
create index idx_reward_visible_to_user   on public.reward_visible_to(user_id);

alter table public.behavior_visible_to enable row level security;
alter table public.reward_visible_to   enable row level security;

-- Direct table access:
--   * owner of the underlying client can read/write everything
--   * any user can see rows that include their own user_id (useful for the
--     UI to know "is this restricted for me?", though most reads happen
--     via the security-definer helpers below)
create policy "owner manages behavior visibility"
  on public.behavior_visible_to for all
  using (
    behavior_id in (
      select b.id from public.behaviors b
      join public.clients c on c.id = b.client_id
      where c.owner_id = auth.uid()
    )
  )
  with check (
    behavior_id in (
      select b.id from public.behaviors b
      join public.clients c on c.id = b.client_id
      where c.owner_id = auth.uid()
    )
  );

create policy "self read own visibility (behaviors)"
  on public.behavior_visible_to for select
  using (user_id = auth.uid());

create policy "owner manages reward visibility"
  on public.reward_visible_to for all
  using (
    reward_id in (
      select r.id from public.rewards r
      join public.clients c on c.id = r.client_id
      where c.owner_id = auth.uid()
    )
  )
  with check (
    reward_id in (
      select r.id from public.rewards r
      join public.clients c on c.id = r.client_id
      where c.owner_id = auth.uid()
    )
  );

create policy "self read own visibility (rewards)"
  on public.reward_visible_to for select
  using (user_id = auth.uid());

-- ============================================================
-- Visibility helpers — single source of truth for "can this user see X?"
-- security definer so they bypass RLS on the join tables themselves.
-- ============================================================
create or replace function public.is_behavior_visible(p_behavior_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
as $$
  select
    -- Owner always sees everything they own.
    exists (
      select 1
      from public.behaviors b
      join public.clients c on c.id = b.client_id
      where b.id = p_behavior_id and c.owner_id = p_user_id
    )
    or
    -- No restrictions configured → visible to everyone on the team.
    not exists (
      select 1 from public.behavior_visible_to v where v.behavior_id = p_behavior_id
    )
    or
    -- Explicit allow row for this user.
    exists (
      select 1 from public.behavior_visible_to v
      where v.behavior_id = p_behavior_id and v.user_id = p_user_id
    );
$$;

create or replace function public.is_reward_visible(p_reward_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
as $$
  select
    exists (
      select 1
      from public.rewards r
      join public.clients c on c.id = r.client_id
      where r.id = p_reward_id and c.owner_id = p_user_id
    )
    or
    not exists (
      select 1 from public.reward_visible_to v where v.reward_id = p_reward_id
    )
    or
    exists (
      select 1 from public.reward_visible_to v
      where v.reward_id = p_reward_id and v.user_id = p_user_id
    );
$$;

-- ============================================================
-- Tighten SELECT policies on behaviors/rewards.
--
-- Owner branch (sees own clients) bypasses visibility. Shared-staff
-- branch additionally requires is_*_visible() to return true.
-- Manage policies (insert/update/delete) are unchanged — anyone
-- on the team can author behaviors/rewards; only WHO SEES them is
-- gated.
-- ============================================================
drop policy if exists "See behaviors" on public.behaviors;
create policy "See behaviors"
  on public.behaviors for select
  using (
    client_id in (select id from public.clients where owner_id = auth.uid())
    or (
      client_id in (select public.get_my_client_ids())
      and public.is_behavior_visible(id, auth.uid())
    )
  );

drop policy if exists "See rewards" on public.rewards;
create policy "See rewards"
  on public.rewards for select
  using (
    client_id in (select id from public.clients where owner_id = auth.uid())
    or (
      client_id in (select public.get_my_client_ids())
      and public.is_reward_visible(id, auth.uid())
    )
  );

-- ============================================================
-- Setter RPCs — only the client owner can change visibility.
--
-- Pass NULL or an empty array for p_user_ids to reset to "everyone".
-- ============================================================
create or replace function public.set_behavior_visibility(
  p_behavior_id uuid,
  p_user_ids    uuid[]
)
returns void
language plpgsql
security definer
as $$
declare
  v_owner uuid;
begin
  select c.owner_id into v_owner
  from public.behaviors b
  join public.clients c on c.id = b.client_id
  where b.id = p_behavior_id;

  if v_owner is null then
    raise exception 'Behavior not found';
  end if;

  if v_owner <> auth.uid() then
    raise exception 'Only the client owner can change visibility';
  end if;

  delete from public.behavior_visible_to where behavior_id = p_behavior_id;

  if p_user_ids is not null and array_length(p_user_ids, 1) is not null then
    insert into public.behavior_visible_to (behavior_id, user_id)
    select p_behavior_id, unnest(p_user_ids)
    on conflict do nothing;
  end if;
end;
$$;

create or replace function public.set_reward_visibility(
  p_reward_id uuid,
  p_user_ids  uuid[]
)
returns void
language plpgsql
security definer
as $$
declare
  v_owner uuid;
begin
  select c.owner_id into v_owner
  from public.rewards r
  join public.clients c on c.id = r.client_id
  where r.id = p_reward_id;

  if v_owner is null then
    raise exception 'Reward not found';
  end if;

  if v_owner <> auth.uid() then
    raise exception 'Only the client owner can change visibility';
  end if;

  delete from public.reward_visible_to where reward_id = p_reward_id;

  if p_user_ids is not null and array_length(p_user_ids, 1) is not null then
    insert into public.reward_visible_to (reward_id, user_id)
    select p_reward_id, unnest(p_user_ids)
    on conflict do nothing;
  end if;
end;
$$;

-- ============================================================
-- Update get_client_session_by_qr to respect visibility when the
-- caller is authenticated. Anonymous QR access (auth.uid() is null)
-- still sees everything — the QR is a launcher for shared devices.
-- ============================================================
create or replace function public.get_client_session_by_qr(p_qr_code text)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_client    record;
  v_uid       uuid := auth.uid();
  v_behaviors jsonb;
  v_rewards   jsonb;
begin
  select c.id, c.full_name, c.balance, c.qr_code, c.reward_bar_theme, c.reward_bar_style, c.reward_success_animation,
         c.session_feedback_theme, c.session_feedback_intensity, c.session_feedback_mode
  into v_client
  from public.clients c
  where c.qr_code = p_qr_code
  limit 1;

  if v_client.id is null then
    return null;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', b.id,
    'client_id', b.client_id,
    'name', b.name,
    'point_value', b.point_value,
    'icon', b.icon,
    'description', b.description,
    'feedback_theme', b.feedback_theme,
    'feedback_intensity', b.feedback_intensity,
    'feedback_mode', b.feedback_mode,
    'feedback_gain_animation_id', b.feedback_gain_animation_id,
    'feedback_loss_animation_id', b.feedback_loss_animation_id
  ) order by b.name), '[]'::jsonb)
  into v_behaviors
  from public.behaviors b
  where b.client_id = v_client.id
    and b.is_active = true
    and (v_uid is null or public.is_behavior_visible(b.id, v_uid));

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id,
    'client_id', r.client_id,
    'name', r.name,
    'point_cost', r.point_cost,
    'icon', r.icon,
    'journey_preset', r.journey_preset,
    'traveler_icon', r.traveler_icon,
    'destination_icon', r.destination_icon,
    'journey_theme', r.journey_theme,
    'description', r.description
  ) order by r.point_cost), '[]'::jsonb)
  into v_rewards
  from public.rewards r
  where r.client_id = v_client.id
    and r.is_active = true
    and (v_uid is null or public.is_reward_visible(r.id, v_uid));

  return jsonb_build_object(
    'client', to_jsonb(v_client),
    'behaviors', v_behaviors,
    'rewards', v_rewards
  );
end;
$$;
