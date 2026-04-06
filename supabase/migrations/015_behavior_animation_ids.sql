-- Searchable curated animation ids per behavior
alter table public.behaviors add column if not exists feedback_gain_animation_id text;
alter table public.behaviors add column if not exists feedback_loss_animation_id text;

create or replace function public.get_client_session_by_qr(p_qr_code text)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_client record;
  v_behaviors jsonb;
  v_rewards jsonb;
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
  where b.client_id = v_client.id and b.is_active = true;

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
  where r.client_id = v_client.id and r.is_active = true;

  return jsonb_build_object(
    'client', to_jsonb(v_client),
    'behaviors', v_behaviors,
    'rewards', v_rewards
  );
end;
$$;
