-- BXR+ notes workspace parity for BXR+ session notes
-- Adds the fields/tables the BXR+ notes workspace expects so the imported UI can keep its full behavior
-- while still using BXR+ clients, auth, RLS, and clinical note workflows.

alter table public.session_notes
  add column if not exists content text not null default '',
  add column if not exists yjs_state bytea,
  add column if not exists sync_mode text not null default 'cloud' check (sync_mode in ('cloud', 'local')),
  add column if not exists locked boolean not null default false,
  add column if not exists published boolean not null default false,
  add column if not exists published_at timestamptz,
  add column if not exists current_branch_id uuid,
  add column if not exists deleted_at timestamptz,
  add column if not exists color text,
  add column if not exists source_filename text,
  add column if not exists source_mime_type text,
  add column if not exists source_path text;

update public.session_notes
set content = coalesce(nullif(content, ''), nullif(insurance_note, ''), quick_notes, '')
where content = '';

create index if not exists session_notes_bxrplus_folder_idx
  on public.session_notes (client_id, folder_id, updated_at desc)
  where deleted_at is null;

create index if not exists session_notes_bxrplus_trash_idx
  on public.session_notes (client_id, deleted_at desc)
  where deleted_at is not null;

create index if not exists session_notes_bxrplus_published_idx
  on public.session_notes (published, published_at desc)
  where published = true and deleted_at is null;

create table if not exists public.session_note_branches (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.session_notes(id) on delete cascade,
  name text not null default 'main',
  head_version_id uuid,
  is_default boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (note_id, name)
);

create index if not exists session_note_branches_note_idx
  on public.session_note_branches (note_id, is_default desc, created_at);

create table if not exists public.session_note_versions (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.session_notes(id) on delete cascade,
  parent_id uuid references public.session_note_versions(id) on delete set null,
  branch_id uuid references public.session_note_branches(id) on delete set null,
  title text not null default 'Untitled',
  is_checkpoint boolean not null default false,
  data text not null default '',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists session_note_versions_note_time_idx
  on public.session_note_versions (note_id, created_at desc);

create index if not exists session_note_versions_branch_idx
  on public.session_note_versions (branch_id, created_at desc);

create table if not exists public.session_note_media (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  note_id uuid references public.session_notes(id) on delete set null,
  type text not null default 'file' check (type in ('image', 'video', 'audio', 'pdf', 'file')),
  filename text not null,
  storage_path text not null,
  mime_type text not null,
  size bigint not null default 0,
  width integer,
  height integer,
  published boolean not null default false,
  caption text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists session_note_media_client_idx
  on public.session_note_media (client_id, created_at desc);

create index if not exists session_note_media_note_idx
  on public.session_note_media (note_id, created_at desc);

create table if not exists public.session_note_shares (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.session_notes(id) on delete cascade,
  owner_id uuid not null references public.profiles(id),
  shared_with_id uuid references public.profiles(id),
  shared_with_email text,
  permission text not null default 'read' check (permission in ('read', 'write')),
  token text unique default encode(extensions.gen_random_bytes(24), 'hex'),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  check (shared_with_id is not null or shared_with_email is not null or token is not null)
);

create index if not exists session_note_shares_note_idx
  on public.session_note_shares (note_id, created_at desc);

create index if not exists session_note_shares_shared_with_idx
  on public.session_note_shares (shared_with_id, expires_at);

create table if not exists public.bxrplus_workspace_config (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  key text not null,
  value text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, key)
);

alter table public.session_note_branches enable row level security;
alter table public.session_note_versions enable row level security;
alter table public.session_note_media enable row level security;
alter table public.session_note_shares enable row level security;
alter table public.bxrplus_workspace_config enable row level security;

drop policy if exists "See note branches" on public.session_note_branches;
drop policy if exists "Manage note branches" on public.session_note_branches;
create policy "See note branches" on public.session_note_branches for select
  using (note_id in (select id from public.session_notes));
create policy "Manage note branches" on public.session_note_branches for all
  using (note_id in (select id from public.session_notes))
  with check (note_id in (select id from public.session_notes));

drop policy if exists "See note versions" on public.session_note_versions;
drop policy if exists "Manage note versions" on public.session_note_versions;
create policy "See note versions" on public.session_note_versions for select
  using (note_id in (select id from public.session_notes));
create policy "Manage note versions" on public.session_note_versions for all
  using (note_id in (select id from public.session_notes))
  with check (note_id in (select id from public.session_notes));

drop policy if exists "See note media" on public.session_note_media;
drop policy if exists "Manage note media" on public.session_note_media;
create policy "See note media" on public.session_note_media for select
  using (
    client_id in (select id from public.clients where owner_id = auth.uid())
    or client_id in (select public.get_my_client_ids())
  );
create policy "Manage note media" on public.session_note_media for all
  using (
    client_id in (select id from public.clients where owner_id = auth.uid())
    or client_id in (select public.get_my_client_ids())
  )
  with check (
    created_by = auth.uid()
    and (
      client_id in (select id from public.clients where owner_id = auth.uid())
      or client_id in (select public.get_my_client_ids())
    )
  );

drop policy if exists "See note shares" on public.session_note_shares;
drop policy if exists "Manage note shares" on public.session_note_shares;
create policy "See note shares" on public.session_note_shares for select
  using (
    owner_id = auth.uid()
    or shared_with_id = auth.uid()
    or note_id in (select id from public.session_notes)
  );
create policy "Manage note shares" on public.session_note_shares for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "Manage own BXR+ workspace config" on public.bxrplus_workspace_config;
create policy "Manage own BXR+ workspace config" on public.bxrplus_workspace_config for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create or replace function public.touch_session_note_media_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists session_note_media_touch_updated_at on public.session_note_media;
create trigger session_note_media_touch_updated_at
  before update on public.session_note_media
  for each row execute function public.touch_session_note_media_updated_at();

create or replace function public.touch_bxrplus_workspace_config_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists bxrplus_workspace_config_touch_updated_at on public.bxrplus_workspace_config;
create trigger bxrplus_workspace_config_touch_updated_at
  before update on public.bxrplus_workspace_config
  for each row execute function public.touch_bxrplus_workspace_config_updated_at();

insert into public.session_note_branches (note_id, name, is_default, created_by)
select n.id, 'main', true, n.created_by
from public.session_notes n
where not exists (
  select 1 from public.session_note_branches b where b.note_id = n.id and b.name = 'main'
);

insert into public.session_note_versions (note_id, branch_id, title, is_checkpoint, data, created_by, created_at)
select n.id, b.id, n.title, true, coalesce(nullif(n.content, ''), nullif(n.insurance_note, ''), n.quick_notes, ''), n.created_by, n.created_at
from public.session_notes n
join public.session_note_branches b on b.note_id = n.id and b.name = 'main'
where not exists (
  select 1 from public.session_note_versions v where v.note_id = n.id
);

update public.session_note_branches b
set head_version_id = v.id
from public.session_note_versions v
where v.branch_id = b.id
  and b.head_version_id is null;

update public.session_notes n
set current_branch_id = b.id
from public.session_note_branches b
where b.note_id = n.id
  and b.is_default = true
  and n.current_branch_id is null;

alter table public.session_notes
  drop constraint if exists session_notes_current_branch_fk;

alter table public.session_notes
  add constraint session_notes_current_branch_fk
  foreign key (current_branch_id) references public.session_note_branches(id) on delete set null;

alter table public.session_note_branches
  drop constraint if exists session_note_branches_head_version_fk;

alter table public.session_note_branches
  add constraint session_note_branches_head_version_fk
  foreign key (head_version_id) references public.session_note_versions(id) on delete set null;

insert into storage.buckets (id, name, public)
values ('session-note-media', 'session-note-media', false)
on conflict (id) do nothing;

drop policy if exists "Authenticated users can read session note media" on storage.objects;
drop policy if exists "Authenticated users can upload session note media" on storage.objects;
drop policy if exists "Authenticated users can update session note media" on storage.objects;
drop policy if exists "Authenticated users can delete session note media" on storage.objects;

create policy "Authenticated users can read session note media" on storage.objects for select
  using (bucket_id = 'session-note-media' and auth.role() = 'authenticated');
create policy "Authenticated users can upload session note media" on storage.objects for insert
  with check (bucket_id = 'session-note-media' and auth.role() = 'authenticated');
create policy "Authenticated users can update session note media" on storage.objects for update
  using (bucket_id = 'session-note-media' and auth.role() = 'authenticated')
  with check (bucket_id = 'session-note-media' and auth.role() = 'authenticated');
create policy "Authenticated users can delete session note media" on storage.objects for delete
  using (bucket_id = 'session-note-media' and auth.role() = 'authenticated');
