-- Support imported folder trees from file/zip uploads

alter table public.session_note_folders
  add column if not exists parent_id uuid references public.session_note_folders(id) on delete cascade,
  add column if not exists path text,
  add column if not exists source text not null default 'manual' check (source in ('manual', 'upload', 'zip', 'drive'));

update public.session_note_folders
set path = name
where path is null;

alter table public.session_note_folders
  alter column path set not null;

alter table public.session_note_folders
  drop constraint if exists session_note_folders_client_id_name_key;

create unique index if not exists session_note_folders_client_path_key
  on public.session_note_folders (client_id, path);

create index if not exists session_note_folders_parent_idx
  on public.session_note_folders (parent_id, sort_order, name);
