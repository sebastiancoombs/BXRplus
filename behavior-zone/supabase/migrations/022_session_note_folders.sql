-- Folder organization for clinical notes

create table if not exists public.session_note_folders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  color text not null default '#3B82F6',
  description text not null default '',
  sort_order integer not null default 0,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (client_id, name)
);

alter table public.session_notes add column if not exists folder_id uuid references public.session_note_folders(id) on delete set null;

create index if not exists session_note_folders_client_idx
  on public.session_note_folders (client_id, name);

create index if not exists session_notes_folder_idx
  on public.session_notes (folder_id, service_date desc, created_at desc);

alter table public.session_note_folders enable row level security;

drop policy if exists "See session note folders" on public.session_note_folders;
drop policy if exists "Create session note folders" on public.session_note_folders;
drop policy if exists "Update session note folders" on public.session_note_folders;
drop policy if exists "Delete session note folders" on public.session_note_folders;

create policy "See session note folders"
  on public.session_note_folders for select
  using (
    client_id in (select id from public.clients where owner_id = auth.uid())
    or client_id in (select public.get_my_client_ids())
  );

create policy "Create session note folders"
  on public.session_note_folders for insert
  with check (
    created_by = auth.uid()
    and (
      client_id in (select id from public.clients where owner_id = auth.uid())
      or client_id in (select public.get_my_client_ids())
    )
  );

create policy "Update session note folders"
  on public.session_note_folders for update
  using (
    client_id in (select id from public.clients where owner_id = auth.uid())
    or client_id in (select public.get_my_client_ids())
  )
  with check (
    client_id in (select id from public.clients where owner_id = auth.uid())
    or client_id in (select public.get_my_client_ids())
  );

create policy "Delete session note folders"
  on public.session_note_folders for delete
  using (
    client_id in (select id from public.clients where owner_id = auth.uid())
    or client_id in (select public.get_my_client_ids())
  );
