create table if not exists public.session_note_zones (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.session_notes(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  label text not null,
  sort_order integer not null default 0,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (note_id, label)
);

create index if not exists session_note_zones_note_sort_idx on public.session_note_zones (note_id, sort_order, created_at);

alter table public.session_note_zones enable row level security;

drop policy if exists "See note zones" on public.session_note_zones;
drop policy if exists "Create note zones" on public.session_note_zones;
drop policy if exists "Update note zones" on public.session_note_zones;
drop policy if exists "Delete note zones" on public.session_note_zones;

create policy "See note zones" on public.session_note_zones for select using (
  client_id in (select id from public.clients where owner_id = auth.uid())
  or client_id in (select public.get_my_client_ids())
);
create policy "Create note zones" on public.session_note_zones for insert with check (
  created_by = auth.uid()
  and (
    client_id in (select id from public.clients where owner_id = auth.uid())
    or client_id in (select public.get_my_client_ids())
  )
);
create policy "Update note zones" on public.session_note_zones for update using (
  client_id in (select id from public.clients where owner_id = auth.uid())
  or client_id in (select public.get_my_client_ids())
) with check (
  client_id in (select id from public.clients where owner_id = auth.uid())
  or client_id in (select public.get_my_client_ids())
);
create policy "Delete note zones" on public.session_note_zones for delete using (
  client_id in (select id from public.clients where owner_id = auth.uid())
  or client_id in (select public.get_my_client_ids())
);
