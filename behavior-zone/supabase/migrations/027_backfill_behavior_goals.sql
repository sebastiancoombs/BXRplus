-- Populate the notes Goals panel from existing client behavior targets.
insert into public.client_goals (
  client_id,
  title,
  description,
  domain,
  target_text,
  mastery_criteria,
  source,
  is_active,
  created_by
)
select
  b.client_id,
  b.name,
  coalesce(b.description, 'Earn ' || coalesce(b.point_value, 1)::text || ' point(s) for ' || b.name || '.'),
  'Behavior target',
  coalesce(b.description, 'Earn ' || coalesce(b.point_value, 1)::text || ' point(s) for ' || b.name || '.'),
  null,
  'manual',
  coalesce(b.is_active, true),
  p.id
from public.behaviors b
join public.clients c on c.id = b.client_id
join public.profiles p on p.id = coalesce(b.created_by, c.owner_id)
where coalesce(b.is_active, true) = true
  and not exists (
    select 1
    from public.client_goals g
    where g.client_id = b.client_id
      and g.title = b.name
      and coalesce(g.target_text, '') = coalesce(b.description, 'Earn ' || coalesce(b.point_value, 1)::text || ' point(s) for ' || b.name || '.')
  );
