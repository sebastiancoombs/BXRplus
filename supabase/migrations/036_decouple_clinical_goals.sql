-- Separate insurance-facing clinical goals from BXR+ reinforcement/work goals.
-- client_goals/session_note_goals are left in place for historical compatibility.
-- Notes now use clinical_goals/session_note_clinical_goals.

create table if not exists public.clinical_goals (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  description text not null default '',
  domain text,
  target_text text,
  mastery_criteria text,
  source text not null default 'manual' check (source in ('manual', 'pdf', 'ai')),
  source_document_id uuid references public.goal_documents(id) on delete set null,
  is_active boolean not null default true,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.session_note_clinical_goals (
  note_id uuid not null references public.session_notes(id) on delete cascade,
  clinical_goal_id uuid not null references public.clinical_goals(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  primary key (note_id, clinical_goal_id)
);

create index if not exists clinical_goals_client_active_idx
  on public.clinical_goals (client_id, is_active, created_at desc);

create index if not exists session_note_clinical_goals_goal_idx
  on public.session_note_clinical_goals (clinical_goal_id);

alter table public.clinical_goals enable row level security;
alter table public.session_note_clinical_goals enable row level security;

drop policy if exists "See clinical goals" on public.clinical_goals;
drop policy if exists "Create clinical goals" on public.clinical_goals;
drop policy if exists "Update clinical goals" on public.clinical_goals;
drop policy if exists "Delete clinical goals" on public.clinical_goals;

create policy "See clinical goals" on public.clinical_goals for select using (
  client_id in (select id from public.clients where owner_id = auth.uid())
  or client_id in (select public.get_my_client_ids())
);
create policy "Create clinical goals" on public.clinical_goals for insert with check (
  created_by = auth.uid()
  and (
    client_id in (select id from public.clients where owner_id = auth.uid())
    or client_id in (select public.get_my_client_ids())
  )
);
create policy "Update clinical goals" on public.clinical_goals for update using (
  client_id in (select id from public.clients where owner_id = auth.uid())
  or client_id in (select public.get_my_client_ids())
) with check (
  client_id in (select id from public.clients where owner_id = auth.uid())
  or client_id in (select public.get_my_client_ids())
);
create policy "Delete clinical goals" on public.clinical_goals for delete using (
  client_id in (select id from public.clients where owner_id = auth.uid())
  or client_id in (select public.get_my_client_ids())
);

drop policy if exists "See note clinical goals" on public.session_note_clinical_goals;
drop policy if exists "Create note clinical goals" on public.session_note_clinical_goals;
drop policy if exists "Delete note clinical goals" on public.session_note_clinical_goals;

create policy "See note clinical goals"
  on public.session_note_clinical_goals for select
  using (
    exists (
      select 1 from public.session_notes n
      where n.id = session_note_clinical_goals.note_id
        and (
          n.client_id in (select id from public.clients where owner_id = auth.uid())
          or n.client_id in (select public.get_my_client_ids())
        )
    )
  );

create policy "Create note clinical goals"
  on public.session_note_clinical_goals for insert
  with check (
    created_by = auth.uid()
    and exists (
      select 1
      from public.session_notes n
      join public.clinical_goals g on g.id = session_note_clinical_goals.clinical_goal_id and g.client_id = n.client_id
      where n.id = session_note_clinical_goals.note_id
        and (
          n.client_id in (select id from public.clients where owner_id = auth.uid())
          or n.client_id in (select public.get_my_client_ids())
        )
    )
  );

create policy "Delete note clinical goals"
  on public.session_note_clinical_goals for delete
  using (
    exists (
      select 1 from public.session_notes n
      where n.id = session_note_clinical_goals.note_id
        and (
          n.client_id in (select id from public.clients where owner_id = auth.uid())
          or n.client_id in (select public.get_my_client_ids())
        )
    )
  );

create or replace function public.touch_clinical_goals_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists clinical_goals_touch_updated_at on public.clinical_goals;
create trigger clinical_goals_touch_updated_at
  before update on public.clinical_goals
  for each row execute function public.touch_clinical_goals_updated_at();

insert into public.clinical_goals (
  client_id,
  title,
  description,
  domain,
  target_text,
  mastery_criteria,
  source,
  source_document_id,
  is_active,
  created_by,
  created_at,
  updated_at
)
select
  g.client_id,
  g.title,
  g.description,
  g.domain,
  g.target_text,
  g.mastery_criteria,
  g.source,
  g.source_document_id,
  g.is_active,
  g.created_by,
  g.created_at,
  g.updated_at
from public.client_goals g
where coalesce(g.domain, '') <> 'Behavior target'
  and not exists (
    select 1 from public.clinical_goals cg
    where cg.client_id = g.client_id
      and cg.title = g.title
      and coalesce(cg.target_text, '') = coalesce(g.target_text, '')
  );

insert into public.session_note_clinical_goals (note_id, clinical_goal_id, created_by, created_at)
select sng.note_id, cg.id, sng.created_by, sng.created_at
from public.session_note_goals sng
join public.client_goals g on g.id = sng.goal_id
join public.clinical_goals cg
  on cg.client_id = g.client_id
  and cg.title = g.title
  and coalesce(cg.target_text, '') = coalesce(g.target_text, '')
where coalesce(g.domain, '') <> 'Behavior target'
on conflict do nothing;
