-- Clinical goals extracted from uploaded plans/PDFs and linked to notes

create table if not exists public.client_goals (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  description text not null default '',
  domain text,
  target_text text,
  mastery_criteria text,
  source text not null default 'manual' check (source in ('manual', 'pdf', 'ai')),
  source_document_id uuid,
  is_active boolean not null default true,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.goal_documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  file_name text not null,
  storage_path text,
  extracted_text text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.client_goals
  add constraint client_goals_source_document_fk
  foreign key (source_document_id) references public.goal_documents(id) on delete set null;

create table if not exists public.session_note_goals (
  note_id uuid not null references public.session_notes(id) on delete cascade,
  goal_id uuid not null references public.client_goals(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  primary key (note_id, goal_id)
);

create index if not exists client_goals_client_active_idx
  on public.client_goals (client_id, is_active, created_at desc);

create index if not exists session_note_goals_goal_idx
  on public.session_note_goals (goal_id);

alter table public.client_goals enable row level security;
alter table public.goal_documents enable row level security;
alter table public.session_note_goals enable row level security;

drop policy if exists "See client goals" on public.client_goals;
drop policy if exists "Create client goals" on public.client_goals;
drop policy if exists "Update client goals" on public.client_goals;
drop policy if exists "Delete client goals" on public.client_goals;

create policy "See client goals"
  on public.client_goals for select
  using (
    client_id in (select id from public.clients where owner_id = auth.uid())
    or client_id in (select public.get_my_client_ids())
  );

create policy "Create client goals"
  on public.client_goals for insert
  with check (
    created_by = auth.uid()
    and (
      client_id in (select id from public.clients where owner_id = auth.uid())
      or client_id in (select public.get_my_client_ids())
    )
  );

create policy "Update client goals"
  on public.client_goals for update
  using (
    client_id in (select id from public.clients where owner_id = auth.uid())
    or client_id in (select public.get_my_client_ids())
  )
  with check (
    client_id in (select id from public.clients where owner_id = auth.uid())
    or client_id in (select public.get_my_client_ids())
  );

create policy "Delete client goals"
  on public.client_goals for delete
  using (
    client_id in (select id from public.clients where owner_id = auth.uid())
    or client_id in (select public.get_my_client_ids())
  );

drop policy if exists "See goal documents" on public.goal_documents;
drop policy if exists "Create goal documents" on public.goal_documents;

create policy "See goal documents"
  on public.goal_documents for select
  using (
    client_id in (select id from public.clients where owner_id = auth.uid())
    or client_id in (select public.get_my_client_ids())
  );

create policy "Create goal documents"
  on public.goal_documents for insert
  with check (
    created_by = auth.uid()
    and (
      client_id in (select id from public.clients where owner_id = auth.uid())
      or client_id in (select public.get_my_client_ids())
    )
  );

drop policy if exists "See note goals" on public.session_note_goals;
drop policy if exists "Create note goals" on public.session_note_goals;
drop policy if exists "Delete note goals" on public.session_note_goals;

create policy "See note goals"
  on public.session_note_goals for select
  using (
    exists (
      select 1 from public.session_notes n
      where n.id = session_note_goals.note_id
        and (
          n.client_id in (select id from public.clients where owner_id = auth.uid())
          or n.client_id in (select public.get_my_client_ids())
        )
    )
  );

create policy "Create note goals"
  on public.session_note_goals for insert
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.session_notes n
      join public.client_goals g on g.id = session_note_goals.goal_id and g.client_id = n.client_id
      where n.id = session_note_goals.note_id
        and (
          n.client_id in (select id from public.clients where owner_id = auth.uid())
          or n.client_id in (select public.get_my_client_ids())
        )
    )
  );

create policy "Delete note goals"
  on public.session_note_goals for delete
  using (
    exists (
      select 1 from public.session_notes n
      where n.id = session_note_goals.note_id
        and (
          n.client_id in (select id from public.clients where owner_id = auth.uid())
          or n.client_id in (select public.get_my_client_ids())
        )
    )
  );

create or replace function public.touch_client_goal_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists client_goals_touch_updated_at on public.client_goals;
create trigger client_goals_touch_updated_at
  before update on public.client_goals
  for each row execute function public.touch_client_goal_updated_at();
